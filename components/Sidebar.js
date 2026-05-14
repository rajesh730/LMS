"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useEffect } from "react";
import {
  FaChartPie,
  FaCalendarAlt,
  FaCog,
  FaSignOutAlt,
  FaSchool,
  FaChalkboardTeacher,
  FaHeadset,
  FaUsers,
} from "react-icons/fa";
import PratyoLogo from "@/components/brand/PratyoLogo";

export default function Sidebar({ role, isRestricted = false, isPending = false }) {
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
      name: "Public Showcase",
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
    <aside className="w-64 border-r border-[#16396d] bg-[#081b39]/95 backdrop-blur-xl h-screen fixed left-0 top-0 flex flex-col z-50 transition-all duration-300">
      <div className="border-b border-[#16396d] p-6">
        <div className="flex items-center gap-3">
          <PratyoLogo variant="icon" compact withSurface />
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#8fc4ff]">
              Pratyo
            </p>
            <p className="text-sm font-semibold text-[#f6fbff]">
              School Platform
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = link.href === (pathname + (currentTab ? `?tab=${currentTab}` : ""));
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                  ? "border border-[#ffb21c]/25 bg-[#ffb21c]/10 text-[#ffe09a] shadow-sm"
                  : "text-[#bfd3f5] hover:bg-[#0f2953] hover:text-[#f6fbff]"
                }`}
            >
              <Icon
                className={`text-lg ${isActive
                    ? "text-[#ffb21c]"
                    : "text-[#6fa6ef] group-hover:text-[#d9e8ff]"
                  }`}
              />
              <span className="font-medium">{link.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-[#16396d]">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-[#ffc37a] hover:bg-[#ffb21c]/10 transition-all duration-200 group"
        >
          <FaSignOutAlt className="text-lg group-hover:text-[#fff0c9]" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
}
