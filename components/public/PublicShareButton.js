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
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
        return;
      }
    } catch (error) {
      if (error?.name === "AbortError") return;
    }

    window.location.href = url;
  }

  return (
    <button type="button" onClick={handleShare} className={className}>
      {copied ? <FaCheck /> : <FaShareAlt />}
      {copied ? "Link copied" : label}
    </button>
  );
}
