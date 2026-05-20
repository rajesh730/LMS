import Link from "next/link";
import { FaCalendarAlt, FaHome } from "react-icons/fa";
import PratyoLogo from "@/components/brand/PratyoLogo";

export default function PublicSiteNav({ active = "" }) {
  const navItems = [
    { href: "/events", label: "Events", key: "events" },
    { href: "/schools", label: "Schools", key: "schools" },
    { href: "/challenges", label: "Pulse", key: "challenges" },
    { href: "/partners", label: "Partners", key: "partners" },
  ];

  return (
    <nav className="pratyo-dark-shell sticky top-0 z-50 border-b shadow-lg shadow-black/20 backdrop-blur-xl">
      <div className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-lg pr-2 text-white transition hover:text-[#f6fbff]"
          >
            <PratyoLogo variant="icon" compact withSurface />
              <span className="hidden sm:block">
              <span className="pratyo-muted block text-xs font-black uppercase tracking-[0.3em]">
                Pratyo
              </span>
              <span className="block text-sm font-semibold">
                Public Hub
              </span>
            </span>
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/"
            className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold transition ${
              active === "home"
                ? "bg-[#2f7fdb] text-white"
                : "text-[#d2e3ff] hover:bg-white/10 hover:text-white"
            }`}
          >
            <FaHome />
            Platform
          </Link>
          {navItems.map((item) => (
            <Link
            key={item.key}
            href={item.href}
              className={`rounded-full px-3 py-2 text-sm font-semibold transition ${
                active === item.key
                  ? "bg-[#2f7fdb] text-white"
                  : "text-[#d2e3ff] hover:bg-white/10 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/login"
            className="rounded-full border border-[#2f7fdb]/30 px-3 py-2 text-sm font-semibold text-[#eef5ff] transition hover:bg-white/10"
          >
            Login
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-full bg-[#2f7fdb] px-3 py-2 text-sm font-black text-white transition hover:bg-[#123f82]"
          >
            <FaCalendarAlt />
            Register
          </Link>
        </div>
      </div>
    </nav>
  );
}
