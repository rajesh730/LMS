"use client";

import { useRef, useState } from "react";
import { FaImage, FaSpinner, FaTimes } from "react-icons/fa";
import { compressImage } from "@/lib/client/compressImage";

export default function ImageUploadField({
  purpose,
  value,
  onChange,
  label = "Upload image",
  maxEdge = 1280,
  quality = 0.72,
  className = "",
}) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const upload = async (event) => {
    const original = event.target.files?.[0];
    event.target.value = "";
    if (!original) return;

    try {
      setUploading(true);
      setError("");
      const compressed = await compressImage(original, { maxEdge, quality });
      const form = new FormData();
      form.append("file", compressed.file);
      form.append("purpose", purpose);
      form.append("width", String(compressed.width));
      form.append("height", String(compressed.height));
      form.append("originalName", original.name);

      const response = await fetch("/api/media/upload", {
        method: "POST",
        body: form,
      });
      const responseText = await response.text();
      let json = null;
      try {
        json = responseText ? JSON.parse(responseText) : null;
      } catch {
        // Proxies can replace an upstream 5xx response with an HTML error page.
      }
      if (!response.ok) {
        throw new Error(
          json?.message ||
            (response.status === 502 || response.status === 504
              ? "Storage did not respond in time. Check the R2 S3 endpoint and credentials."
              : `Image upload failed (${response.status}).`)
        );
      }
      if (!json?.data?.asset) {
        throw new Error("The upload completed without a valid media record.");
      }
      onChange(json.data.asset);
    } catch (uploadError) {
      setError(uploadError.message || "Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={className}>
      {value?.url ? (
        <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value.url} alt="Upload preview" className="h-40 w-full object-cover" />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-full bg-black/70 text-white"
            aria-label="Remove image"
          >
            <FaTimes />
          </button>
        </div>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={upload}
        className="sr-only"
      />
      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="mt-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-purple-200 bg-purple-50 px-4 text-sm font-bold text-purple-700 disabled:opacity-60"
      >
        {uploading ? <FaSpinner className="animate-spin" /> : <FaImage />}
        {uploading ? "Compressing and uploading..." : label}
      </button>
      <p className="mt-1 text-xs text-slate-500">
        The original is not uploaded. A smaller WebP copy is created first.
      </p>
      {error ? <p className="mt-2 text-sm font-semibold text-red-700">{error}</p> : null}
    </div>
  );
}
