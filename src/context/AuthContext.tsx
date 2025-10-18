'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { useRouter, usePathname } from 'next/navigation';
import { doc, onSnapshot } from 'firebase/firestore';
import { useUser, useFirestore, useAuth as useFirebaseAuth } from '@/firebase';
import type { UserProfile } from '@/lib/types';

// --- Types ---
interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// --- Auth Provider Component ---
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const pathname = usePathname();
  const firestore = useFirestore();
  const firebaseAuth = useFirebaseAuth();

  const { user, initialized: authInitialized } = useUser();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const loading = !authInitialized || profileLoading;
  
  const isAuthPage = ['/login', '/signup', '/forgot-password'].includes(pathname);
  const isDashboardPage = pathname.startsWith('/dashboard');

  useEffect(() => {
    if (!authInitialized || !firestore) {
      if(!authInitialized) {
        setProfileLoading(true);
      }
      return;
    };

    let unsubscribe: (() => void) | null = null;

    if (user) {
      setProfileLoading(true);
      const profileRef = doc(firestore, 'userProfiles', user.uid);
      
      unsubscribe = onSnapshot(profileRef, (docSnap) => {
        if (docSnap.exists()) {
          const userProfile = { id: docSnap.id, ...docSnap.data() } as UserProfile;
          setProfile(userProfile);
        } else {
          setProfile(null);
        }
        setProfileLoading(false);
      }, (error) => {
        console.error("Error fetching user profile:", error);
        setProfile(null);
        setProfileLoading(false);
        if (firebaseAuth) firebaseAuth.signOut();
      });
    } else {
      // No user, not loading.
      setProfile(null);
      setProfileLoading(false);
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user, authInitialized, firestore, firebaseAuth]);

  // This effect handles all redirection logic based on auth and profile state.
  useEffect(() => {
    if (loading) {
      return;
    }

    // If the user is logged in and on an auth page, redirect them.
    if (user && profile && isAuthPage) {
        // Redirect to their specific dashboard
        router.replace(`/dashboard/${profile.role}`);
    } 
    // If the user is not logged in but trying to access a dashboard, redirect to login
    else if (!user && isDashboardPage) {
        router.replace('/login');
    }
    // If the user is logged in, has a profile, and is trying to access the wrong dashboard
    else if (user && profile && isDashboardPage && !pathname.startsWith(`/dashboard/${profile.role}`)) {
        router.replace(`/dashboard/${profile.role}`);
    }

  }, [user, profile, loading, pathname, isAuthPage, isDashboardPage, router]);


  const value = { user, profile, loading };

  return (
    <AuthContext.Provider value={value}>
        {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
