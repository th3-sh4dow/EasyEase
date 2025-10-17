
'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { useRouter, usePathname } from 'next/navigation';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
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
  
  const isPublicPage = ['/login', '/signup', '/'].includes(pathname);

  useEffect(() => {
    if (!authInitialized) return; // Wait for Firebase Auth to initialize

    if (!user) {
      // User is not logged in
      setProfile(null);
      setProfileLoading(false);
      if (!isPublicPage) {
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
          
          if (user.photoURL && user.photoURL !== userProfile.photoURL) {
            updateDoc(profileRef, { photoURL: user.photoURL });
            userProfile.photoURL = user.photoURL;
          }

          setProfile(userProfile);
          
          // --- REDIRECTION LOGIC ---
          // If we are on a public page but we have a user and a profile with a role, redirect.
          if (isPublicPage && userProfile.role) {
            router.replace(`/dashboard/${userProfile.role}`);
          }
          
        } else {
          // Profile doesn't exist yet, might be mid-signup
          setProfile(null);
        }
        setProfileLoading(false);
    }, (error) => {
        console.error("Error fetching user profile:", error);
        setProfile(null);
        setProfileLoading(false);
    });

    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authInitialized, firestore, isPublicPage]);


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
