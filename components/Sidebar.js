"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import {
  FaChartPie,
  FaBullhorn,
  FaBell,
  FaBookOpen,
  FaCalendarAlt,
  FaCog,
  FaCheckCircle,
  FaFeatherAlt,
  FaHeartbeat,
  FaSignOutAlt,
  FaSchool,
  FaChalkboardTeacher,
  FaCommentDots,
  FaBullseye,
  FaUsers,
  FaTimes,
  FaHandshake,
} from "react-icons/fa";
import PratyoLogo from "@/components/brand/PratyoLogo";
import WorkIndicatorBadge from "@/components/work-indicators/WorkIndicatorBadge";
import useWorkIndicators from "@/lib/useWorkIndicators";

const HREF_INDICATOR_KEYS = {
  "/admin/dashboard?tab=approvals": "admin.approvals",
  "/admin/dashboard?tab=events": "admin.events",
  "/admin/dashboard?tab=partners": "admin.partners",
  "/admin/feedback": "admin.feedback",
  "/admin/dashboard?tab=spotlight": "admin.spotlight",
  "/school/dashboard?tab=platform-events": "school.platformEvents",
  "/school/dashboard?tab=school-events": "school.schoolEvents",
  "/school/dashboard?tab=student-notices": "school.studentNotices",
  "/school/dashboard?tab=notices": "school.receivedNotices",
  "/school/dashboard?tab=magazine": "school.magazine",
  "/student/events": "student.events",
  "/student/notices": "student.notices",
  "/student/school-wall": "student.schoolWall",
  "/student/magazine": "student.schoolMagazine",
};

const SCHOOL_NAV_GROUPS = [
  {
    title: "School Operations",
    names: [
      "Overview",
      "Students",
      "Teachers",
      "Platform Events",
      "School Events",
      "Student Notices",
      "Received Notices",
    ],
  },
  {
    title: "Public Showcase",
    names: ["School Magazine", "Public Profile"],
  },
  {
    title: "Platform",
    names: ["Feedback", "Settings"],
  },
];

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
  const [studentGlobalWallEnabled, setStudentGlobalWallEnabled] = useState(false);
  const { getIndicator } = useWorkIndicators({
    enabled: Boolean(role && !isPending),
  });

  useEffect(() => {
    if (session?.error === "SessionRevoked") {
      signOut({ callbackUrl: "/login" });
    }
  }, [session]);

  useEffect(() => {
    if (role !== "STUDENT" || isPending) {
      return;
    }

    let cancelled = false;
    async function loadStudentMagazineSettings() {
      try {
        const res = await fetch("/api/student/magazine", { cache: "no-store" });
        const payload = await res.json().catch(() => ({}));
        if (!cancelled) {
          setStudentGlobalWallEnabled(Boolean(res.ok && payload.globalWallEnabled));
        }
      } catch {
        if (!cancelled) setStudentGlobalWallEnabled(false);
      }
    }

    void loadStudentMagazineSettings();
    return () => {
      cancelled = true;
    };
  }, [isPending, role]);

  const adminLinks = [
    { name: "Approvals", href: "/admin/dashboard?tab=approvals", icon: FaCheckCircle },
    { name: "Schools", href: "/admin/dashboard?tab=schools", icon: FaSchool },
    { name: "Platform Events", href: "/admin/dashboard?tab=events", icon: FaCalendarAlt },
    { name: "Partners", href: "/admin/dashboard?tab=partners", icon: FaHandshake },
    { name: "Notices", href: "/admin/dashboard?tab=notices", icon: FaBullhorn },
    { name: "School Spotlight", href: "/admin/dashboard?tab=spotlight", icon: FaBullseye },
    { name: "Diagnostics", href: "/admin/diagnostics", icon: FaHeartbeat },
    { name: "Feedback", href: "/admin/feedback", icon: FaCommentDots },
    { name: "Settings", href: "/admin/settings", icon: FaCog },
  ];

  const schoolLinks = [
    { name: "Overview", href: "/school/dashboard", icon: FaChartPie },
    { name: "Students", href: "/school/dashboard?tab=students", icon: FaUsers },
    { name: "Teachers", href: "/school/dashboard?tab=teachers", icon: FaChalkboardTeacher },
    {
      name: "Platform Events",
      href: "/school/dashboard?tab=platform-events",
      icon: FaCalendarAlt,
    },
    {
      name: "School Events",
      href: "/school/dashboard?tab=school-events",
      icon: FaCalendarAlt,
    },
    {
      name: "Student Notices",
      href: "/school/dashboard?tab=student-notices",
      icon: FaBell,
    },
    {
      name: "Received Notices",
      href: "/school/dashboard?tab=notices",
      icon: FaBell,
    },
    {
      name: "School Magazine",
      href: "/school/dashboard?tab=magazine",
      icon: FaBookOpen,
    },
    {
      name: "Public Profile",
      href: "/school/dashboard?tab=showcase",
      icon: FaSchool,
    },
    { name: "Feedback", href: "/school/dashboard?tab=feedback", icon: FaCommentDots },
    { name: "Settings", href: "/school/dashboard?tab=settings", icon: FaCog },
  ];

  const teacherLinks = [
    {
      name: "Mentor Workspace",
      href: "/teacher/dashboard",
      icon: FaChalkboardTeacher,
    },
  ];

  const studentLinks = [
    { name: "My Activity", href: "/student/dashboard", icon: FaSchool },
    { name: "Events", href: "/student/events", icon: FaCalendarAlt },
    { name: "Notices", href: "/student/notices", icon: FaBell },
    { name: "My Writing", href: "/student/writing", icon: FaFeatherAlt },
    { name: "School Wall", href: "/student/school-wall", icon: FaSchool },
    { name: "School Magazine", href: "/student/magazine", icon: FaBookOpen },
    studentGlobalWallEnabled && {
      name: "Global Wall",
      href: "/student/global-wall",
      icon: FaBookOpen,
    },
    { name: "Feedback", href: "/student/feedback", icon: FaCommentDots },
  ].filter(Boolean);

  let links = [];
  if (role === "SUPER_ADMIN") links = adminLinks;
  else if (role === "SCHOOL_ADMIN") links = schoolLinks;
  else if (role === "TEACHER") links = teacherLinks;
  else if (role === "STUDENT") links = studentLinks;

  // RESTRICTION LOGIC
  if (isPending) {
    links = []; // Hide all navigation for pending users
  } else if (isRestricted && role === "SCHOOL_ADMIN") {
    links = links.filter(link => link.name === "Settings");
  }

  const groupedLinks =
    role === "SCHOOL_ADMIN"
      ? SCHOOL_NAV_GROUPS.map((group) => ({
          ...group,
          links: links.filter((link) => group.names.includes(link.name)),
        })).filter((group) => group.links.length > 0)
      : [{ title: null, links }];

  return (
    <aside
      className={`pratyo-dark-shell fixed left-0 top-0 z-50 flex h-dvh w-[min(88vw,19rem)] flex-col border-r backdrop-blur-xl transition-transform duration-300 lg:h-screen lg:w-72 lg:translate-x-0 ${
        isMobileOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="border-b border-[#e6eaf7] p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
          <PratyoLogo variant="icon" compact withSurface />
          <div>
            <p className="pratyo-muted text-xs font-black uppercase tracking-[0.24em]">
              Pratyo
            </p>
            <p className="text-sm font-semibold">
              School Platform
            </p>
          </div>
          </div>
          <button
            type="button"
            onClick={onNavigate}
            className="rounded-lg p-2 text-[#27344a] transition hover:bg-[#f4f1ff] hover:text-[#4326e8] lg:hidden"
            aria-label="Close navigation"
          >
            <FaTimes />
          </button>
        </div>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto p-3 sm:p-4">
        {groupedLinks.map((group) => (
          <div key={group.title || "main"} className="space-y-2">
            {group.title && (
              <p className="px-3 text-xs font-black uppercase tracking-[0.08em] text-[#7a8499]">
                {group.title}
              </p>
            )}
            {group.links.map((link) => {
              const Icon = link.icon;
              const currentHref = pathname + (currentTab ? `?tab=${currentTab}` : "");
              const isNestedActive =
                !link.href.includes("?") && pathname?.startsWith(`${link.href}/`);
              const isActive = link.href === currentHref || isNestedActive;
              const indicator = getIndicator(HREF_INDICATOR_KEYS[link.href]);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={onNavigate}
                  aria-current={isActive ? "page" : undefined}
                  className={`group flex min-h-14 items-center gap-3 rounded-2xl px-4 py-3 transition-all duration-200 ${
                    isActive
                      ? "pratyo-sidebar-active bg-[#4326e8] text-white shadow-sm ring-1 ring-[#4326e8]/20"
                      : "text-[#27344a] hover:bg-[#f4f1ff] hover:text-[#4326e8]"
                  }`}
                >
                  <Icon
                    className={`pratyo-sidebar-icon text-lg ${
                      isActive
                        ? "text-white"
                        : "text-[#526071] group-hover:text-[#4326e8]"
                    }`}
                  />
                  <span className="pratyo-sidebar-label min-w-0 flex-1 text-base font-black leading-tight">
                    {link.name}
                  </span>
                  <WorkIndicatorBadge
                    count={indicator.count}
                    tone={indicator.tone}
                    compact
                  />
                </Link>
              );
            })}
          </div>
        ))}
        {links.length === 0 && (
        <div className="rounded-xl border border-[#e6eaf7] bg-[#f8f9fd] p-4 text-sm leading-6 text-[#526071]">
            Navigation will appear after your account is active.
          </div>
        )}
      </nav>

      <div className="border-t border-[#e6eaf7] p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:p-4">
        {session?.user && (
          <div className="mb-3 rounded-xl border border-[#e6eaf7] bg-[#f8f9fd] p-3">
            <p className="truncate text-base font-black">
              {session.user.name || session.user.email || "Signed in"}
            </p>
            <p className="pratyo-muted mt-1 truncate text-xs font-bold uppercase tracking-wide">
              {String(session.user.role || role || "USER").replaceAll("_", " ")}
            </p>
          </div>
        )}
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="group flex min-h-12 w-full items-center gap-3 rounded-xl px-4 py-3 text-base font-black text-[#27344a] transition-all duration-200 hover:bg-[#f4f1ff] hover:text-[#4326e8]"
        >
          <FaSignOutAlt className="text-lg group-hover:text-[#4326e8]" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
}
