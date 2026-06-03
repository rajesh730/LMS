"use client";

import Link from "next/link";
import { useState } from "react";
import {
  FaBars,
  FaCalendarAlt,
  FaHandshake,
  FaHome,
  FaSchool,
  FaSearch,
  FaTimes,
  FaTrophy,
} from "react-icons/fa";
import PratyoLogo from "@/components/brand/PratyoLogo";

const MOBILE_ITEMS = [
  { label: "Home", href: "/", key: "home", icon: FaHome },
  { label: "Winners", href: "/winners", key: "winners", icon: FaTrophy },
  { label: "Schools", href: "/schools", key: "schools", icon: FaSchool },
  { label: "Events", href: "/events", key: "events", icon: FaCalendarAlt },
  { label: "Partners", href: "/partners", key: "partners", icon: FaHandshake },
];

export default function PublicSiteNav({ active = "home", searchPlaceholder = "Search stories, schools, events..." }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-[#eceef8] bg-white/95 backdrop-blur-xl">
      <div className="mx-auto flex min-h-16 max-w-[1500px] items-center gap-4 px-4 py-3 sm:px-6">
        <Link
          href="/"
          onClick={() => setIsOpen(false)}
          className="flex min-w-0 shrink-0 items-center gap-3"
        >
          <PratyoLogo variant="icon" compact imageClassName="h-10 w-10" />
        </Link>

        <form
          action="/student-voices"
          className="hidden h-11 min-w-0 flex-1 items-center gap-3 rounded-xl bg-[#f4f5fb] px-4 text-sm text-[#526071] md:flex"
        >
          <FaSearch className="text-[#526071]" />
          <input
            name="q"
            type="search"
            placeholder={searchPlaceholder}
            className="h-full min-w-0 flex-1 border-0 bg-transparent text-sm font-semibold outline-none placeholder:text-[#7a8499]"
          />
        </form>

        <div className="ml-auto hidden items-center gap-3 md:flex">
          <Link
            href="/login"
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[#d9dcf2] bg-white px-6 text-sm font-black text-[#4326e8] transition hover:bg-[#f8f7ff]"
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="public-primary-action inline-flex min-h-10 items-center justify-center rounded-lg bg-[#4326e8] px-6 text-sm font-black text-white shadow-lg shadow-[#4326e8]/18 transition hover:bg-[#351acb]"
          >
            Register
          </Link>
        </div>

        <div className="ml-auto flex items-center gap-2 md:hidden">
          <button
            type="button"
            onClick={() => setIsOpen((value) => !value)}
            aria-expanded={isOpen}
            aria-controls="public-mobile-menu"
            aria-label={isOpen ? "Close navigation" : "Open navigation"}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#e0e3ef] bg-white text-[#10142f]"
          >
            {isOpen ? <FaTimes /> : <FaBars />}
          </button>
        </div>
      </div>

      <div className="px-4 pb-3 md:hidden">
        <form
          action="/student-voices"
          className="flex h-11 items-center gap-3 rounded-xl bg-[#f4f5fb] px-4 text-sm text-[#526071]"
        >
          <FaSearch />
          <input
            name="q"
            type="search"
            placeholder={searchPlaceholder}
            className="min-w-0 flex-1 border-0 bg-transparent text-sm font-semibold outline-none placeholder:text-[#7a8499]"
          />
        </form>
      </div>

      {isOpen && (
        <div id="public-mobile-menu" className="border-t border-[#eceef8] px-4 pb-4 md:hidden">
          <div className="mt-3 grid gap-2 rounded-2xl bg-[#f8f7ff] p-2">
            {MOBILE_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = active === item.key;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex min-h-11 items-center gap-3 rounded-xl px-4 text-sm font-black ${
                    isActive
                      ? "bg-white text-[#4326e8] shadow-sm"
                      : "text-[#111a35] hover:bg-white"
                  }`}
                >
                  <Icon />
                  {item.label}
                </Link>
              );
            })}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <Link
                href="/login"
                onClick={() => setIsOpen(false)}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#d9dcf2] bg-white text-sm font-black text-[#4326e8]"
              >
                Log in
              </Link>
              <Link
                href="/register"
                onClick={() => setIsOpen(false)}
                className="public-primary-action inline-flex min-h-11 items-center justify-center rounded-xl bg-[#4326e8] text-sm font-black text-white"
              >
                Register
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
