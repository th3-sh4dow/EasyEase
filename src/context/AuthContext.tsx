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
          // Profile doesn't exist yet, might be in the process of creation.
          // Don't set profile to null immediately, wait for potential creation.
          // If it's truly missing, the user won't be able to access protected routes.
          setProfile(null);
        }
        setProfileLoading(false);
      }, (error) => {
        console.error("Error fetching user profile:", error);
        setProfile(null);
        setProfileLoading(false);
        // If there's an error fetching the profile, it might be a permissions issue.
        // Signing out is a safe fallback.
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
    // Wait until authentication and profile loading are complete
    if (loading) {
      return;
    }

    // If the user is logged in and has a profile with a role
    if (user && profile?.role) {
      const correctDashboardPath = `/dashboard/${profile.role}`;
      // If on an auth page, redirect to the correct dashboard.
      if (isAuthPage) {
        router.replace(correctDashboardPath);
      } 
      // If on a dashboard page, but it's the wrong one for their role, redirect.
      else if (isDashboardPage && !pathname.startsWith(correctDashboardPath)) {
        router.replace(correctDashboardPath);
      }
    } 
    // If the user is NOT logged in but is trying to access a protected dashboard page
    else if (!user && isDashboardPage) {
        router.replace('/login');
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
