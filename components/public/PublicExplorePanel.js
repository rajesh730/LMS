"use client";

import Link from "next/link";
import { PUBLIC_NAV_LINKS } from "@/components/navigation/appNavigation";
import NavItemLink from "@/components/navigation/NavItemLink";

export const PUBLIC_EXPLORE_ITEMS = PUBLIC_NAV_LINKS;

export function PublicSidebarGroup({
  title = "Explore",
  items = PUBLIC_EXPLORE_ITEMS,
  active = "home",
}) {
  return (
    <section className="rounded-xl border border-[#eceef8] bg-white p-3 shadow-sm">
      <p className="mb-2 px-2 text-[10px] font-black uppercase text-[#7a8499]">
        {title}
      </p>
      <nav className="space-y-1">
        {items.map((item) => (
          <NavItemLink
            key={item.key}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={active === item.key}
            className="font-black"
          />
        ))}
      </nav>
    </section>
  );
}

export default function PublicExplorePanel({ active = "home", groups }) {
  return (
    <aside className="hidden xl:block">
      <div className="sticky top-24">
        {(groups || [{ title: "Public Pages", items: PUBLIC_EXPLORE_ITEMS }]).map(
          (group) => (
            <PublicSidebarGroup
              key={group.title}
              title={group.title}
              items={group.items}
              active={active}
            />
          )
        )}
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 px-3 text-[11px] font-bold text-[#8a9ab1]">
          <Link href="/privacy" className="hover:text-[#1f4e79]">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-[#1f4e79]">
            Terms
          </Link>
          <Link href="/contact" className="hover:text-[#1f4e79]">
            Contact
          </Link>
        </div>
      </div>
    </aside>
  );
}
