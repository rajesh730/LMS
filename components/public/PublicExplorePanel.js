"use client";

import Link from "next/link";
import {
  FaCalendarAlt,
  FaHandshake,
  FaHome,
  FaPenNib,
  FaSchool,
  FaTrophy,
} from "react-icons/fa";

export const PUBLIC_EXPLORE_ITEMS = [
  { label: "Home", href: "/", key: "home", icon: FaHome },
  { label: "Student Voices", href: "/student-voices", key: "student-voices", icon: FaPenNib },
  { label: "Winners", href: "/winners", key: "winners", icon: FaTrophy },
  { label: "Schools", href: "/schools", key: "schools", icon: FaSchool },
  { label: "Events", href: "/events", key: "events", icon: FaCalendarAlt },
  { label: "Partners", href: "/partners", key: "partners", icon: FaHandshake },
];

function SidebarLink({ item, active }) {
  const Icon = item.icon;
  const isActive = active === item.key;

  return (
    <Link
      href={item.href}
      aria-current={isActive ? "page" : undefined}
      className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-black transition ${
        isActive
          ? "public-nav-active bg-[#4326e8] text-white"
          : "text-[#17213a] hover:bg-[#f4f1ff] hover:text-[#4326e8]"
      }`}
    >
      <Icon className={isActive ? "text-white" : "text-[#526071]"} />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
    </Link>
  );
}

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
          <SidebarLink key={item.key} item={item} active={active} />
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
      </div>
    </aside>
  );
}
