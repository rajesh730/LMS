import { randomUUID } from "crypto";

export const PUBLIC_FEED_VIEWER_COOKIE = "pratyo_public_viewer";

export function createPublicFeedViewerId() {
  return randomUUID();
}

export function buildPublicFeedViewerCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  };
}
