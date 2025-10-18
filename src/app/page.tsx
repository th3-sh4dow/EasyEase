
'use client';

import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Hero } from '@/components/landing/hero';
import { useAuth } from '@/context/AuthContext';

export default function Home() {
  const { user, loading } = useAuth();

  // If the user is authenticated, the AuthProvider will handle the redirection.
  // While the auth state is loading, or if the user is already logged in,
  // we can show a loading indicator to prevent a flash of the landing page.
  if (loading || user) {
     return (
        <div className="min-h-screen flex items-center justify-center bg-background text-lg">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
        </div>
      );
  }

  // If loading is finished and there is no user, show the public landing page.
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
