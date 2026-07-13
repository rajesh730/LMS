import Link from "next/link";
import PublicSiteNav from "@/components/public/PublicSiteNav";

export const SUPPORT_EMAIL =
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "paudel.shiwam@gmail.com";

export function InfoSection({ title, children }) {
  return (
    <section className="rounded-xl border border-[#e6eaf7] bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-black text-[#17120a]">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-7 text-[#52657d] [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-[#17120a]">
        {children}
      </div>
    </section>
  );
}

export default function InfoPageShell({
  active = "home",
  eyebrow,
  title,
  intro,
  updated,
  children,
}) {
  return (
    <main className="min-h-screen bg-[#f8f9fd] pb-20 text-[#17120a]">
      <PublicSiteNav active={active} />
      <div className="mx-auto max-w-3xl space-y-5 px-4 py-8 sm:px-6">
        <header>
          <p className="text-[11px] font-black uppercase tracking-wide text-[#1f4e79]">
            {eyebrow}
          </p>
          <h1 className="mt-2 text-3xl font-black leading-tight md:text-4xl">
            {title}
          </h1>
          {intro && (
            <p className="mt-3 text-sm leading-7 text-[#52657d]">{intro}</p>
          )}
          {updated && (
            <p className="mt-2 text-xs font-semibold text-[#8a9ab1]">
              Last updated: {updated}
            </p>
          )}
        </header>

        {children}

        <footer className="flex flex-wrap gap-x-5 gap-y-2 border-t border-[#e6eaf7] pt-5 text-xs font-bold text-[#52657d]">
          <Link href="/privacy" className="hover:text-[#1f4e79]">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-[#1f4e79]">
            Terms of Use
          </Link>
          <Link href="/contact" className="hover:text-[#1f4e79]">
            Contact
          </Link>
          <span className="ml-auto">&copy; 2026 Pravyo</span>
        </footer>
      </div>
    </main>
  );
}
