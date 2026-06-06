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
    <header className="sticky top-0 z-50 border-b border-[var(--brand-border)] bg-white/95 backdrop-blur-xl">
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
          className="hidden h-11 min-w-0 flex-1 items-center gap-3 rounded-lg border border-[var(--brand-border)] bg-[#f8f9fd] px-4 text-sm text-[var(--brand-muted)] md:flex"
        >
          <FaSearch />
          <input
            name="q"
            type="search"
            placeholder={searchPlaceholder}
            className="h-full min-w-0 flex-1 border-0 bg-transparent text-sm font-medium outline-none placeholder:text-[#9aa3b5]"
          />
        </form>

        <div className="ml-auto hidden items-center gap-3 md:flex">
          <Link
            href="/login"
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[var(--brand-border)] bg-white px-5 text-sm font-semibold text-[var(--brand-primary)] transition hover:bg-[var(--brand-primary-soft)]"
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="public-primary-action inline-flex min-h-10 items-center justify-center rounded-lg bg-[var(--brand-primary)] px-5 text-sm font-semibold text-white shadow-[var(--button-shadow)] transition hover:bg-[var(--brand-primary-hover)]"
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
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--brand-border)] bg-white text-[var(--brand-ink)]"
          >
            {isOpen ? <FaTimes /> : <FaBars />}
          </button>
        </div>
      </div>

      <div className="px-4 pb-3 md:hidden">
        <form
          action="/student-voices"
          className="flex h-11 items-center gap-3 rounded-lg border border-[var(--brand-border)] bg-[#f8f9fd] px-4 text-sm text-[var(--brand-muted)]"
        >
          <FaSearch />
          <input
            name="q"
            type="search"
            placeholder={searchPlaceholder}
            className="min-w-0 flex-1 border-0 bg-transparent text-sm font-medium outline-none placeholder:text-[#9aa3b5]"
          />
        </form>
      </div>

      {isOpen && (
        <div id="public-mobile-menu" className="border-t border-[var(--brand-border)] px-4 pb-4 md:hidden">
          <div className="mt-3 grid gap-1 rounded-xl border border-[var(--brand-border)] bg-[#f8f9fd] p-2">
            {MOBILE_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = active === item.key;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex min-h-11 items-center gap-3 rounded-lg px-4 text-sm font-semibold ${
                    isActive
                      ? "bg-white text-[var(--brand-primary)] shadow-sm"
                      : "text-[var(--brand-ink)] hover:bg-white"
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
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--brand-border)] bg-white text-sm font-semibold text-[var(--brand-primary)]"
              >
                Log in
              </Link>
              <Link
                href="/register"
                onClick={() => setIsOpen(false)}
                className="public-primary-action inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--brand-primary)] text-sm font-semibold text-white"
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
