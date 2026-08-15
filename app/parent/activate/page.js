"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import ChildAvatar from "@/components/parent/ChildAvatar";
import PinInput from "@/components/parent/PinInput";

/**
 * Parent Access activation (§9–§12).
 *
 * A deliberately linear, one-question-per-screen flow. Each step asks for
 * exactly one decision, in words a guardian with low digital confidence can
 * act on:
 *
 *   1. CONFIRM  — "Is this the correct child?"      (§9)
 *   2. LANGUAGE — नेपाली / English, before anything complex  (§10)
 *   3. PIN      — choose 6 numbers, then confirm them        (§11)
 *   4. DEVICE   — "Is this your personal device?"            (§12)
 *   5. DONE     — "Aayush is now connected."                 (§47)
 *
 * Nothing is activated until step 1 is answered YES. The card is consumed at
 * step 3, when the guardian's own PIN is set.
 */
export default function ParentActivatePage() {
  return (
    <Suspense fallback={<CentredMessage text="Loading…" />}>
      <ActivateFlow />
    </Suspense>
  );
}

function ActivateFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("t");
  const manualMode = searchParams.get("mode") === "manual";

  const [step, setStep] = useState("LOADING");
  const [details, setDetails] = useState(null);
  const [manual, setManual] = useState(null);
  const [language, setLanguage] = useState("en");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Resolve the card. Runs once; the state update happens inside the async
  // callback so it does not fire synchronously during the effect.
  useEffect(() => {
    let active = true;

    (async () => {
      try {
        let payload = null;

        if (token) {
          const res = await fetch(
            `/api/parent/activate?t=${encodeURIComponent(token)}`,
            { cache: "no-store" }
          );
          const json = await res.json();
          if (!res.ok) throw new Error(json.message);
          payload = json.data;
        } else if (manualMode) {
          // Carried from /parent/access via sessionStorage, never the URL —
          // a PIN in a query string leaks into history and server logs.
          const stored = window.sessionStorage.getItem("pravyo.activation");
          if (!stored) throw new Error("Please enter your card details again.");
          const parsed = JSON.parse(stored);
          if (active) setManual(parsed);

          const res = await fetch("/api/parent/activate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ step: "CONFIRM", ...parsed }),
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json.message);
          payload = json.data;
        } else {
          throw new Error("Please scan your card or enter your Parent ID.");
        }

        if (!active) return;
        setDetails(payload);
        setLanguage(payload.language || "en");
        setStep("CONFIRM");
      } catch (err) {
        if (active) {
          setError(err.message);
          setStep("ERROR");
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [token, manualMode]);

  const finish = useCallback(
    async (devicePreference) => {
      setBusy(true);
      setError("");

      try {
        const res = await fetch("/api/parent/activate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...(token ? { token } : manual),
            pin,
            language,
            devicePreference,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message);

        window.sessionStorage.removeItem("pravyo.activation");

        // Sign in with the PIN the guardian just chose, so they land inside the
        // app rather than at a login screen.
        const result = await signIn("credentials", {
          loginScope: "parent",
          parentId: json.data.parentIdentifier,
          pin,
          deviceMode: devicePreference,
          redirect: false,
        });

        if (result?.error) {
          router.push("/parent/login");
          return;
        }
        setStep("DONE");
      } catch (err) {
        setError(err.message);
        setStep("PIN");
        setPin("");
        setConfirmPin("");
      } finally {
        setBusy(false);
      }
    },
    [token, manual, pin, language, router]
  );

  if (step === "LOADING") return <CentredMessage text="Loading…" />;

  if (step === "ERROR") {
    return (
      <Shell>
        <div className="text-center">
          <p className="text-5xl" aria-hidden="true">
            😕
          </p>
          <h1 className="mt-4 text-xl font-bold text-[var(--brand-ink)]">
            This card did not work
          </h1>
          <p className="mt-2 text-base text-[var(--brand-muted)]">{error}</p>
          <p className="mt-4 text-sm text-[var(--brand-muted)]">
            Please contact your school office for a new card.
          </p>
          <button
            type="button"
            onClick={() => router.push("/parent/access")}
            className="mt-6 min-h-[56px] w-full rounded-xl border-2 border-[var(--brand-primary)] font-bold text-[var(--brand-primary)]"
          >
            Try again
          </button>
        </div>
      </Shell>
    );
  }

  // ---- 1. Confirm the child (§9) ----------------------------------------
  if (step === "CONFIRM") {
    const child = details?.child;
    return (
      <Shell>
        <p className="text-center text-sm font-semibold uppercase tracking-wide text-[var(--brand-muted)]">
          {details.school.name}
        </p>

        <div className="mt-6 flex flex-col items-center">
          <ChildAvatar
            name={child?.name || "?"}
            photoUrl={child?.photoUrl}
            size={96}
          />
          <h1 className="mt-4 text-2xl font-bold text-[var(--brand-ink)]">
            {child?.name}
          </h1>
          {child?.grade ? (
            <p className="text-base text-[var(--brand-muted)]">{child.grade}</p>
          ) : null}
        </div>

        <p className="mt-6 text-center text-base text-[var(--brand-ink)]">
          {details.guardianName}, you have been invited as{" "}
          <strong>{relationshipLabel(details.relationshipType)}</strong>.
        </p>

        <p className="mt-6 text-center text-lg font-bold text-[var(--brand-ink)]">
          Is this the correct child?
        </p>

        <div className="mt-5 space-y-3">
          <button
            type="button"
            onClick={() => setStep("LANGUAGE")}
            className="min-h-[60px] w-full rounded-xl bg-emerald-600 text-lg font-bold text-white"
          >
            ✓ Yes, Continue
          </button>
          <button
            type="button"
            onClick={() => setStep("WRONG_CHILD")}
            className="min-h-[56px] w-full rounded-xl border-2 border-red-300 font-bold text-red-700"
          >
            This Is Not Correct
          </button>
        </div>
      </Shell>
    );
  }

  if (step === "WRONG_CHILD") {
    return (
      <Shell>
        <div className="text-center">
          <p className="text-5xl" aria-hidden="true">
            🛑
          </p>
          <h1 className="mt-4 text-xl font-bold text-[var(--brand-ink)]">
            Thank you for telling us
          </h1>
          <p className="mt-3 text-base text-[var(--brand-muted)]">
            Please do not continue. Take this card back to the school office so
            they can correct it.
          </p>
          <p className="mt-2 text-base text-[var(--brand-muted)]">
            कृपया यो कार्ड विद्यालयमा फिर्ता लैजानुहोस्।
          </p>
        </div>
      </Shell>
    );
  }

  // ---- 2. Language, before anything complex (§10) -----------------------
  if (step === "LANGUAGE") {
    return (
      <Shell>
        <h1 className="text-center text-xl font-bold text-[var(--brand-ink)]">
          Choose your language
        </h1>
        <p className="mt-1 text-center text-base text-[var(--brand-muted)]">
          भाषा छान्नुहोस्
        </p>

        <div className="mt-6 space-y-3">
          {[
            { code: "ne", label: "नेपाली", sub: "Nepali" },
            { code: "en", label: "English", sub: "अंग्रेजी" },
          ].map((option) => (
            <button
              key={option.code}
              type="button"
              onClick={() => {
                setLanguage(option.code);
                setStep("PIN");
              }}
              className={[
                "min-h-[72px] w-full rounded-2xl border-2 text-center transition-colors",
                language === option.code
                  ? "border-[var(--brand-primary)] bg-[var(--brand-primary-soft)]"
                  : "border-[var(--brand-border)] bg-white",
              ].join(" ")}
            >
              <span className="block text-xl font-bold text-[var(--brand-ink)]">
                {option.label}
              </span>
              <span className="block text-sm text-[var(--brand-muted)]">
                {option.sub}
              </span>
            </button>
          ))}
        </div>
      </Shell>
    );
  }

  // ---- 3. Choose a PIN (§11) --------------------------------------------
  if (step === "PIN") {
    const ready = pin.length === 6;
    return (
      <Shell>
        <h1 className="text-center text-xl font-bold text-[var(--brand-ink)]">
          Create Your Pravyo PIN
        </h1>
        <p className="mt-2 text-center text-base leading-relaxed text-[var(--brand-muted)]">
          Choose 6 numbers. You will use this PIN when Pravyo needs to confirm
          that it is you.
        </p>

        <div className="mt-6">
          <PinInput value={pin} onChange={setPin} disabled={busy} />
        </div>

        {error ? (
          <p
            role="alert"
            className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
          >
            {error}
          </p>
        ) : null}

        <button
          type="button"
          disabled={!ready || busy}
          onClick={() => {
            setError("");
            setStep("CONFIRM_PIN");
          }}
          className="mt-6 min-h-[60px] w-full rounded-xl bg-[var(--brand-primary)] text-lg font-bold text-white disabled:opacity-40"
        >
          Continue
        </button>

        <p className="mt-4 text-center text-xs text-[var(--brand-muted)]">
          Do not use 000000 or 123456. Keep your PIN private.
        </p>
      </Shell>
    );
  }

  if (step === "CONFIRM_PIN") {
    const matches = confirmPin.length === 6 && confirmPin === pin;
    return (
      <Shell>
        <h1 className="text-center text-xl font-bold text-[var(--brand-ink)]">
          Enter your PIN again
        </h1>
        <p className="mt-2 text-center text-base text-[var(--brand-muted)]">
          This makes sure you remember it.
        </p>

        <div className="mt-6">
          <PinInput value={confirmPin} onChange={setConfirmPin} disabled={busy} />
        </div>

        {confirmPin.length === 6 && !matches ? (
          <p
            role="alert"
            className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
          >
            The two PINs are different. Please try again.
          </p>
        ) : null}

        <button
          type="button"
          disabled={!matches || busy}
          onClick={() => setStep("DEVICE")}
          className="mt-6 min-h-[60px] w-full rounded-xl bg-[var(--brand-primary)] text-lg font-bold text-white disabled:opacity-40"
        >
          Continue
        </button>

        <button
          type="button"
          onClick={() => {
            setConfirmPin("");
            setPin("");
            setStep("PIN");
          }}
          className="mt-3 min-h-[48px] w-full text-sm font-semibold text-[var(--brand-muted)]"
        >
          Choose a different PIN
        </button>
      </Shell>
    );
  }

  // ---- 4. Personal or shared device (§12) --------------------------------
  if (step === "DEVICE") {
    return (
      <Shell>
        <h1 className="text-center text-xl font-bold text-[var(--brand-ink)]">
          Is this your personal device?
        </h1>

        <div className="mt-6 space-y-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => finish("PERSONAL")}
            className="min-h-[80px] w-full rounded-2xl border-2 border-[var(--brand-border)] bg-white px-4 text-left"
          >
            <span className="block text-lg font-bold text-[var(--brand-ink)]">
              📱 Yes, this is my phone
            </span>
            <span className="block text-sm text-[var(--brand-muted)]">
              Stay signed in on this device.
            </span>
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={() => finish("SHARED")}
            className="min-h-[80px] w-full rounded-2xl border-2 border-[var(--brand-border)] bg-white px-4 text-left"
          >
            <span className="block text-lg font-bold text-[var(--brand-ink)]">
              👨‍👩‍👧 This phone is shared
            </span>
            <span className="block text-sm text-[var(--brand-muted)]">
              Ask for my PIN again after a while.
            </span>
          </button>
        </div>

        {busy ? (
          <p className="mt-6 text-center text-sm text-[var(--brand-muted)]">
            Connecting…
          </p>
        ) : null}
      </Shell>
    );
  }

  // ---- 5. Done (§47) ------------------------------------------------------
  return (
    <Shell>
      <div className="text-center">
        <p className="text-6xl" aria-hidden="true">
          ✓
        </p>
        <h1 className="mt-4 text-2xl font-bold text-[var(--brand-ink)]">
          {details?.child?.name} is now connected.
        </h1>
        <button
          type="button"
          onClick={() => router.push("/parent")}
          className="mt-8 min-h-[60px] w-full rounded-xl bg-[var(--brand-primary)] text-lg font-bold text-white"
        >
          View {details?.child?.name?.split(" ")[0]}&apos;s Journey
        </button>
      </div>
    </Shell>
  );
}

function Shell({ children }) {
  return (
    <main className="flex min-h-screen flex-col justify-center bg-[var(--background)] px-5 py-8">
      <div className="mx-auto w-full max-w-sm">{children}</div>
    </main>
  );
}

function CentredMessage({ text }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)]">
      <p className="text-sm text-[var(--brand-muted)]">{text}</p>
    </main>
  );
}

function relationshipLabel(value) {
  if (!value) return "Guardian";
  return String(value)
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
