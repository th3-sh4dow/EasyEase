
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

  const { user, initialized: authInitialized } = useUser();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // Overall loading state is true until auth is checked AND the first profile load attempt is finished.
  const loading = !authInitialized || profileLoading;
  
  const isAuthPage = ['/login', '/signup', '/forgot-password'].includes(pathname);
  const isDashboardPage = pathname.startsWith('/dashboard');

  // Effect for fetching the user's profile from Firestore
  useEffect(() => {
    if (!user || !firestore) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }

    setProfileLoading(true);
    const profileRef = doc(firestore, 'userProfiles', user.uid);
    
    const unsubscribe = onSnapshot(profileRef, (docSnap) => {
      if (docSnap.exists()) {
        setProfile({ id: docSnap.id, ...docSnap.data() } as UserProfile);
      } else {
        // The profile might not be created yet by the backend function.
        // We set it to null but keep listening.
        setProfile(null);
      }
      // We are done with the initial load attempt.
      setProfileLoading(false);
    }, (error) => {
      console.error("Error fetching user profile:", error);
      setProfile(null);
      setProfileLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [user, firestore]);

  // This effect handles all redirection logic based on auth and profile state.
  useEffect(() => {
    // Wait until all initial loading is complete before doing any redirection.
    if (loading) {
      return;
    }

    // If the user is logged in and has a profile with a role...
    if (user && profile?.role) {
      const correctDashboardPath = `/dashboard/${profile.role}`;
      // If they are on an auth page (e.g., /login) or the wrong dashboard, redirect them.
      if (isAuthPage || (isDashboardPage && !pathname.startsWith(correctDashboardPath))) {
        router.replace(correctDashboardPath);
      }
    } 
    // If the user is NOT logged in but is trying to access a protected dashboard page...
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
