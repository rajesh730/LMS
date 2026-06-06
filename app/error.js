"use client";

import { useEffect } from "react";
import Link from "next/link";
import { FaExclamationTriangle, FaHome, FaRedo } from "react-icons/fa";
import Button from "@/components/ui/Button";

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error("App error boundary caught an error:", error);
  }, [error]);

  return (
    <main className="pratyo-page-shell flex min-h-screen items-center justify-center px-4 py-16">
      <div className="pratyo-card mx-auto max-w-lg border-red-200 p-8 sm:p-10">
        <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-red-50 text-2xl text-red-600">
          <FaExclamationTriangle />
        </div>
        <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-red-600">
          Something went wrong
        </p>
        <h1 className="pratyo-heading mt-3 text-3xl">This screen could not load</h1>
        <p className="mt-4 text-sm leading-6 text-[var(--brand-muted)]">
          The app hit an unexpected problem. You can try again, or return to
          the homepage and continue from there.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button onClick={reset} className="inline-flex gap-2">
            <FaRedo />
            Try again
          </Button>
          <Link
            href="/"
            className="pratyo-btn pratyo-btn-secondary inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--brand-border)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--brand-ink)] no-underline transition hover:bg-[var(--brand-primary-soft)]"
          >
            <FaHome />
            Back to homepage
          </Link>
        </div>
      </div>
    </main>
  );
}
