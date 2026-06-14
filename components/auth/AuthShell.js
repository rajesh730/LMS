import Link from "next/link";
import PravyoLogo from "@/components/brand/PravyoLogo";

const DEFAULT_LINKS = [
  { href: "/events", label: "Events" },
  { href: "/schools", label: "Schools" },
];

export function AuthTopBar({ links = DEFAULT_LINKS }) {
  return (
    <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-5">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand-primary)] transition hover:opacity-80"
      >
        <span aria-hidden="true">←</span> Back to home
      </Link>
      <div className="flex flex-wrap gap-2 text-sm">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={
              link.highlight
                ? "inline-flex min-h-9 items-center rounded-lg border border-[var(--brand-primary-border)] bg-[var(--brand-primary-soft)] px-3 font-semibold text-[var(--brand-primary)] transition hover:bg-white"
                : "inline-flex min-h-9 items-center rounded-lg border border-[var(--brand-border)] bg-white px-3 font-semibold text-[#27344a] transition hover:bg-[var(--brand-primary-soft)]"
            }
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function AuthCard({ title, description, children, footer }) {
  return (
    <div className="auth-mobile-card pravyo-card w-full max-w-md rounded-2xl p-8">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--brand-primary-soft)]">
          <PravyoLogo variant="icon" compact />
        </div>
        {title && (
          <h1 className="pravyo-heading text-2xl text-[var(--brand-ink)]">{title}</h1>
        )}
        {description && (
          <p className="mt-2 text-sm leading-6 text-[var(--brand-muted)]">{description}</p>
        )}
      </div>
      {children}
      {footer && <div className="mt-6 border-t border-[var(--brand-border)] pt-5">{footer}</div>}
    </div>
  );
}

export default function AuthShell({ links, title, description, children, footer }) {
  return (
    <div className="pravyo-page-shell">
      <AuthTopBar links={links} />
      <div className="flex items-center justify-center px-0 pb-12 sm:px-4">
        <AuthCard title={title} description={description} footer={footer}>
          {children}
        </AuthCard>
      </div>
    </div>
  );
}

export function AuthSessionPanel({ role, name, email }) {
  return (
    <div className="rounded-xl border border-[var(--brand-border)] bg-[var(--brand-primary-soft)]/40 p-4 text-left">
      <p className="pravyo-eyebrow">Current account</p>
      <p className="mt-2 text-sm font-semibold text-[var(--brand-ink)]">
        {role || "Signed-in account"}
      </p>
      {name && <p className="mt-1 text-sm text-[var(--brand-muted)]">{name}</p>}
      {email && <p className="mt-1 text-xs text-[var(--brand-muted)]">{email}</p>}
    </div>
  );
}
