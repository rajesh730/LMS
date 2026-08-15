"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import PinInput from "@/components/parent/PinInput";

/**
 * Returning guardian sign-in (§13, §15).
 *
 * **Primary: Parent ID + PIN.** No email, no phone, no password — the two
 * things printed on the Parent Access Card are all that is needed.
 *
 * **Secondary: the old email/password form**, kept behind "Other sign-in
 * options". §57 is explicit that existing guardians must not be forced to
 * migrate, so that path stays live rather than being deleted; it is simply no
 * longer the default.
 *
 * The device question is asked here too, because a guardian may sign in on a
 * borrowed handset even though their own phone is personal (§12).
 */
export default function ParentLoginPage() {
  const [mode, setMode] = useState("PIN");

  const [parentId, setParentId] = useState("");
  const [pin, setPin] = useState("");
  const [sharedDevice, setSharedDevice] = useState(false);

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const finish = (result) => {
    if (result?.error) {
      setError(result.error);
      setPin("");
      return;
    }
    // Full navigation, not router.push: the session cookie must be in place
    // before the middleware evaluates /parent.
    window.location.assign("/parent");
  };

  const submitPin = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      finish(
        await signIn("credentials", {
          loginScope: "parent",
          parentId: parentId.trim(),
          pin,
          deviceMode: sharedDevice ? "SHARED" : "PERSONAL",
          redirect: false,
        })
      );
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const submitLegacy = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      finish(
        await signIn("credentials", {
          loginScope: "parent",
          email: identifier.trim(),
          password,
          redirect: false,
        })
      );
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col justify-center bg-[var(--background)] px-5 py-10">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-4xl" aria-hidden="true">
            👨‍👩‍👧
          </p>
          <h1 className="mt-3 text-2xl font-bold text-[var(--brand-ink)]">
            Welcome Back
          </h1>
          <p className="mt-1 text-base text-[var(--brand-muted)]">
            फेरि स्वागत छ
          </p>
        </div>

        {mode === "PIN" ? (
          <form onSubmit={submitPin} className="space-y-5">
            <div>
              <label
                htmlFor="parentId"
                className="block text-base font-bold text-[var(--brand-ink)]"
              >
                Parent ID
              </label>
              <input
                id="parentId"
                type="text"
                inputMode="text"
                autoCapitalize="characters"
                autoComplete="username"
                value={parentId}
                onChange={(event) => setParentId(event.target.value.toUpperCase())}
                required
                placeholder="PRV-P-XXXXXX"
                className="mt-2 min-h-[60px] w-full rounded-xl border-2 border-[var(--brand-border)] px-4 text-center font-mono text-xl tracking-[0.15em] focus:border-[var(--brand-primary)] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-base font-bold text-[var(--brand-ink)]">
                PIN
              </label>
              <PinInput value={pin} onChange={setPin} disabled={loading} />
            </div>

            <label className="flex min-h-[48px] items-center gap-3 text-sm text-[var(--brand-ink)]">
              <input
                type="checkbox"
                checked={sharedDevice}
                onChange={(event) => setSharedDevice(event.target.checked)}
                className="h-5 w-5"
              />
              This phone is shared with others
            </label>

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
          </form>
        ) : (
          <form onSubmit={submitLegacy} className="space-y-4">
            <p className="rounded-xl bg-sky-50 px-4 py-3 text-sm text-sky-900">
              For guardians who signed up with an email address or phone number.
            </p>
            <div>
              <label
                htmlFor="identifier"
                className="block text-sm font-semibold text-[var(--brand-ink)]"
              >
                Email or phone number
              </label>
              <input
                id="identifier"
                type="text"
                autoComplete="username"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                required
                className="mt-1.5 min-h-[52px] w-full rounded-xl border border-[var(--brand-border)] px-4 text-base focus:border-[var(--brand-primary)] focus:outline-none"
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-[var(--brand-ink)]"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                className="mt-1.5 min-h-[52px] w-full rounded-xl border border-[var(--brand-border)] px-4 text-base focus:border-[var(--brand-primary)] focus:outline-none"
              />
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
              disabled={loading}
              className="min-h-[56px] w-full rounded-xl bg-[var(--brand-primary)] text-base font-bold text-white disabled:opacity-60"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        )}

        <button
          type="button"
          onClick={() => {
            setMode(mode === "PIN" ? "LEGACY" : "PIN");
            setError("");
          }}
          className="mt-6 min-h-[48px] w-full text-sm font-semibold text-[var(--brand-primary)]"
        >
          {mode === "PIN" ? "Other sign-in options" : "Use Parent ID and PIN"}
        </button>

        <div className="mt-8 rounded-2xl border border-[var(--brand-border)] bg-white p-4 text-center">
          <p className="text-sm font-semibold text-[var(--brand-ink)]">
            First time here?
          </p>
          <Link
            href="/parent/access"
            className="mt-2 inline-flex min-h-[48px] w-full items-center justify-center rounded-xl border-2 border-[var(--brand-primary)] font-bold text-[var(--brand-primary)]"
          >
            Use your Parent Card
          </Link>
        </div>

        <p className="mt-6 text-center text-sm text-[var(--brand-muted)]">
          Forgot your PIN? Please contact your school office.
        </p>
      </div>
    </main>
  );
}
