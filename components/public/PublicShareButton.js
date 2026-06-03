"use client";

import { useState } from "react";
import { FaCheck, FaShareAlt } from "react-icons/fa";

export default function PublicShareButton({
  href,
  title = "Pratyo",
  label = "Share",
  className = "",
}) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = new URL(href, window.location.origin).toString();

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
        return;
      }
    } catch (error) {
      console.error(`Failed to copy ${title} link`, error);
    }

    window.prompt("Copy this link", url);
  }

  return (
    <button type="button" onClick={handleShare} className={className} aria-live="polite">
      {copied ? <FaCheck /> : <FaShareAlt />}
      {copied ? "Link copied" : label}
    </button>
  );
}
