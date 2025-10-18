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
          setProfileLoading(false); // Profile found, loading is done.
        } else {
          // This is a key part for new users.
          // The profile doesn't exist yet. We don't stop loading.
          // We keep listening. The Cloud Function will create it soon.
          setProfile(null);
          // Only stop loading if we're sure the user is old and has no profile
          // A simple timeout can handle this to prevent infinite loading for broken accounts.
          const timer = setTimeout(() => {
            if (!profile) { // Check if profile is still null after a delay
              setProfileLoading(false);
            }
          }, 3000); // Wait 3 seconds before giving up on a profile
          return () => clearTimeout(timer);
        }
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
  }, [user, authInitialized, firestore, firebaseAuth, profile]); // Added profile to deps

  // This effect handles all redirection logic based on auth and profile state.
  useEffect(() => {
    // Wait until authentication and profile loading are complete
    if (loading) {
      return;
    }

    // If the user is logged in and has a profile with a role
    if (user && profile?.role) {
      const correctDashboardPath = `/dashboard/${profile.role}`;
      // If on an auth page, or the wrong dashboard, redirect.
      if (isAuthPage || (isDashboardPage && !pathname.startsWith(correctDashboardPath))) {
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
