import Link from "next/link";
import { FaArrowLeft, FaCompass, FaHome } from "react-icons/fa";

export default function NotFound() {
  return (
    <main className="pratyo-page-shell flex min-h-screen items-center justify-center px-4 py-16">
      <div className="pratyo-card mx-auto max-w-lg p-8 text-center sm:p-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-xl bg-[var(--brand-primary-soft)] text-2xl text-[var(--brand-primary)]">
          <FaCompass />
        </div>
        <p className="pratyo-eyebrow mt-6">Page not found</p>
        <h1 className="pratyo-heading mt-3 text-3xl">This page does not exist</h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-[var(--brand-muted)]">
          The link may be outdated, the page may have moved, or the address may
          be incorrect.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="pratyo-btn-primary inline-flex items-center gap-2 rounded-lg bg-[var(--brand-primary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--brand-primary-hover)]"
          >
            <FaHome />
            Go to homepage
          </Link>
          <Link
            href="/events"
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--brand-border)] bg-white px-5 py-3 text-sm font-semibold text-[var(--brand-ink)] transition hover:bg-[var(--brand-primary-soft)]"
          >
            <FaArrowLeft />
            Browse events
          </Link>
        </div>
      </div>
    </main>
  );
}
