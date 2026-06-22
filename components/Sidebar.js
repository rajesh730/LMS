"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useEffect } from "react";
import {
  FaSignOutAlt,
  FaSchool,
  FaTimes,
} from "react-icons/fa";
import PravyoLogo from "@/components/brand/PravyoLogo";
import NavItemLink from "@/components/navigation/NavItemLink";
import { getRoleNavigationLinks } from "@/components/navigation/appNavigation";
import useWorkIndicators from "@/lib/useWorkIndicators";

const HREF_INDICATOR_KEYS = {
  "/admin/dashboard?tab=approvals": "admin.approvals",
  "/admin/dashboard?tab=events": "admin.events",
  "/admin/feedback": "admin.feedback",
  "/admin/dashboard?tab=spotlight": "admin.spotlight",
  "/school/dashboard?tab=school-events": "school.schoolEvents",
  "/school/dashboard?tab=platform-events": "school.platformEvents",
  "/school/dashboard?tab=student-notices": "school.studentNotices",
  "/school/dashboard?tab=notices": "school.receivedNotices",
  "/school/dashboard?tab=magazine": "school.magazine",
  "/student/events": "student.events",
  "/student/notices": "student.notices",
  "/student/school-wall": "student.schoolWall",
  "/student/magazine": "student.schoolMagazine",
};

const HREF_SEEN_SURFACES = {};

const SCHOOL_NAV_GROUPS = [
  {
    title: "School Operations",
    names: [
      "Overview",
      "Students",
      "Teachers",
      "School Events",
      "Platform Events",
      "Student Notices",
      "Received Notices",
    ],
  },
  {
    title: "Public Showcase",
    names: ["Publishing Desk", "Public Profile"],
  },
  {
    title: "Platform",
    names: ["Feedback", "Settings"],
  },
];

function getInitials(name = "") {
  return String(name)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase() || "U";
}

function getRoleLabel(role) {
  return String(role || "User")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function Sidebar({
  role,
  isRestricted = false,
  isPending = false,
  isMobileOpen = false,
  onNavigate,
}) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams?.get("tab");
  const { getIndicator, markSurfaceSeen } = useWorkIndicators({
    enabled: Boolean(role && !isPending),
  });

  useEffect(() => {
    if (session?.error === "SessionRevoked") {
      signOut({ callbackUrl: "/login" });
    }
  }, [session]);

  let links = getRoleNavigationLinks(role);

  if (isPending) {
    links = [];
  } else if (isRestricted && role === "SCHOOL_ADMIN") {
    links = links.filter((link) => link.name === "Settings");
  }

  const groupedLinks =
    role === "SCHOOL_ADMIN"
      ? SCHOOL_NAV_GROUPS.map((group) => ({
          ...group,
          links: links.filter((link) => group.names.includes(link.name)),
        })).filter((group) => group.links.length > 0)
      : [{ title: null, links }];

  const userName = session?.user?.name || session?.user?.email || "User";
  const userRole = session?.user?.role || role || "USER";
  const initials = getInitials(session?.user?.name || "");

  return (
    <aside
      className={`pravyo-dark-shell fixed left-0 top-0 z-50 flex h-dvh flex-col border-r transition-transform duration-300 lg:h-screen lg:translate-x-0 ${
        isMobileOpen ? "translate-x-0" : "-translate-x-full"
      }`}
      style={{ width: "min(88vw, 17rem)" }}
    >
      {/* ── Logo / brand header ─── */}
      <div className="sidebar-header-band flex items-center justify-between gap-3 px-4 py-3.5">
        <div className="flex items-center gap-3 min-w-0">
          <PravyoLogo variant="icon" compact withSurface />
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--brand-primary)] leading-none">
              Pravyo
            </p>
            <p className="text-sm font-semibold text-[var(--brand-ink)] leading-tight mt-0.5 truncate">
              School Platform
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onNavigate}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--brand-border)] bg-white text-[var(--brand-muted)] transition hover:bg-[var(--brand-primary-soft)] hover:text-[var(--brand-primary)] lg:hidden"
          aria-label="Close navigation"
        >
          <FaTimes className="text-xs" />
        </button>
      </div>

      {/* ── Navigation ─── */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {groupedLinks.map((group) => (
          <div key={group.title || "main"}>
            {group.title && (
              <p className="sidebar-group-label mb-1.5 mt-1">{group.title}</p>
            )}
            <div className="space-y-0.5">
              {group.links.map((link) => {
                const Icon = link.icon;
                const currentHref = pathname + (currentTab ? `?tab=${currentTab}` : "");
                const isNestedActive =
                  !link.href.includes("?") && pathname?.startsWith(`${link.href}/`);
                const isActive = link.href === currentHref || isNestedActive;
                const indicator = getIndicator(HREF_INDICATOR_KEYS[link.href]);

                return (
                  <NavItemLink
                    key={link.href}
                    href={link.href}
                    label={link.name}
                    icon={Icon}
                    active={isActive}
                    indicator={indicator}
                    onClick={() => {
                      const seenSurface = HREF_SEEN_SURFACES[link.href];
                      if (seenSurface) void markSurfaceSeen(seenSurface);
                      onNavigate?.();
                    }}
                  />
                );
              })}
            </div>
          </div>
        ))}

        {links.length === 0 && (
          <div className="rounded-xl border border-dashed border-[var(--brand-border)] bg-[#f8f9fd] px-4 py-5 text-center text-sm leading-6 text-[#526071]">
            <FaSchool className="mx-auto mb-2 text-lg text-[var(--brand-primary)] opacity-40" />
            Navigation will appear after your account is active.
          </div>
        )}
      </nav>

      {/* ── User card + Logout ─── */}
      <div
        className="border-t border-[var(--brand-border)] px-3 pt-3"
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
      >
        {session?.user && (
          <div className="sidebar-user-card mb-2">
            <div className="sidebar-avatar">{initials}</div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[var(--brand-ink)] leading-tight">
                {userName}
              </p>
              <p className="mt-0.5 truncate text-[11px] font-medium uppercase tracking-wide text-[var(--brand-muted)]">
                {getRoleLabel(userRole)}
              </p>
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="group flex min-h-[2.5rem] w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-[#3d4a5c] transition-all duration-150 hover:bg-red-50 hover:text-red-600"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#fff0f0] text-red-400 group-hover:bg-red-100 group-hover:text-red-600 transition-all duration-150">
            <FaSignOutAlt className="text-xs" />
          </span>
          <span>Log out</span>
        </button>
      </div>
    </aside>
  );
}
