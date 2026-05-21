"use client";

import Link from "next/link";
import { useState } from "react";
import { FaBars, FaCalendarAlt, FaTimes } from "react-icons/fa";
import PratyoLogo from "@/components/brand/PratyoLogo";

export default function PublicSiteNav() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="pratyo-dark-shell sticky top-0 z-50 border-b shadow-lg shadow-black/20 backdrop-blur-xl">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 rounded-lg pr-2 text-white transition hover:text-[#f6fbff]"
          >
            <PratyoLogo variant="icon" compact withSurface />
            <span className="hidden sm:block">
              <span className="pratyo-muted block text-xs font-bold uppercase tracking-[0.16em]">
                Pratyo
              </span>
              <span className="block text-sm font-bold">Public Hub</span>
            </span>
          </Link>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <Link
            href="/login"
            className="rounded-full border border-[#2f7fdb]/30 px-3 py-2 text-sm font-semibold text-[#eef5ff] transition hover:bg-white/10"
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

        <button
          type="button"
          onClick={() => setIsOpen((value) => !value)}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-white/15 text-white transition hover:bg-white/10 md:hidden"
          aria-expanded={isOpen}
          aria-controls="public-mobile-nav"
          aria-label={
            isOpen ? "Close public navigation" : "Open public navigation"
          }
        >
          {isOpen ? <FaTimes /> : <FaBars />}
        </button>
      </div>

      {isOpen && (
        <div
          id="public-mobile-nav"
          className="border-t border-white/10 px-4 pb-4 md:hidden"
        >
          <div className="grid gap-2 rounded-2xl bg-white/10 p-2">
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Link
                href="/login"
                onClick={() => setIsOpen(false)}
                className="flex min-h-12 items-center justify-center rounded-xl border border-white/15 text-sm font-semibold text-[#eef5ff] transition hover:bg-white/10"
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
  );
}
