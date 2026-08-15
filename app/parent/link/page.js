"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { useParentApp } from "@/components/parent/ParentAppContext";

/**
 * "Connect to Your Child" (§26).
 *
 * What a guardian with no linked child sees — NOT an empty dashboard.
 *
 * There is deliberately no student search on this screen. A parent cannot look
 * up a child by name and attach themselves; the only path is a code the school
 * generated for a specific student. That is the whole safeguarding model, and
 * adding a "find my child" convenience here would undo it.
 */
export default function ParentLinkPage() {
  const { t, reload, childList } = useParentApp();
  const [code, setCode] = useState("");
  const [state, setState] = useState({ loading: false, error: "", success: "" });

  const submit = async (event) => {
    event.preventDefault();
    setState({ loading: true, error: "", success: "" });

    try {
      const res = await fetch("/api/parent/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || t("link.invalid"));

      setState({
        loading: false,
        error: "",
        success: t("link.success", { name: json.data.child.name }),
      });

      // Reload the guardian's children, then enter the app.
      await reload();
      window.location.assign("/parent");
    } catch (err) {
      setState({ loading: false, error: err.message, success: "" });
    }
  };

  return (
    <main className="flex min-h-screen flex-col justify-center bg-[var(--background)] px-5 py-10">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-5xl" aria-hidden="true">
            🔗
          </p>
          <h1 className="mt-3 text-2xl font-bold text-[var(--brand-ink)]">
            {t("link.title")}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[var(--brand-muted)]">
            {t("link.description")}
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label
              htmlFor="code"
              className="block text-sm font-semibold text-[var(--brand-ink)]"
            >
              {t("link.codeLabel")}
            </label>
            <input
              id="code"
              type="text"
              inputMode="text"
              autoCapitalize="characters"
              autoComplete="one-time-code"
              value={code}
              // Uppercased on entry: the code alphabet is uppercase and the
              // server compares case-insensitively, so this just removes a way
              // for the field to look wrong.
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              required
              maxLength={12}
              className="mt-1.5 min-h-[60px] w-full rounded-xl border-2 border-[var(--brand-border)] px-4 text-center font-mono text-2xl tracking-[0.3em] focus:border-[var(--brand-primary)] focus:outline-none"
            />
          </div>

          {state.error ? (
            <p
              role="alert"
              className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
            >
              {state.error}
            </p>
          ) : null}

          {state.success ? (
            <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
              {state.success}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={state.loading || !code.trim()}
            className="min-h-[56px] w-full rounded-xl bg-[var(--brand-primary)] text-base font-bold text-white disabled:opacity-40"
          >
            {state.loading ? t("common.loading") : t("link.submit")}
          </button>
        </form>

        <div className="mt-8 rounded-2xl border border-[var(--brand-border)] bg-white p-4 text-center">
          <p className="text-sm font-semibold text-[var(--brand-ink)]">
            {t("link.contactSchool")}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-[var(--brand-muted)]">
            Ask the school office to send you a guardian invitation. For your
            child&apos;s safety, only the school can connect a parent account.
          </p>
        </div>

        {/* An escape hatch: a guardian who signed into the wrong account must
            be able to get out without clearing cookies. */}
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/parent/login" })}
          className="mt-6 min-h-[44px] w-full text-sm font-semibold text-[var(--brand-muted)]"
        >
          {t("settings.signOut")}
        </button>
      </div>
    </main>
  );
}
