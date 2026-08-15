"use client";

import { usePathname } from "next/navigation";
import { ParentAppProvider } from "@/components/parent/ParentAppContext";
import ParentAppShell from "@/components/parent/ParentAppShell";

/**
 * Parent App layout.
 *
 * `/parent/login` and `/parent/link` render OUTSIDE the shell: the first has no
 * session yet, and the second is the state where there is no child to put in
 * the child switcher. Wrapping either in the shell would show a header and
 * bottom navigation pointing at screens the guardian cannot use.
 */

// Unauthenticated. The provider is skipped entirely — it calls
// /api/parent/me, which would 401 before a guardian has signed in.
// `/parent/access` and `/parent/activate` are the Parent Access Card entry
// points: the guardian is holding a printed card and has no session yet.
const PUBLIC_ROUTES = new Set([
  "/parent/login",
  "/parent/register",
  "/parent/access",
  "/parent/activate",
]);

// Authenticated but has no child yet, so there is nothing to put in the child
// switcher or the bottom nav. Provider yes, chrome no.
const CHROMELESS_ROUTES = new Set(["/parent/link"]);

export default function ParentLayout({ children }) {
  const pathname = usePathname();

  if (PUBLIC_ROUTES.has(pathname)) {
    return children;
  }

  if (CHROMELESS_ROUTES.has(pathname)) {
    return <ParentAppProvider>{children}</ParentAppProvider>;
  }

  return (
    <ParentAppProvider>
      <ParentAppShell>{children}</ParentAppShell>
    </ParentAppProvider>
  );
}
