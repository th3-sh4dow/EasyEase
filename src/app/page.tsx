
'use client';

import { useAuth } from '@/context/AuthContext';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Hero } from '@/components/landing/hero';

export default function Home() {
  const { user, loading } = useAuth();
  
  // While the auth state is loading, show a full-screen loader.
  // AuthProvider is responsible for redirection, so we just wait here.
  if (loading) {
     return (
        <div className="min-h-screen flex items-center justify-center bg-background text-lg">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
        </div>
      );
  }
  
  // If loading is finished and there's no user, show the public landing page.
  if (!user) {
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
  
  // If loading is finished and there IS a user, AuthProvider is handling the redirect.
  // We continue to show the loader as a good UX measure until the redirect completes.
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-lg">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
    </div>
  );
}
