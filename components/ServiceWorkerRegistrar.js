"use client";

import { useEffect } from "react";

/**
 * Registers the service worker that makes Pravyo behave like an installed app.
 *
 * Registration is deferred until after `load` so it never competes with the
 * first paint for bandwidth — on the low-end phones this platform is actually
 * used on, that trade is worth more than having the worker a second earlier.
 *
 * Development is excluded on purpose: a worker caching assets between hot
 * reloads produces confusing stale-module bugs that look like broken code.
 */
export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch((error) => {
        // A failed registration must never surface to the user: the app works
        // perfectly well without a worker, it just loads less instantly.
        console.error("Service worker registration failed:", error);
      });
    };

    if (document.readyState === "complete") {
      register();
      return undefined;
    }

    window.addEventListener("load", register);
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
