"use client";

import { SessionProvider } from "next-auth/react";
import { NotificationProvider } from "@/components/NotificationSystem";

export function Providers({ children }) {
  return (
    <SessionProvider>
      <NotificationProvider>{children}</NotificationProvider>
    </SessionProvider>
  );
}
