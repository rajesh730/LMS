"use client";

import { useState } from "react";
import { normalizeImageUrl } from "@/lib/imageUrls";
import styles from "./ParentDesign.module.css";

/**
 * The child's photo, with an initials fallback.
 *
 * Student.photoUrl is empty for every existing student, so the initials path is
 * the normal case, not the exception — it has to look deliberate rather than
 * broken. A coloured disc derived from the name gives each child a stable,
 * recognisable identity even with no photo on file.
 *
 * Low-bandwidth behaviour (§22): the image is lazy-loaded, decoded off the main
 * thread, and sized exactly, so a photo never blocks first paint and never
 * downloads at more than the pixels it will occupy.
 */

// Fixed palette rather than a random hue: two children in the same family
// should reliably get different, legible colours, and the same child should
// keep the same colour between sessions.
const PALETTE = [
  "#e3edf7",
  "#e1eee6",
  "#ebe7f5",
  "#f4ebd9",
  "#f3e5e8",
  "#dfefee",
];

function initialsOf(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function colourFor(name) {
  const key = String(name || "");
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) % 997;
  }
  return PALETTE[hash % PALETTE.length];
}

export default function ChildAvatar({ name, photoUrl, size = 44, className = "" }) {
  const [failedUrl, setFailedUrl] = useState(null);
  const resolved = normalizeImageUrl(photoUrl);
  const showPhoto = resolved && resolved !== failedUrl;

  const dimension = { width: size, height: size };

  if (showPhoto) {
    return (
      // Plain <img>, not next/image: these are arbitrary school-supplied URLs
      // (including Google Drive proxied through /api/media), which the image
      // optimiser is not configured for. Matches SchoolLogoMark's approach.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={resolved}
        alt={name || ""}
        style={dimension}
        loading="lazy"
        decoding="async"
        onError={() => setFailedUrl(resolved)}
        className={`${styles.avatar} ${className}`}
      />
    );
  }

  return (
    <span
      style={{ ...dimension, fontSize: Math.round(size * 0.34), background: colourFor(name), color: "#29465f" }}
      aria-hidden="true"
      className={`${styles.avatar} ${className}`}
    >
      {initialsOf(name)}
    </span>
  );
}
