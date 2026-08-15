"use client";

import { useState } from "react";
import { normalizeImageUrl } from "@/lib/imageUrls";

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
  "bg-sky-600",
  "bg-emerald-600",
  "bg-violet-600",
  "bg-amber-600",
  "bg-rose-600",
  "bg-teal-600",
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
  const [failed, setFailed] = useState(false);
  const resolved = normalizeImageUrl(photoUrl);
  const showPhoto = resolved && !failed;

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
        onError={() => setFailed(true)}
        className={`shrink-0 rounded-full object-cover ring-2 ring-white ${className}`}
      />
    );
  }

  return (
    <span
      style={{ ...dimension, fontSize: Math.round(size * 0.38) }}
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full font-bold text-white ring-2 ring-white ${colourFor(
        name
      )} ${className}`}
    >
      {initialsOf(name)}
    </span>
  );
}
