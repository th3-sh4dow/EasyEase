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
    if (!authInitialized || !firestore) return;

    let unsubscribe: (() => void) | null = null;

    if (user) {
      setProfileLoading(true);
      const profileRef = doc(firestore, 'userProfiles', user.uid);
      
      unsubscribe = onSnapshot(profileRef, (docSnap) => {
        if (docSnap.exists()) {
          const userProfile = { id: docSnap.id, ...docSnap.data() } as UserProfile;
          setProfile(userProfile);
        } else {
          // Profile doesn't exist yet. This can happen right after signup.
          // We'll keep listening, but set profile to null for now.
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
    // Don't redirect until auth and profile loading is complete
    if (loading) {
      return;
    }

    if (user && profile?.role) {
      // User is logged in and has a profile with a role
      const targetDashboard = `/dashboard/${profile.role}`;
      // If they are on an auth page, or a dashboard page that is not their own, redirect.
      if (isAuthPage || (isDashboardPage && !pathname.startsWith(targetDashboard))) {
        router.replace(targetDashboard);
      }
    } else if (user && !profile) {
        // User is logged in but profile is not yet created or found.
        // This is a transient state right after signup.
        // We don't redirect, we wait for the listener in the first useEffect to find the profile.
        // If they are on a dashboard page, they might see a loader or brief error until profile loads.
    }
    else if (!user && isDashboardPage) {
      // User is not logged in but is trying to access a protected dashboard page.
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
