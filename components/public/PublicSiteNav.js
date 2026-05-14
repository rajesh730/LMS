import Link from "next/link";
import { FaCalendarAlt, FaHome } from "react-icons/fa";
import PratyoLogo from "@/components/brand/PratyoLogo";

export default function PublicSiteNav({ active = "" }) {
  const navItems = [
    { href: "/events", label: "Events", key: "events" },
    { href: "/schools", label: "Schools", key: "schools" },
    { href: "/partners", label: "Partners", key: "partners" },
  ];

  return (
    <nav className="sticky top-0 z-50 border-b border-[#16396d] bg-[#081b39]/90 backdrop-blur-xl">
      <div className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-lg pr-2 text-white transition hover:text-[#f6fbff]"
          >
            <PratyoLogo variant="icon" compact withSurface />
            <span className="hidden sm:block">
              <span className="block text-xs font-black uppercase tracking-[0.3em] text-[#8fc4ff]">
                Pratyo
              </span>
              <span className="block text-sm font-semibold text-white">
                Public Hub
              </span>
            </span>
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/"
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
              active === "home"
                ? "bg-[#ffb21c] text-[#0a2f66]"
                : "text-[#d2e3ff] hover:bg-[#0f2953] hover:text-white"
            }`}
          >
            <FaHome />
            Platform
          </Link>
          {navItems.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                active === item.key
                  ? "bg-[#ffb21c] text-[#0a2f66]"
                  : "text-[#d2e3ff] hover:bg-[#0f2953] hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/login"
            className="rounded-lg border border-[#16396d] px-3 py-2 text-sm font-semibold text-[#eef5ff] transition hover:bg-[#0f2953]"
          >
            Login
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-lg bg-[#ffb21c] px-3 py-2 text-sm font-black text-[#0a2f66] transition hover:bg-[#ffc44d]"
          >
            <FaCalendarAlt />
            Register
          </Link>
        </div>
      </div>
    </nav>
  );
}
