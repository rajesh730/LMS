"use client";

import Link from "next/link";
import {
  FaCalendarAlt,
  FaCertificate,
  FaClock,
  FaEye,
  FaHandshake,
  FaHome,
  FaLightbulb,
  FaMedal,
  FaPenNib,
  FaRegNewspaper,
  FaSchool,
  FaStar,
  FaTrophy,
  FaUsers,
} from "react-icons/fa";

export const PUBLIC_EXPLORE_ITEMS = [
  { label: "Explore", href: "/", key: "home", icon: FaHome },
  { label: "Events", href: "/events", key: "events", icon: FaCalendarAlt },
  { label: "Writings", href: "/challenges", key: "writings", icon: FaPenNib },
  {
    label: "Achievements",
    href: "/events",
    key: "achievements",
    icon: FaCertificate,
  },
  { label: "Schools", href: "/schools", key: "schools", icon: FaSchool },
  { label: "Partners", href: "/partners", key: "partners", icon: FaHandshake },
  { label: "Register", href: "/register", key: "register", icon: FaUsers },
];

const DEFAULT_GROUPS = [
  {
    title: "Explore",
    items: PUBLIC_EXPLORE_ITEMS,
  },
];

const HOME_GROUPS = [
  {
    title: "Explore",
    items: PUBLIC_EXPLORE_ITEMS,
  },
  {
    title: "Discover",
    items: [
      { label: "Featured Responses", href: "#featured", key: "featured", icon: FaStar },
      { label: "Latest Writings", href: "#writings", key: "latest-writings", icon: FaPenNib },
      { label: "Winners", href: "#winners", key: "winners", icon: FaTrophy },
      { label: "School Spotlights", href: "#spotlights", key: "spotlights", icon: FaSchool },
      { label: "Upcoming Events", href: "#upcoming", key: "upcoming", icon: FaClock },
    ],
  },
  {
    title: "Categories",
    items: [
      { label: "Student Talent", href: "#featured", key: "student-talent", icon: FaUsers },
      { label: "Writing", href: "#writings", key: "writing-category", icon: FaRegNewspaper },
      { label: "Achievements", href: "#winners", key: "achievement-category", icon: FaMedal },
      { label: "Schools", href: "#spotlights", key: "school-category", icon: FaSchool },
    ],
  },
];

const SCHOOL_GROUPS = [
  {
    title: "Explore",
    items: PUBLIC_EXPLORE_ITEMS,
  },
  {
    title: "School Profile",
    items: [
      { label: "Overview", href: "#overview", key: "overview", icon: FaSchool },
      { label: "Story", href: "#story", key: "story", icon: FaPenNib },
      { label: "Events", href: "#events", key: "events", icon: FaCalendarAlt },
      {
        label: "Achievements",
        href: "#achievements",
        key: "achievements",
        icon: FaCertificate,
      },
      { label: "Writings", href: "#writings", key: "writings", icon: FaPenNib },
      { label: "Info", href: "#glance", key: "info", icon: FaSchool },
    ],
  },
  {
    title: "Categories",
    items: [
      { label: "Public Story", href: "#story", key: "story-category", icon: FaRegNewspaper },
      { label: "Talent Events", href: "#events", key: "events-category", icon: FaCalendarAlt },
      { label: "Certificates", href: "#achievements", key: "certificates-category", icon: FaCertificate },
      { label: "Student Writings", href: "#writings", key: "writings-category", icon: FaPenNib },
    ],
  },
];

const SCHOOLS_GROUPS = [
  {
    title: "Explore",
    items: PUBLIC_EXPLORE_ITEMS,
  },
  {
    title: "School Views",
    items: [
      { label: "All Schools", href: "#schools", key: "all-schools", icon: FaSchool },
      { label: "Spotlights", href: "#spotlights", key: "spotlights", icon: FaStar },
      { label: "Award Schools", href: "#schools", key: "award-schools", icon: FaTrophy },
      { label: "Event Hosts", href: "#schools", key: "event-hosts", icon: FaCalendarAlt },
    ],
  },
  {
    title: "Categories",
    items: [
      { label: "Public Profiles", href: "#schools", key: "public-profiles", icon: FaEye },
      { label: "Achievements", href: "#schools", key: "school-achievements", icon: FaCertificate },
      { label: "Activities", href: "#schools", key: "school-activities", icon: FaLightbulb },
    ],
  },
];

const PARTNER_GROUPS = [
  {
    title: "Explore",
    items: PUBLIC_EXPLORE_ITEMS,
  },
  {
    title: "Partner Views",
    items: [
      { label: "All Partners", href: "#partners", key: "all-partners", icon: FaHandshake },
      { label: "Event Partners", href: "#partners", key: "event-partners", icon: FaCalendarAlt },
      { label: "Sponsors", href: "#partners", key: "sponsors", icon: FaStar },
      { label: "Media Partners", href: "#partners", key: "media-partners", icon: FaRegNewspaper },
      { label: "Training Partners", href: "#partners", key: "training-partners", icon: FaLightbulb },
    ],
  },
  {
    title: "Categories",
    items: [
      { label: "Competitions", href: "#partners", key: "competitions", icon: FaTrophy },
      { label: "Mentors", href: "#partners", key: "mentors", icon: FaUsers },
      { label: "Sponsors", href: "#partners", key: "sponsors", icon: FaStar },
    ],
  },
];

export function PublicSidebarGroup({ title, items, active }) {
  return (
    <section className="rounded-2xl border border-[#e6eaf7] bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
      <p className="px-1 text-[10px] font-black uppercase text-[#52657d]">
        {title}
      </p>
      <nav className="mt-4 space-y-2">
        {items.map(({ label, href, key, icon: Icon }) => {
          const isActive = active === key;
          return (
            <Link
              key={key}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={`flex min-h-12 items-center gap-3 rounded-xl px-4 text-sm font-black transition ${
                isActive
                  ? "bg-purple-50 text-purple-700"
                  : "text-[#24314d] hover:bg-[#f8fbff] hover:text-purple-700"
              }`}
            >
              <Icon
                className={isActive ? "text-purple-700" : "text-[#0a2f66]"}
              />
              {label}
            </Link>
          );
        })}
      </nav>
    </section>
  );
}

export default function PublicExplorePanel({
  active = "home",
  variant = "default",
  groups,
}) {
  const resolvedGroups =
    groups ||
    (variant === "home"
      ? HOME_GROUPS
      : variant === "school"
      ? SCHOOL_GROUPS
      : variant === "schools"
      ? SCHOOLS_GROUPS
      : variant === "partners"
      ? PARTNER_GROUPS
      : DEFAULT_GROUPS);

  return (
    <aside className="hidden xl:block">
      <div className="sticky top-24 space-y-5">
        {resolvedGroups.map((group) => (
          <PublicSidebarGroup
            key={group.title}
            title={group.title}
            items={group.items}
            active={active}
          />
        ))}
      </div>
    </aside>
  );
}
