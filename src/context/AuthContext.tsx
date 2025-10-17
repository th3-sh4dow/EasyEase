
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

  useEffect(() => {
    if (!authInitialized) return; // Wait for Firebase Auth to initialize

    if (!user) {
      // User is not logged in.
      setProfile(null);
      setProfileLoading(false);
      // If they are on a protected dashboard page, redirect them to login.
      if (pathname.startsWith('/dashboard')) {
        router.replace('/login');
      }
      return;
    }

    // User is logged in, listen for profile changes
    setProfileLoading(true);
    const profileRef = doc(firestore, 'userProfiles', user.uid);
    
    const unsubscribe = onSnapshot(profileRef, (docSnap) => {
        if (docSnap.exists()) {
          const userProfile = docSnap.data() as UserProfile;
          setProfile(userProfile);

          // --- REDIRECTION LOGIC ---
          const role = userProfile.role;
          if (role) {
              const targetDashboard = `/dashboard/${role}`;
              // If user is on an auth page (login/signup) or not on their correct dashboard, redirect.
              if (isAuthPage || !pathname.startsWith(targetDashboard)) {
                  router.replace(targetDashboard);
              }
          } else {
            // This case can happen temporarily during signup or if the profile is incomplete.
            // Don't redirect, allow other parts of the app to handle it.
            console.warn("User has a session but no role in their profile.");
          }
          
        } else {
          // Profile doesn't exist yet, might be mid-signup.
          setProfile(null);
          // Don't redirect, this state is expected during the signup flow.
        }
        setProfileLoading(false);
    }, (error) => {
        console.error("Error fetching user profile:", error);
        setProfile(null);
        setProfileLoading(false);
        // If there's an error, sign the user out to be safe
        if (firebaseAuth) {
            firebaseAuth.signOut();
        }
    });

    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authInitialized, firestore, pathname, router, isAuthPage, firebaseAuth]);


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
