"use client";

import Link from "next/link";
import { PUBLIC_NAV_LINKS } from "@/components/navigation/appNavigation";

/**
 * The phone navigation bar — icons pinned to the bottom, the way a native app
 * puts its primary destinations in thumb reach.
 *
 * Only the four browsing destinations live here (Home, Schools, Events,
 * Winners). Login and Register are deliberately excluded: a tab bar is for
 * places you move BETWEEN, not one-time actions, and an account button sitting
 * permanently on screen for a signed-in user is noise. Those stay in the header.
 *
 * Hidden from `xl` up, where the existing horizontal nav takes over — this is
 * additive, so the desktop layout is untouched.
 */
export default function MobileTabBar({ active = "home" }) {
  return (
    <nav
      aria-label="Primary"
      className="pravyo-tabbar fixed inset-x-0 bottom-0 z-50 xl:hidden"
    >
      <ul className="flex items-stretch justify-around">
        {PUBLIC_NAV_LINKS.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.key;

          return (
            <li key={item.key} className="flex-1">
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`pravyo-tabbar-link ${isActive ? "is-active" : ""}`}
              >
                <Icon aria-hidden="true" className="pravyo-tabbar-icon" />
                <span className="pravyo-tabbar-label">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
