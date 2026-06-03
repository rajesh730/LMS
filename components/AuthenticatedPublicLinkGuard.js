"use client";

import { useEffect } from "react";

const DASHBOARD_PREFIXES = ["/admin", "/school", "/student", "/teacher"];
const SYSTEM_PREFIXES = ["/api", "/_next"];

function shouldOpenInNewTab(href) {
  if (!href) return false;

  let url;
  try {
    url = new URL(href, window.location.origin);
  } catch {
    return false;
  }

  if (url.origin !== window.location.origin) return false;
  if (url.hash && url.pathname === window.location.pathname) return false;

  const path = url.pathname;
  if (SYSTEM_PREFIXES.some((prefix) => path.startsWith(prefix))) return false;
  if (DASHBOARD_PREFIXES.some((prefix) => path.startsWith(prefix))) return false;

  return true;
}

export default function AuthenticatedPublicLinkGuard() {
  useEffect(() => {
    function handleClick(event) {
      if (event.defaultPrevented) return;

      const link = event.target?.closest?.("a[href]");
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
      if (!shouldOpenInNewTab(link.href)) return;

      event.preventDefault();
      window.open(link.href, "_blank", "noopener,noreferrer");
    }

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  return null;
}
