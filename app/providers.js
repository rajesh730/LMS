"use client";

import { SessionProvider } from "next-auth/react";
import { NotificationProvider } from "@/components/NotificationSystem";

export function Providers({ children }) {
  // The session rarely changes and each refetch runs a DB query in the jwt
  // callback, so don't re-validate on every tab focus; a periodic refresh is
  // enough.
  return (
    <SessionProvider refetchInterval={600} refetchOnWindowFocus={false}>
      <NotificationProvider>{children}</NotificationProvider>
    </SessionProvider>
  );
}
