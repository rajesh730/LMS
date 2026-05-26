"use client";

import Link from "next/link";
import { useState } from "react";
import {
  FaBars,
  FaCalendarAlt,
  FaInfoCircle,
  FaSearch,
  FaSchool,
  FaTimes,
} from "react-icons/fa";
import PratyoLogo from "@/components/brand/PratyoLogo";

const TOP_NAV_ITEMS = [
  { label: "Explore", href: "/", key: "home" },
  { label: "Schools", href: "/schools", key: "schools" },
  { label: "Events", href: "/events", key: "events" },
  { label: "Writings", href: "/challenges", key: "writings" },
  { label: "Achievements", href: "/events", key: "achievements" },
  { label: "Partners", href: "/partners", key: "partners" },
  { label: "About Us", href: "/", key: "about" },
];

export default function PublicSiteNav({ active = "home" }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <nav
        className="sticky top-0 z-50 border-b border-[#e6eaf7] bg-white/95 shadow-sm backdrop-blur-xl"
      >
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 rounded-lg pr-2 text-[#0a2f66] transition hover:text-[#123f82]"
            >
              <PratyoLogo variant="icon" compact withSurface />
              <span className="block">
                <span
                  className="block text-sm font-black uppercase text-[#17120a]"
                >
                  Pratyo
                </span>
                <span className="block text-[11px] font-semibold text-[#52657d]">
                  Student Talent Platform
                </span>
              </span>
            </Link>
          </div>

          <div className="hidden min-w-0 flex-1 justify-end gap-3 md:flex">
            <label className="hidden min-h-10 w-72 items-center gap-2 rounded-lg border border-[#dfe4f2] bg-white px-3 text-sm text-[#52657d] xl:flex">
              <input
                type="search"
                placeholder="Search events, schools..."
                className="min-w-0 flex-1 bg-transparent outline-none"
              />
              <FaSearch />
            </label>
            <Link
              href="/login"
              className="rounded-lg border border-purple-200 bg-white px-5 py-2 text-sm font-black text-purple-700 transition hover:bg-purple-50"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-lg bg-purple-700 px-5 py-2 text-sm font-black text-white transition hover:bg-purple-600"
            >
              Register
            </Link>
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <Link
              href="/schools"
              className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-full border border-[#d7cdbb] text-[#0a2f66] transition hover:bg-[#f8fbff]"
              aria-label="Explore schools"
            >
              <FaSchool />
            </Link>
            <Link
              href="/partners"
              className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-full border border-[#d7cdbb] text-[#0a2f66] transition hover:bg-[#f8fbff]"
              aria-label="Explore partners"
            >
              <FaInfoCircle />
            </Link>
            <button
              type="button"
              onClick={() => setIsOpen((value) => !value)}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-[#d7cdbb] text-[#0a2f66] transition hover:bg-[#f8fbff]"
              aria-expanded={isOpen}
              aria-controls="public-mobile-nav"
              aria-label={
                isOpen ? "Close public navigation" : "Open public navigation"
              }
            >
              {isOpen ? <FaTimes /> : <FaBars />}
            </button>
          </div>
        </div>

        {isOpen && (
          <div
            id="public-mobile-nav"
            className="border-t border-[#d7cdbb] px-4 pb-4 md:hidden"
          >
            <div
              className="grid gap-2 rounded-2xl bg-[#f8fbff] p-2"
            >
              {TOP_NAV_ITEMS.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex min-h-11 items-center rounded-xl px-4 text-sm font-black transition ${
                    active === item.key
                      ? "bg-purple-50 text-purple-700"
                      : "text-[#24314d] hover:bg-white"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Link
                  href="/login"
                  onClick={() => setIsOpen(false)}
                  className="flex min-h-12 items-center justify-center rounded-xl border border-[#d7cdbb] text-sm font-semibold text-[#0a2f66] transition hover:bg-white"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  onClick={() => setIsOpen(false)}
                  className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#2f7fdb] text-sm font-bold text-white transition hover:bg-[#123f82]"
                >
                  <FaCalendarAlt />
                  Register
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>
    </>
  );
}
