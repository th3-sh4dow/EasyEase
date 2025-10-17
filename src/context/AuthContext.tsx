
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
    if (!authInitialized || !firestore) {
      return;
    }

    if (!user) {
      setProfile(null);
      setProfileLoading(false);
      if (!isPublicPage) {
        router.replace('/login');
      }
      return;
    }
    
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
          
          if (userProfile.role && !pathname.startsWith('/dashboard')) {
            const targetDashboard = `/dashboard/${userProfile.role}`;
             if (pathname !== targetDashboard) {
               router.replace(targetDashboard);
             }
          }
        } else {
          setProfile(null);
        }
        setProfileLoading(false);
    }, (error) => {
        console.error("Error fetching user profile:", error);
        setProfile(null);
        setProfileLoading(false);
    });

    return () => unsubscribe();
  }, [user, authInitialized, firestore, router, pathname, isPublicPage]);


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
