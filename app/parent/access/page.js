"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FaKey } from "react-icons/fa";
import PinInput from "@/components/parent/PinInput";
import QrCardScanner, {
  extractActivationToken,
} from "@/components/parent/QrCardScanner";

/**
 * "Welcome to Pravyo" — the first screen a guardian ever sees.
 *
 * Three ways in, because one is never enough for this audience:
 *
 *   📷 Scan the card         — fastest when holding the printed card
 *   🖼️ Upload a photo of it  — cracked lens, no camera permission, or the card
 *                              arrived as a WhatsApp photo
 *   🔑 Type the Parent ID    — no camera at all, or the QR is too worn to read
 *
 * No email, no phone number, no password anywhere on this screen, and no
 * technical words — the guardian is asked for "your card", "your Parent ID" and
 * "your PIN", never a token or a credential.
 */
export default function ParentAccessPage() {
  const router = useRouter();

  const [parentId, setParentId] = useState("");
  const [pin, setPin] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  /** A QR was read — hand the token to the activation flow. */
  const handleScanned = (raw) => {
    const token = extractActivationToken(raw);

    if (!token) {
      setError(
        "That code is not a Pravyo Parent Card. Please check with your school."
      );
      return;
    }
    router.push(`/parent/activate?t=${encodeURIComponent(token)}`);
  };

  const submitManual = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Resolve the card and show the child for confirmation. Nothing is
      // activated by this call.
      const res = await fetch("/api/parent/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: "CONFIRM",
          parentId,
          activationPin: pin,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "That did not work.");

      // Carried in sessionStorage, not the URL — a PIN in a query string ends
      // up in history and in server logs.
      window.sessionStorage.setItem(
        "pravyo.activation",
        JSON.stringify({ parentId, activationPin: pin })
      );
      router.push("/parent/activate?mode=manual");
    } catch (err) {
      setError(err.message);
      setPin("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col bg-[var(--background)] px-5 py-8">
      <div className="mx-auto w-full max-w-sm flex-1">
        <div className="mb-7 text-center">
          <p className="text-5xl" aria-hidden="true">
            👨‍👩‍👧
          </p>
          <h1 className="mt-4 text-2xl font-bold text-[var(--brand-ink)]">
            Welcome to Pravyo
          </h1>
          <p className="mt-1 text-base text-[var(--brand-muted)]">
            प्रav्यो मा स्वागत छ
          </p>
          <p className="mt-3 text-sm leading-relaxed text-[var(--brand-muted)]">
            Your school gave you a Parent Card. Use it to see your child.
          </p>
        </div>

        {!showManual ? (
          <>
            <QrCardScanner onDetected={handleScanned} />

            {error ? (
              <p
                role="alert"
                className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
              >
                {error}
              </p>
            ) : null}

            <p className="py-4 text-center text-sm font-semibold text-[var(--brand-muted)]">
              OR / अथवा
            </p>

            <button
              type="button"
              onClick={() => {
                setShowManual(true);
                setError("");
              }}
              className="flex min-h-[64px] w-full items-center justify-center gap-3 rounded-2xl border-2 border-[var(--brand-border)] bg-white text-base font-bold text-[var(--brand-ink)]"
            >
              <FaKey aria-hidden="true" className="h-5 w-5" />
              Type my Parent ID
            </button>
          </>
        ) : (
          <form onSubmit={submitManual} className="space-y-5">
            <div>
              <label
                htmlFor="parentId"
                className="block text-base font-bold text-[var(--brand-ink)]"
              >
                Parent ID
              </label>
              <p className="text-sm text-[var(--brand-muted)]">
                From your card, e.g. PRV-P-X7K4Q9
              </p>
              <input
                id="parentId"
                type="text"
                inputMode="text"
                autoCapitalize="characters"
                autoComplete="off"
                value={parentId}
                onChange={(event) => setParentId(event.target.value.toUpperCase())}
                required
                className="mt-2 min-h-[60px] w-full rounded-xl border-2 border-[var(--brand-border)] px-4 text-center font-mono text-xl tracking-[0.15em] focus:border-[var(--brand-primary)] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-base font-bold text-[var(--brand-ink)]">
                PIN
              </label>
              <p className="text-sm text-[var(--brand-muted)]">
                The 6 numbers on your card
              </p>
              <PinInput value={pin} onChange={setPin} disabled={loading} />
            </div>

            {error ? (
              <p
                role="alert"
                className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
              >
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading || !parentId.trim() || pin.length !== 6}
              className="min-h-[60px] w-full rounded-xl bg-[var(--brand-primary)] text-lg font-bold text-white disabled:opacity-40"
            >
              {loading ? "Please wait…" : "Continue"}
            </button>

            <button
              type="button"
              onClick={() => {
                setShowManual(false);
                setError("");
              }}
              className="min-h-[48px] w-full text-sm font-semibold text-[var(--brand-muted)]"
            >
              ← Scan my card instead
            </button>
          </form>
        )}
      </div>

      <footer className="mx-auto mt-8 w-full max-w-sm text-center">
        <p className="text-sm font-semibold text-[var(--brand-ink)]">
          No card yet?
        </p>
        <p className="mt-1 text-sm text-[var(--brand-muted)]">
          Please ask your school office for your Parent Card.
        </p>
        <Link
          href="/parent/login"
          className="mt-4 inline-block min-h-[44px] text-sm font-semibold text-[var(--brand-primary)]"
        >
          Already connected? Sign in
        </Link>
      </footer>
    </main>
  );
}
