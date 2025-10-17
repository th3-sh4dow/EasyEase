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
  
  const isAuthPage = ['/login', '/signup'].includes(pathname);
  const isDashboardPage = pathname.startsWith('/dashboard');

  useEffect(() => {
    if (!authInitialized || !firestore) return;

    let unsubscribe: (() => void) | null = null;

    if (!user) {
      setProfile(null);
      setProfileLoading(false);
      if (isDashboardPage) {
        router.replace('/login');
      }
    } else {
      setProfileLoading(true);
      const profileRef = doc(firestore, 'userProfiles', user.uid);
      
      unsubscribe = onSnapshot(profileRef, (docSnap) => {
        if (docSnap.exists()) {
          const userProfile = docSnap.data() as UserProfile;
          setProfile(userProfile);
          setProfileLoading(false); // Profile found, loading is done.

          if (userProfile.role) {
            const targetDashboard = `/dashboard/${userProfile.role}`;
            // If user is on an auth page or the wrong dashboard, redirect.
            if (isAuthPage || (isDashboardPage && !pathname.startsWith(targetDashboard))) {
              router.replace(targetDashboard);
            }
          } else {
            // Profile exists but has no role. This is an error state.
             console.error("User profile is missing a role.");
             if (firebaseAuth) firebaseAuth.signOut(); // Log out user to prevent being stuck
          }
        } else {
          // Profile doesn't exist yet. We keep listening.
          // This handles the delay between user creation and profile creation.
          setProfile(null);
          // We set loading to true to wait for the profile.
          setProfileLoading(true); 
        }
      }, (error) => {
        console.error("Error fetching user profile:", error);
        setProfile(null);
        setProfileLoading(false);
        if (firebaseAuth) {
          firebaseAuth.signOut();
        }
      });
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authInitialized, firestore]);

  // This effect handles the redirection logic separately from data fetching
  useEffect(() => {
    if (loading) return; // Wait until loading is complete

    if (user && profile && profile.role) {
      const targetDashboard = `/dashboard/${profile.role}`;
      if (isAuthPage || (isDashboardPage && !pathname.startsWith(targetDashboard))) {
        router.replace(targetDashboard);
      }
    } else if (!user && isDashboardPage) {
      router.replace('/login');
    }

  }, [user, profile, loading, pathname, isAuthPage, isDashboardPage, router]);


  const value = { user, profile, loading };

  // Render children immediately, redirection is handled by the effect.
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
