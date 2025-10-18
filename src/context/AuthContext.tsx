
'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { useRouter, usePathname } from 'next/navigation';
import { doc, onSnapshot } from 'firebase/firestore';
import { useUser, useFirestore } from '@/firebase';
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

  const loading = !authInitialized || profileLoading;
  
  const isAuthPage = ['/login', '/signup', '/forgot-password'].includes(pathname);
  const isDashboardPage = pathname.startsWith('/dashboard');

  // Effect for fetching the user's profile from Firestore
  useEffect(() => {
    // If there's no authenticated user, we don't need to fetch a profile.
    if (!user) {
      setProfile(null);
      setProfileLoading(false); // We're done loading since there's no user.
      return;
    }

    setProfileLoading(true);
    const profileRef = doc(firestore, 'userProfiles', user.uid);
    
    // Listen for real-time updates to the profile.
    // This is crucial for new signups, as the document might not exist immediately.
    const unsubscribe = onSnapshot(profileRef, (docSnap) => {
      if (docSnap.exists()) {
        setProfile({ id: docSnap.id, ...docSnap.data() } as UserProfile);
      } else {
        // The profile document hasn't been created yet by the backend function.
        // We set it to null and continue to listen.
        setProfile(null);
      }
      // We consider profile loading finished once we get the first response (even if it's empty).
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
    // Wait until initial auth check and first profile fetch attempt are complete.
    if (loading) {
      return;
    }

    // If the user is logged in and we have their profile with a role...
    if (user && profile?.role) {
      const correctDashboardPath = `/dashboard/${profile.role}`;
      // If they are on an auth page (like /login) or the wrong dashboard, redirect them.
      if (isAuthPage) {
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
