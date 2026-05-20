"use client";

import { useEffect } from "react";
import Link from "next/link";
import { FaExclamationTriangle, FaHome, FaRedo } from "react-icons/fa";

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error("App error boundary caught an error:", error);
  }, [error]);

  return (
    <main className="min-h-screen bg-[#071833] px-4 py-16 text-white">
      <div className="mx-auto max-w-3xl rounded-3xl border border-red-500/20 bg-slate-950/55 p-8 shadow-2xl shadow-black/20 sm:p-12">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-red-500/10 text-3xl text-red-300">
          <FaExclamationTriangle />
        </div>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.3em] text-red-200">
          Something went wrong
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
          This screen could not load
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
          The app hit an unexpected problem. You can try again, or return to
          the homepage and continue from there.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#ffb21c] px-5 py-3 font-bold text-[#0a2f66] transition hover:bg-[#ffc44d]"
          >
            <FaRedo />
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 px-5 py-3 font-bold text-white transition hover:bg-white/10"
          >
            <FaHome />
            Back to homepage
          </Link>
        </div>
      </div>
    </main>
  );
}
