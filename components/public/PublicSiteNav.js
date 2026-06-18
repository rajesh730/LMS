"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import {
  FaBars,
  FaCalendarAlt,
  FaHome,
  FaSchool,
  FaSearch,
  FaTimes,
  FaTrophy,
} from "react-icons/fa";
import PravyoLogo from "@/components/brand/PravyoLogo";

const NAV_ITEMS = [
  { label: "Home",     href: "/",        key: "home",     icon: FaHome },
  { label: "Schools",  href: "/schools",  key: "schools",  icon: FaSchool },
  { label: "Events",   href: "/events",   key: "events",   icon: FaCalendarAlt },
  { label: "Winners",  href: "/winners",  key: "winners",  icon: FaTrophy },
];

export default function PublicSiteNav({
  active = "home",
  searchPlaceholder = "Search stories, schools, events…",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Add shadow on scroll
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close on escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") setIsOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Prevent body scroll when menu open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  return (
    <>
      <header
        id="public-site-header"
        className="sticky top-0 z-50 border-b border-[var(--brand-border)] bg-white/96 backdrop-blur-xl"
        style={{
          boxShadow: scrolled
            ? "0 2px 20px rgba(67,38,232,0.07), 0 1px 4px rgba(16,20,47,0.05)"
            : "none",
          transition: "box-shadow 200ms ease",
        }}
      >
        {/* ── Main bar ─────────────────────────────────────── */}
        <div className="mx-auto flex h-14 max-w-[1500px] items-center gap-3 px-2 sm:h-16 sm:px-6 md:gap-4">

          {/* Logo */}
          <Link
            href="/"
            onClick={() => setIsOpen(false)}
            className="flex shrink-0 items-center gap-2.5"
          >
            <PravyoLogo variant="icon" compact imageClassName="h-9 w-9" />
            <span className="hidden text-[15px] font-bold text-[var(--brand-ink)] sm:block">
              Pravyo
            </span>
          </Link>

          {/* Desktop navigation links */}
          <nav
            aria-label="Main navigation"
            className="hidden items-center gap-0.5 md:flex"
          >
            {NAV_ITEMS.map((item) => {
              const isActive = active === item.key;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`public-nav-link${isActive ? " active" : ""}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Desktop search */}
          <form
            action="/student-voices"
            className="hidden h-10 flex-1 items-center gap-2.5 rounded-xl border border-[var(--brand-border)] bg-[#f8f9fd] px-3.5 text-sm text-[var(--brand-muted)] transition hover:border-[var(--brand-primary-border)] focus-within:border-[var(--brand-primary)] focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(67,38,232,0.1)] xl:flex"
          >
            <FaSearch className="shrink-0 text-[var(--brand-muted)]" />
            <input
              name="q"
              type="search"
              placeholder={searchPlaceholder}
              className="h-full min-w-0 flex-1 border-0 bg-transparent text-sm font-medium text-[var(--brand-ink)] outline-none placeholder:text-[#9aa3b5]"
            />
          </form>

          {/* Desktop CTA buttons */}
          <div className="ml-auto hidden items-center gap-2 md:flex">
            <Link
              href="/login"
              className="inline-flex h-9 items-center justify-center rounded-lg border border-[var(--brand-border)] bg-white px-4 text-sm font-semibold text-[var(--brand-primary)] transition hover:border-[var(--brand-primary-border)] hover:bg-[var(--brand-primary-soft)]"
            >
              Log in
            </Link>
            <Link
              href="/register"
              className="public-primary-action inline-flex h-9 items-center justify-center rounded-lg bg-[var(--brand-primary)] px-4 text-sm font-semibold text-white shadow-[var(--button-shadow)] transition hover:bg-[var(--brand-primary-hover)]"
            >
              Register
            </Link>
          </div>

          {/* Mobile: search + hamburger */}
          <div className="ml-auto flex items-center gap-2 md:hidden">
            {/* Compact search pill */}
            <form
              action="/student-voices"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--brand-border)] bg-[#f8f9fd] text-[var(--brand-muted)] sm:hidden"
            >
              <button type="submit" aria-label="Search">
                <FaSearch className="text-sm" />
              </button>
            </form>

            {/* Hamburger */}
            <button
              type="button"
              onClick={() => setIsOpen((v) => !v)}
              aria-expanded={isOpen}
              aria-controls="public-mobile-menu"
              aria-label={isOpen ? "Close menu" : "Open menu"}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--brand-border)] bg-white text-[var(--brand-ink)] transition hover:bg-[var(--brand-primary-soft)] hover:text-[var(--brand-primary)]"
            >
              <span
                className="block transition-transform duration-200"
                style={{ transform: isOpen ? "rotate(90deg)" : "none" }}
              >
                {isOpen ? <FaTimes className="text-sm" /> : <FaBars className="text-sm" />}
              </span>
            </button>
          </div>
        </div>

        {/* ── Mobile search bar (always visible on sm) ──── */}
        <div className="public-mobile-search-wrap border-t border-[var(--brand-border)] px-2 py-2.5 sm:hidden">
          <form
            action="/student-voices"
            className="public-mobile-search-form flex h-10 items-center gap-2.5 rounded-xl border border-[var(--brand-border)] bg-[#f8f9fd] px-3.5 text-sm text-[var(--brand-muted)] focus-within:border-[var(--brand-primary)] focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(67,38,232,0.1)]"
          >
            <FaSearch className="shrink-0" />
            <input
              name="q"
              type="search"
              placeholder={searchPlaceholder}
              className="min-w-0 flex-1 border-0 bg-transparent text-sm font-medium text-[var(--brand-ink)] outline-none placeholder:text-[#9aa3b5]"
            />
          </form>
        </div>

        {/* ── Mobile dropdown menu ────────────────────────── */}
        {isOpen && (
          <div
            id="public-mobile-menu"
            className="public-mobile-menu border-t border-[var(--brand-border)] bg-white px-2 pb-5 pt-3 md:hidden"
          >
            {/* Nav links grid */}
            <div className="grid gap-1 rounded-2xl border border-[var(--brand-border)] bg-[#f8f9fd] p-2">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = active === item.key;
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`flex min-h-11 items-center gap-3 rounded-xl px-4 text-sm font-semibold transition-all duration-150 ${
                      isActive
                        ? "public-nav-active bg-[var(--brand-primary)] text-white shadow-sm"
                        : "text-[var(--brand-ink)] hover:bg-white hover:text-[var(--brand-primary)]"
                    }`}
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs ${
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]"
                      }`}
                    >
                      <Icon />
                    </span>
                    {item.label}
                  </Link>
                );
              })}
            </div>

            {/* Auth buttons */}
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <Link
                href="/login"
                onClick={() => setIsOpen(false)}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--brand-border)] bg-white text-sm font-semibold text-[var(--brand-primary)] transition hover:border-[var(--brand-primary-border)] hover:bg-[var(--brand-primary-soft)]"
              >
                Log in
              </Link>
              <Link
                href="/register"
                onClick={() => setIsOpen(false)}
                className="public-primary-action inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--brand-primary)] text-sm font-semibold text-white shadow-[var(--button-shadow)] transition hover:bg-[var(--brand-primary-hover)]"
              >
                Register
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          style={{ background: "rgba(16,20,47,0.25)", backdropFilter: "blur(4px)" }}
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  );
}
