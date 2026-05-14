"use client";

import { SessionProvider } from "next-auth/react";
import { NotificationProvider } from "@/components/NotificationSystem";

export function Providers({ children }) {
  return (
    <SessionProvider refetchInterval={2} refetchOnWindowFocus>
      <NotificationProvider>{children}</NotificationProvider>
    </SessionProvider>
  );
}
