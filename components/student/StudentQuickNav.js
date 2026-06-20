"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { STUDENT_QUICK_NAV_LINKS } from "@/components/student/studentNavigation";

export default function StudentQuickNav({ className = "" }) {
  const pathname = usePathname() || "";

  return (
    <nav
      className={`student-quick-nav ${className}`}
      aria-label="Student quick navigation"
    >
      {STUDENT_QUICK_NAV_LINKS.map((item) => {
        const Icon = item.icon;
        const active = pathname.startsWith(item.match);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`student-quick-nav-link ${active ? "is-active" : ""}`}
            aria-label={item.label}
            title={item.label}
          >
            <Icon />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
