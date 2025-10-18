
'use client';

import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Hero } from '@/components/landing/hero';

export default function Home() {
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
