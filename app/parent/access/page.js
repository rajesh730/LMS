"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FaCamera, FaKey } from "react-icons/fa";
import PinInput from "@/components/parent/PinInput";

/**
 * "Welcome to Pravyo" — the first screen a guardian ever sees (§8).
 *
 * Two doors, both large:
 *   📷 Scan Parent Card   — the fast path for anyone with a working camera
 *   🔑 Enter Parent ID    — for a cracked lens, a borrowed phone, a photocopied
 *                           card, or simply preferring to type
 *
 * Neither path asks for an email, a phone number, or a password. No technical
 * words appear anywhere on this screen (§68) — the guardian is asked for "your
 * card", "your Parent ID" and "your PIN", never a token or a credential.
 *
 * Scanning is handled by the phone's own camera app rather than an in-page
 * scanner: every Android and iOS camera reads QR natively and opens the link,
 * which avoids a camera permission prompt, a scanning library, and the failure
 * mode where an in-page scanner does not work on a low-end device.
 */
export default function ParentAccessPage() {
  const router = useRouter();

  const [parentId, setParentId] = useState("");
  const [pin, setPin] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Resolve the card and show the child for confirmation. Nothing is
      // activated by this call (§9).
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

      // Carry the entered pair to the confirmation screen in session storage
      // rather than the URL — a PIN in a URL ends up in history and in logs.
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
        <div className="mb-8 text-center">
          <p className="text-5xl" aria-hidden="true">
            👨‍👩‍👧
          </p>
          <h1 className="mt-4 text-2xl font-bold text-[var(--brand-ink)]">
            Welcome to Pravyo
          </h1>
          <p className="mt-1 text-base text-[var(--brand-muted)]">
            पravyo मा स्वागत छ
          </p>
        </div>

        {!showManual ? (
          <div className="space-y-3">
            {/* Primary: use the phone's own camera on the printed QR. */}
            <div className="rounded-2xl border-2 border-[var(--brand-primary)] bg-white p-5 text-center">
              <span aria-hidden="true" className="text-4xl">
                📷
              </span>
              <h2 className="mt-2 text-lg font-bold text-[var(--brand-ink)]">
                Scan Parent Card
              </h2>
              <p className="mt-1 text-sm text-[var(--brand-muted)]">
                Open your phone camera and point it at the square code on your
                card.
              </p>
              <p className="mt-1 text-sm text-[var(--brand-muted)]">
                कार्डको कोड क्यामेरामा देखाउनुहोस्।
              </p>
            </div>

            <p className="py-1 text-center text-sm font-semibold text-[var(--brand-muted)]">
              OR / अथवा
            </p>

            <button
              type="button"
              onClick={() => setShowManual(true)}
              className="flex min-h-[64px] w-full items-center justify-center gap-3 rounded-2xl border-2 border-[var(--brand-border)] bg-white text-lg font-bold text-[var(--brand-ink)]"
            >
              <FaKey aria-hidden="true" className="h-5 w-5" />
              Enter Parent ID
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-5">
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
              <PinInput value={pin} onChange={setPin} />
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
              onClick={() => setShowManual(false)}
              className="min-h-[48px] w-full text-sm font-semibold text-[var(--brand-muted)]"
            >
              Back
            </button>
          </form>
        )}
      </div>

      <footer className="mx-auto mt-8 w-full max-w-sm text-center">
        <p className="text-sm font-semibold text-[var(--brand-ink)]">
          Need help?
        </p>
        <p className="mt-1 text-sm text-[var(--brand-muted)]">
          Please contact your school office.
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
