"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { FaCamera, FaImage, FaTimes } from "react-icons/fa";

/**
 * Read a Parent Access Card's QR code — from the live camera, or from a photo.
 *
 * Both paths matter for this audience:
 *
 *  - **Camera** is the fast path when the guardian is holding the printed card.
 *  - **Photo upload** covers the cases that actually happen: the card was
 *    photographed and sent over WhatsApp, the camera lens is cracked, the phone
 *    refuses camera permission, or the light is too poor to focus.
 *
 * Decoding uses jsQR (MIT, no dependencies) rather than the native
 * `BarcodeDetector`, which is absent on iOS Safari and on older Android
 * WebViews — precisely the devices this has to work on.
 *
 * Nothing is uploaded. Frames are decoded on-device and discarded; only the
 * activation token inside the QR is ever sent, and only when the guardian
 * continues.
 */
export default function QrCardScanner({ onDetected, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const frameRef = useRef(null);

  const [mode, setMode] = useState("IDLE");
  const [error, setError] = useState("");

  /** Stop the camera. Leaving it running keeps the phone's indicator lit. */
  const stopCamera = useCallback(() => {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  const handleResult = useCallback(
    (text) => {
      stopCamera();
      onDetected(text);
    },
    [onDetected, stopCamera]
  );

  const startCamera = async () => {
    setError("");
    setMode("CAMERA");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        // Rear camera on a phone; falls back to whatever exists on a laptop.
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      // iOS refuses to play an un-muted inline video without a user gesture.
      video.setAttribute("playsinline", "true");
      await video.play();

      const scan = () => {
        const canvas = canvasRef.current;
        if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
          frameRef.current = requestAnimationFrame(scan);
          return;
        }

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        const image = context.getImageData(0, 0, canvas.width, canvas.height);
        const found = jsQR(image.data, image.width, image.height, {
          inversionAttempts: "dontInvert",
        });

        if (found?.data) {
          handleResult(found.data);
          return;
        }
        frameRef.current = requestAnimationFrame(scan);
      };

      frameRef.current = requestAnimationFrame(scan);
    } catch {
      // Overwhelmingly a denied permission, occasionally no camera at all.
      setError(
        "Could not open the camera. You can upload a photo of your card instead."
      );
      setMode("IDLE");
    }
  };

  /** Decode a still photo of the card. */
  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");
    setMode("READING");

    try {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement("canvas");

      // Cap the working size. A 12-megapixel phone photo decoded at full
      // resolution can stall a low-end device for several seconds.
      const MAX_EDGE = 1400;
      const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);

      const context = canvas.getContext("2d", { willReadFrequently: true });
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close?.();

      const image = context.getImageData(0, 0, canvas.width, canvas.height);
      // "attemptBoth" here, unlike the live path: a photographed or
      // photocopied card is often inverted or low-contrast, and a still frame
      // can afford the extra pass.
      const found = jsQR(image.data, image.width, image.height, {
        inversionAttempts: "attemptBoth",
      });

      if (found?.data) {
        handleResult(found.data);
        return;
      }

      setError(
        "Could not read the code in that picture. Try a clearer photo, or type your Parent ID instead."
      );
      setMode("IDLE");
    } catch {
      setError("Could not open that picture. Please try another one.");
      setMode("IDLE");
    } finally {
      // Allow re-picking the same file after a failed attempt.
      event.target.value = "";
    }
  };

  return (
    <div className="space-y-3">
      {mode === "CAMERA" ? (
        <div className="relative overflow-hidden rounded-2xl bg-black">
          <video
            ref={videoRef}
            className="h-64 w-full object-cover"
            muted
            playsInline
          />
          {/* Aiming guide — a plain frame reads better than an animated
              overlay on a low-end screen. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
          >
            <div className="h-40 w-40 rounded-2xl border-4 border-white/80" />
          </div>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              setMode("IDLE");
            }}
            aria-label="Stop camera"
            className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white"
          >
            <FaTimes />
          </button>
          <p className="absolute inset-x-0 bottom-0 bg-black/60 py-2 text-center text-sm text-white">
            Point at the square code on your card
          </p>
        </div>
      ) : (
        <button
          type="button"
          onClick={startCamera}
          disabled={mode === "READING"}
          className="flex min-h-[72px] w-full items-center justify-center gap-3 rounded-2xl border-2 border-[var(--brand-primary)] bg-white text-lg font-bold text-[var(--brand-primary)] disabled:opacity-50"
        >
          <FaCamera aria-hidden="true" className="h-5 w-5" />
          Scan my card
        </button>
      )}

      <label className="flex min-h-[64px] w-full cursor-pointer items-center justify-center gap-3 rounded-2xl border-2 border-[var(--brand-border)] bg-white text-base font-bold text-[var(--brand-ink)]">
        <FaImage aria-hidden="true" className="h-5 w-5" />
        {mode === "READING" ? "Reading…" : "Upload a photo of my card"}
        <input
          type="file"
          accept="image/*"
          onChange={handleFile}
          className="sr-only"
        />
      </label>

      {error ? (
        <p
          role="alert"
          className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900"
        >
          {error}
        </p>
      ) : null}

      {/* Off-screen scratch surface for the live decode loop. */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

/**
 * Pull the activation token out of whatever the QR contained.
 *
 * Cards printed under the OLD activation flow encode a full
 * `/parent/activate?t=…` URL. Those are still in circulation and still work, so
 * this stays. New cards carry the Parent ID instead — see `readParentCard`.
 */
export function extractActivationToken(raw) {
  const value = String(raw || "").trim();
  if (!value) return null;

  try {
    const url = new URL(value);
    const token = url.searchParams.get("t");
    if (token) return token;
  } catch {
    // Not a URL — fall through and treat it as a bare token.
  }

  // A bare token: base64url, and long enough to be one of ours.
  if (/^[A-Za-z0-9_-]{20,}$/.test(value)) return value;

  return null;
}

// The Parent ID alphabet, duplicated from lib/parentIdentity.js on purpose:
// that module imports node:crypto and cannot be pulled into a client bundle.
// Only the shape is repeated here — the server still normalises and validates.
const PARENT_ID_BODY = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/;

/**
 * Read a scanned Parent Access Card into something the sign-in form can use.
 *
 * Two card generations have to be understood, because both are in school bags
 * right now:
 *
 *   - **Current** — `/parent/login?id=PRV-P-X7K4Q9`. The Parent ID is the
 *     credential, so the QR is simply a way of typing it without typing.
 *   - **Legacy**  — `/parent/activate?t=<32-byte token>`. Resolves to the same
 *     guardian server-side.
 *
 * Returns `{ parentId }`, `{ token }`, or null for a QR that is not ours —
 * a supermarket loyalty card must not be posted to the sign-in endpoint.
 */
export function readParentCard(raw) {
  const value = String(raw || "").trim();
  if (!value) return null;

  let candidate = value;

  try {
    const url = new URL(value);
    const id = url.searchParams.get("id");
    if (id) candidate = id;
    const token = url.searchParams.get("t");
    if (token) return { token };
  } catch {
    // Not a URL — treat the whole string as the credential.
  }

  const compact = candidate.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const body = compact.startsWith("PRVP") ? compact.slice(4) : compact;
  if (PARENT_ID_BODY.test(body)) return { parentId: `PRV-P-${body}` };

  const token = extractActivationToken(value);
  return token ? { token } : null;
}
