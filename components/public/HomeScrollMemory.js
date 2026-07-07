"use client";

import { useEffect } from "react";

const STORAGE_KEY = "pravyo:home-scroll";
const MAX_AGE_MS = 15 * 60 * 1000;
// On desktop the feed scrolls inside this container, not the window.
const FEED_SCROLL_ID = "home-feed-scroll";

function isWritingLink(href) {
  try {
    const url = new URL(href, window.location.origin);
    return url.origin === window.location.origin && url.pathname.startsWith("/writings/");
  } catch {
    return false;
  }
}

export default function HomeScrollMemory() {
  useEffect(() => {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);

    if (raw) {
      try {
        const saved = JSON.parse(raw);
        const isFresh = Date.now() - Number(saved.createdAt || 0) < MAX_AGE_MS;
        const y = Number(saved.y || 0);
        const feedY = Number(saved.feedY || 0);

        if (isFresh && (y > 0 || feedY > 0)) {
          requestAnimationFrame(() => {
            window.scrollTo({ top: y, left: 0, behavior: "auto" });
            document
              .getElementById(FEED_SCROLL_ID)
              ?.scrollTo({ top: feedY, left: 0, behavior: "auto" });
          });
        }
      } catch {
        // Ignore broken session data and continue with normal page behavior.
      }

      window.sessionStorage.removeItem(STORAGE_KEY);
    }

    function saveScroll(event) {
      const link = event.target?.closest?.("a[href]");
      if (!link || !isWritingLink(link.href)) return;

      window.sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          y: window.scrollY,
          feedY: document.getElementById(FEED_SCROLL_ID)?.scrollTop || 0,
          createdAt: Date.now(),
        })
      );
    }

    document.addEventListener("click", saveScroll, true);
    return () => document.removeEventListener("click", saveScroll, true);
  }, []);

  return null;
}
