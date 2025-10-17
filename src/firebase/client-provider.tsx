'use client';

import { FirebaseProvider } from './provider';

// This component ensures Firebase is initialized only once on the client.
export function FirebaseClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <FirebaseProvider>{children}</FirebaseProvider>;
}
