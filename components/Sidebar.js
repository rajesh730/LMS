"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useEffect } from "react";
import {
  FaChartPie,
  FaBell,
  FaBookOpen,
  FaCalendarAlt,
  FaCog,
  FaFeatherAlt,
  FaSignOutAlt,
  FaSchool,
  FaChalkboardTeacher,
  FaHeadset,
  FaLightbulb,
  FaUsers,
  FaTimes,
} from "react-icons/fa";
import PratyoLogo from "@/components/brand/PratyoLogo";

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

  useEffect(() => {
    if (session?.error === "SessionRevoked") {
      signOut({ callbackUrl: "/login" });
    }
  }, [session]);

  const adminLinks = [
    { name: "Platform Hub", href: "/admin/dashboard", icon: FaChartPie },
    { name: "Support Tickets", href: "/admin/support", icon: FaHeadset },
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
      name: "Pratyo Pulse",
      href: "/school/dashboard?tab=challenge-showcase",
      icon: FaLightbulb,
    },
    {
      name: "Student Notices",
      href: "/school/dashboard?tab=student-notices",
      icon: FaBell,
    },
    {
      name: "Public Profile",
      href: "/school/dashboard?tab=showcase",
      icon: FaSchool,
    },
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
    { name: "Pratyo Pulse", href: "/student/challenges", icon: FaLightbulb },
    { name: "Notices", href: "/student/notices", icon: FaBell },
    { name: "My Writing", href: "/student/writing", icon: FaFeatherAlt },
    { name: "School Magazine", href: "/student/magazine", icon: FaBookOpen },
  ];

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

  return (
    <aside
      className={`pratyo-dark-shell fixed left-0 top-0 z-50 flex h-dvh w-[min(88vw,18rem)] flex-col border-r backdrop-blur-xl transition-transform duration-300 lg:h-screen lg:w-64 lg:translate-x-0 ${
        isMobileOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="border-b border-white/10 p-4 sm:p-6">
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
            className="rounded-lg p-2 transition hover:bg-white/10 lg:hidden"
            aria-label="Close navigation"
          >
            <FaTimes />
          </button>
        </div>
      </div>

      <nav className="flex-1 space-y-2 overflow-y-auto p-3 sm:p-4">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = link.href === (pathname + (currentTab ? `?tab=${currentTab}` : ""));
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onNavigate}
              aria-current={isActive ? "page" : undefined}
              className={`group flex min-h-12 items-center gap-3 rounded-xl px-4 py-3 transition-all duration-200 ${isActive
                  ? "pratyo-active border shadow-sm"
                  : "text-[#bfd3f5] hover:bg-white/10 hover:text-[#f6fbff]"
                }`}
            >
              <Icon
                className={`text-lg ${isActive
                    ? "text-[#d7e9ff]"
                    : "text-[#6fa6ef] group-hover:text-[#d9e8ff]"
                  }`}
              />
              <span className="font-medium leading-tight">{link.name}</span>
            </Link>
          );
        })}
        {links.length === 0 && (
        <div className="rounded-xl border border-white/10 bg-white/10 p-4 text-sm leading-6 text-[#bfd3f5]">
            Navigation will appear after your account is active.
          </div>
        )}
      </nav>

      <div className="border-t border-white/10 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:p-4">
        {session?.user && (
          <div className="mb-3 rounded-xl border border-white/10 bg-white/10 p-3">
            <p className="truncate text-sm font-semibold">
              {session.user.name || session.user.email || "Signed in"}
            </p>
            <p className="pratyo-muted mt-1 truncate text-xs uppercase tracking-wide">
              {String(session.user.role || role || "USER").replaceAll("_", " ")}
            </p>
          </div>
        )}
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="group flex min-h-12 w-full items-center gap-3 rounded-xl px-4 py-3 text-[#d7e9ff] transition-all duration-200 hover:bg-white/10"
        >
          <FaSignOutAlt className="text-lg group-hover:text-white" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
}
