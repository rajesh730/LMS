"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FaBookOpen,
  FaCalendarAlt,
  FaFeatherAlt,
  FaGlobe,
  FaSchool,
} from "react-icons/fa";

const STUDENT_SHORTCUTS = [
  {
    label: "School Wall",
    href: "/student/school-wall",
    match: "/student/school-wall",
    icon: FaSchool,
  },
  {
    label: "Magazine",
    href: "/student/magazine",
    match: "/student/magazine",
    icon: FaBookOpen,
  },
  {
    label: "Global Wall",
    href: "/student/global-wall",
    match: "/student/global-wall",
    icon: FaGlobe,
  },
  {
    label: "My Writing",
    href: "/student/writing",
    match: "/student/writing",
    icon: FaFeatherAlt,
  },
  {
    label: "Events",
    href: "/student/events",
    match: "/student/events",
    icon: FaCalendarAlt,
  },
];

export default function StudentQuickNav({ className = "" }) {
  const pathname = usePathname() || "";

  return (
    <nav
      className={`student-quick-nav ${className}`}
      aria-label="Student quick navigation"
    >
      {STUDENT_SHORTCUTS.map((item) => {
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
