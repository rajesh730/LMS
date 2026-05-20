import Link from "next/link";
import { FaArrowLeft, FaCompass, FaHome } from "react-icons/fa";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#071833] px-4 py-16 text-white">
      <div className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-slate-950/50 p-8 text-center shadow-2xl shadow-black/20 sm:p-12">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-[#ffb21c]/10 text-3xl text-[#ffb21c]">
          <FaCompass />
        </div>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.3em] text-[#8fc4ff]">
          Page not found
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
          This page does not exist
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">
          The link may be outdated, the page may have moved, or the address may
          be incorrect. Let&apos;s get you back to the main product.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg bg-[#ffb21c] px-5 py-3 font-bold text-[#0a2f66] transition hover:bg-[#ffc44d]"
          >
            <FaHome />
            Go to homepage
          </Link>
          <Link
            href="/events"
            className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-5 py-3 font-bold text-white transition hover:bg-white/10"
          >
            <FaArrowLeft />
            Browse public events
          </Link>
        </div>
      </div>
    </main>
  );
}
