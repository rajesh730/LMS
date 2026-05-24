"use client";

import Link from "next/link";
import { useState } from "react";
import {
  FaBars,
  FaCalendarAlt,
  FaHandshake,
  FaHome,
  FaSearch,
  FaSchool,
  FaTimes,
  FaUsers,
} from "react-icons/fa";
import PratyoLogo from "@/components/brand/PratyoLogo";

const EXPLORE_ITEMS = [
  { label: "Home", href: "/", key: "home", icon: FaHome },
  { label: "Events", href: "/events", key: "events", icon: FaCalendarAlt },
  { label: "Schools", href: "/schools", key: "schools", icon: FaSchool },
  { label: "Partners", href: "/partners", key: "partners", icon: FaHandshake },
  { label: "Register", href: "/register", key: "register", icon: FaUsers },
];

function ExploreDock({ active }) {
  const showDesktopDock = active !== "home";

  return (
    <>
      <div
        className={
          showDesktopDock
            ? "pointer-events-none fixed left-4 top-1/2 z-40 hidden -translate-y-1/2 xl:block"
            : "hidden"
        }
      >
        <div className="pointer-events-auto rounded-[28px] border border-[#d7cdbb] bg-white/95 p-3 shadow-xl shadow-slate-950/10 backdrop-blur-xl">
          <p className="px-4 pb-2 text-[10px] font-black uppercase tracking-[0.22em] text-[#52657d]">
            Explore
          </p>
          <div className="space-y-1">
            {EXPLORE_ITEMS.map(({ label, href, key, icon: Icon }) => {
              const isActive = active === key;
              return (
                <Link
                  key={key}
                  href={href}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex min-h-11 items-center gap-3 rounded-2xl px-4 text-sm font-black transition ${
                    isActive
                      ? "bg-[#eaf2ff] text-[#0a2f66]"
                      : "text-[#27344a] hover:bg-[#f8fbff] hover:text-[#0a2f66]"
                  }`}
                >
                  <Icon className="text-[#0a2f66]" />
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-3 z-40 px-3 md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5 rounded-[24px] border border-[#d7cdbb] bg-white/95 p-2 shadow-2xl shadow-slate-950/20 backdrop-blur-xl">
          {EXPLORE_ITEMS.map(({ label, href, key, icon: Icon }) => {
            const isActive = active === key;
            return (
              <Link
                key={key}
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-2xl text-[10px] font-black transition ${
                  isActive
                    ? "bg-[#0a2f66] text-white"
                    : "text-[#52657d] hover:bg-[#eaf2ff] hover:text-[#0a2f66]"
                }`}
              >
                <Icon className={isActive ? "text-white" : "text-[#0a2f66]"} />
                <span className="max-w-full truncate">{label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}

export default function PublicSiteNav({ active = "home" }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <nav
        className="sticky top-0 z-50 border-b border-[#d7cdbb] bg-white/95 shadow-sm backdrop-blur-xl"
      >
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 rounded-lg pr-2 text-[#0a2f66] transition hover:text-[#123f82]"
            >
              <PratyoLogo variant="icon" compact withSurface />
              <span className="block">
                <span
                  className="block text-[10px] font-bold uppercase tracking-[0.16em] text-[#52657d]"
                >
                  Pratyo
                </span>
                <span className="block text-sm font-bold">Public Hub</span>
              </span>
            </Link>
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <Link
              href="/login"
              className="rounded-full border border-[#d7cdbb] bg-white px-3 py-2 text-sm font-black text-[#0a2f66] transition hover:bg-[#eaf2ff]"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-full bg-[#2f7fdb] px-3 py-2 text-sm font-bold text-white transition hover:bg-[#123f82]"
            >
              <FaCalendarAlt />
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
              <FaSearch />
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

      <ExploreDock active={active} />
    </>
  );
}
