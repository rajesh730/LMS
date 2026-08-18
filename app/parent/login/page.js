"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import QrCardScanner, { readParentCard } from "@/components/parent/QrCardScanner";

/**
 * Parent sign-in — the only door into the Parent App.
 *
 * Two ways through it, and nothing else:
 *
 *   📷 **Scan the card** — one tap, nothing typed.
 *   🔑 **Type the Parent ID** — one field, then Continue.
 *
 * There is no PIN to create, no PIN to remember, no separate "activate your
 * card" journey, and no first-run wizard. The first sign-in and the hundredth
 * are the same three seconds. A guardian who has been handed a card should
 * never be asked to invent a secret before they can see their own child.
 *
 * What that costs is real and is documented in lib/parentCredentials.js: the
 * card is now a key, and whoever holds it can sign in. The school kills a lost
 * one by issuing a new card, which changes the Parent ID.
 *
 * The old email/password form stays behind "Other ways to sign in" — guardians
 * who registered that way are not forced to migrate (§57).
 */
export default function ParentLoginPage() {
  return (
    <Suspense fallback={<Centred text="Loading…" />}>
      <ParentLogin />
    </Suspense>
  );
}

const TEXT = {
  en: {
    welcome: "Welcome",
    intro: "Use the Parent Card your school gave you.",
    parentId: "Parent ID",
    idHint: "The code on your card",
    or: "OR",
    continue: "Continue",
    working: "Please wait…",
    shared: "This phone is shared with others",
    otherWays: "Other ways to sign in",
    backToCard: "Use my Parent Card",
    noCard: "No card yet?",
    askSchool: "Please ask your school office for your Parent Card.",
    notACard: "That code is not a Pravyo Parent Card.",
    failed: "Something went wrong. Please try again.",
  },
  ne: {
    welcome: "स्वागत छ",
    intro: "विद्यालयले दिएको अभिभावक कार्ड प्रयोग गर्नुहोस्।",
    parentId: "अभिभावक आईडी",
    idHint: "तपाईंको कार्डमा भएको कोड",
    or: "अथवा",
    continue: "अगाडि बढ्नुहोस्",
    working: "कृपया पर्खनुहोस्…",
    shared: "यो फोन अरूसँग साझा छ",
    otherWays: "अन्य तरिकाले साइन इन गर्नुहोस्",
    backToCard: "मेरो अभिभावक कार्ड प्रयोग गर्ने",
    noCard: "कार्ड छैन?",
    askSchool: "कृपया विद्यालयको कार्यालयमा अभिभावक कार्ड माग्नुहोस्।",
    notACard: "यो कोड प्राव्यो अभिभावक कार्ड होइन।",
    failed: "केही गडबड भयो। कृपया फेरि प्रयास गर्नुहोस्।",
  },
};

function ParentLogin() {
  const searchParams = useSearchParams();
  // A scanned card lands here as a query parameter: `?id=` from a current
  // card, `?t=` from a legacy one redirected via /parent/activate.
  const scannedId = searchParams.get("id");
  const scannedToken = searchParams.get("t");

  const [language, setLanguage] = useState("en");
  const [mode, setMode] = useState("CARD");
  const [parentId, setParentId] = useState("");
  const [sharedDevice, setSharedDevice] = useState(false);

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const t = TEXT[language];

  // Full navigation rather than router.push: the session cookie has to be in
  // place before the middleware evaluates /parent.
  const finish = (result) => {
    if (result?.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    window.location.assign("/parent");
  };

  const enter = useCallback(
    async (credentials) => {
      setError("");
      setLoading(true);
      try {
        const result = await signIn("credentials", {
          loginScope: "parent",
          language,
          deviceMode: sharedDevice ? "SHARED" : "PERSONAL",
          redirect: false,
          ...credentials,
        });
        if (result?.error) {
          setError(result.error);
          setLoading(false);
          return;
        }
        window.location.assign("/parent");
      } catch {
        setError(TEXT[language].failed);
        setLoading(false);
      }
    },
    [language, sharedDevice]
  );

  // A card scanned with the phone's own camera app opens this page directly.
  // Sign the guardian in rather than making them retype what they just scanned.
  // Guarded by a ref so React's double-invoked effects cannot fire two logins.
  const autoSubmitted = useRef(false);
  useEffect(() => {
    if (autoSubmitted.current) return;
    if (!scannedId && !scannedToken) return;
    autoSubmitted.current = true;

    // Inside an async callback rather than the effect body: signing in is work
    // to be started, not state to be synchronised, and calling it synchronously
    // here would cascade renders.
    (async () => {
      if (scannedToken) {
        await enter({ cardToken: scannedToken });
        return;
      }
      // Fill the field too, so a failure leaves the guardian looking at the ID
      // that did not work rather than an empty box.
      setParentId(scannedId.toUpperCase());
      await enter({ parentId: scannedId });
    })();
  }, [scannedId, scannedToken, enter]);

  const submitCard = (event) => {
    event.preventDefault();
    enter({ parentId: parentId.trim() });
  };

  const submitLegacy = (event) => {
    event.preventDefault();
    enter({ email: identifier.trim(), password });
  };

  const handleScan = (raw) => {
    const card = readParentCard(raw);
    if (!card) {
      setError(t.notACard);
      return;
    }
    if (card.parentId) setParentId(card.parentId);
    enter(card);
  };

  return (
    // `min-h-[100dvh]`, NOT `min-h-screen`. 100vh on a phone is the viewport
    // with the browser chrome HIDDEN — taller than what is actually on screen.
    // With `justify-center` that pushed Continue underneath the address bar,
    // and because the container was exactly one viewport tall there was nothing
    // to scroll to, so the button was unreachable. `dvh` tracks the visible
    // height, so the page fits or scrolls.
    <main className="flex min-h-[100dvh] flex-col justify-center bg-[var(--background)] px-5 py-10 pb-[calc(2.5rem+env(safe-area-inset-bottom))]">
      <div className="mx-auto w-full max-w-sm">
        {/* Language first and always visible. A guardian who cannot read the
            screen cannot be asked to choose a language further in. */}
        <div className="mb-6 flex justify-center gap-2">
          {[
            { code: "en", label: "English" },
            { code: "ne", label: "नेपाली" },
          ].map((option) => (
            <button
              key={option.code}
              type="button"
              onClick={() => setLanguage(option.code)}
              aria-pressed={language === option.code}
              className={[
                "min-h-[40px] rounded-full px-4 text-sm font-bold transition-colors",
                language === option.code
                  ? "bg-[var(--brand-primary)] text-white"
                  : "border border-[var(--brand-border)] bg-white text-[var(--brand-muted)]",
              ].join(" ")}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="mb-7 text-center">
          <p className="text-5xl" aria-hidden="true">
            👨‍👩‍👧
          </p>
          <h1 className="mt-3 text-2xl font-bold text-[var(--brand-ink)]">
            {t.welcome}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[var(--brand-muted)]">
            {t.intro}
          </p>
        </div>

        {mode === "CARD" ? (
          <>
            <QrCardScanner onDetected={handleScan} />

            <p className="py-4 text-center text-sm font-semibold text-[var(--brand-muted)]">
              {t.or}
            </p>

            <form onSubmit={submitCard} className="space-y-4">
              <div>
                <label
                  htmlFor="parentId"
                  className="block text-base font-bold text-[var(--brand-ink)]"
                >
                  {t.parentId}
                </label>
                <p className="text-sm text-[var(--brand-muted)]">
                  {t.idHint} — PRV-P-XXXXXX
                </p>
                <input
                  id="parentId"
                  type="text"
                  inputMode="text"
                  autoCapitalize="characters"
                  autoComplete="username"
                  autoFocus
                  value={parentId}
                  onChange={(event) =>
                    setParentId(event.target.value.toUpperCase())
                  }
                  required
                  placeholder="PRV-P-XXXXXX"
                  className="mt-2 min-h-[64px] w-full rounded-xl border-2 border-[var(--brand-border)] px-4 text-center font-mono text-xl tracking-[0.15em] focus:border-[var(--brand-primary)] focus:outline-none"
                />
              </div>

              <label className="flex min-h-[48px] items-center gap-3 text-sm text-[var(--brand-ink)]">
                <input
                  type="checkbox"
                  checked={sharedDevice}
                  onChange={(event) => setSharedDevice(event.target.checked)}
                  className="h-5 w-5"
                />
                {t.shared}
              </label>

              {error ? <ErrorNote>{error}</ErrorNote> : null}

              <button
                type="submit"
                disabled={loading || !parentId.trim()}
                className="min-h-[60px] w-full rounded-xl bg-[var(--brand-primary)] text-lg font-bold text-white disabled:opacity-40"
              >
                {loading ? t.working : t.continue}
              </button>
            </form>
          </>
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

            {error ? <ErrorNote>{error}</ErrorNote> : null}

            <button
              type="submit"
              disabled={loading}
              className="min-h-[56px] w-full rounded-xl bg-[var(--brand-primary)] text-base font-bold text-white disabled:opacity-60"
            >
              {loading ? t.working : "Sign in"}
            </button>
          </form>
        )}

        <button
          type="button"
          onClick={() => {
            setMode(mode === "CARD" ? "LEGACY" : "CARD");
            setError("");
          }}
          className="mt-6 min-h-[48px] w-full text-sm font-semibold text-[var(--brand-primary)]"
        >
          {mode === "CARD" ? t.otherWays : t.backToCard}
        </button>

        <div className="mt-6 rounded-2xl border border-[var(--brand-border)] bg-white p-4 text-center">
          <p className="text-sm font-semibold text-[var(--brand-ink)]">
            {t.noCard}
          </p>
          <p className="mt-1 text-sm text-[var(--brand-muted)]">{t.askSchool}</p>
        </div>
      </div>
    </main>
  );
}

function ErrorNote({ children }) {
  return (
    <p
      role="alert"
      className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
    >
      {children}
    </p>
  );
}

function Centred({ text }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)]">
      <p className="text-sm text-[var(--brand-muted)]">{text}</p>
    </main>
  );
}
