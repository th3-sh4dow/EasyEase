
'use client';

import { useAuth } from '@/context/AuthContext';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Hero } from '@/components/landing/hero';

export default function Home() {
  const { user, loading } = useAuth();
  
  // The AuthProvider is responsible for redirection.
  // This page will just show the public landing content.
  // If the user is logged in, they will be redirected away by the provider.
  if (loading) {
    // While the auth state is loading, it's good practice to show a loader
    // to prevent a flash of the landing page for authenticated users who are
    // about to be redirected.
     return (
        <div className="min-h-screen flex items-center justify-center bg-background text-lg">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
        </div>
      );
  }

  // If loading is finished, always attempt to show the public landing page.
  // The AuthProvider will handle redirecting authenticated users away.
  return (
    <>
      <Header />
      <main className="flex-grow flex flex-col">
        <Hero />
      </main>
      <Footer />
    </>
  );
}
