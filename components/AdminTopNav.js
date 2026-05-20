'use client';

import Link from 'next/link';
import { useSearchParams, usePathname } from 'next/navigation';
import { FaCheckCircle, FaSchool, FaCalendarAlt, FaHandshake, FaBullhorn, FaFeatherAlt } from 'react-icons/fa';

export default function AdminTopNav({ pendingCount = 0 }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const rawTab = searchParams.get("tab") || "approvals";
  const currentTab = ["judging", "results"].includes(rawTab) ? "events" : rawTab;
  
  const isDashboard = pathname === '/admin/dashboard';
  return (
    <div className="mt-8 flex gap-3 mb-8 rounded-2xl border border-slate-800 bg-slate-900/50 p-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      <Link
        href="/admin/dashboard?tab=approvals"
        className={`flex items-center gap-2 px-4 py-2 rounded-xl transition whitespace-nowrap ${
          isDashboard && currentTab === 'approvals'
            ? "bg-blue-600 text-white"
            : "text-slate-400 hover:text-white"
        }`}
      >
        <FaCheckCircle /> Approvals
        {pendingCount > 0 && (
          <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
            {pendingCount}
          </span>
        )}
      </Link>
      
      <Link
        href="/admin/dashboard?tab=schools"
        className={`flex items-center gap-2 px-4 py-2 rounded-xl transition whitespace-nowrap ${
          isDashboard && currentTab === 'schools'
            ? "bg-blue-600 text-white"
            : "text-slate-400 hover:text-white"
        }`}
      >
        <FaSchool /> Schools
      </Link>
      
      <Link
        href="/admin/dashboard?tab=events"
        className={`flex items-center gap-2 px-4 py-2 rounded-xl transition whitespace-nowrap ${
          isDashboard && currentTab === 'events'
            ? "bg-blue-600 text-white"
            : "text-slate-400 hover:text-white"
        }`}
      >
        <FaCalendarAlt /> Platform Events
      </Link>

      <Link
        href="/admin/dashboard?tab=partners"
        className={`flex items-center gap-2 px-4 py-2 rounded-xl transition whitespace-nowrap ${
          isDashboard && currentTab === "partners"
            ? "bg-blue-600 text-white"
            : "text-slate-400 hover:text-white"
        }`}
      >
        <FaHandshake /> Partners
      </Link>

      <Link
        href="/admin/dashboard?tab=notices"
        className={`flex items-center gap-2 px-4 py-2 rounded-xl transition whitespace-nowrap ${
          isDashboard && currentTab === "notices"
            ? "bg-blue-600 text-white"
            : "text-slate-400 hover:text-white"
        }`}
      >
        <FaBullhorn /> Notices
      </Link>

      <Link
        href="/admin/dashboard?tab=challenges"
        className={`flex items-center gap-2 px-4 py-2 rounded-xl transition whitespace-nowrap ${
          isDashboard && currentTab === "challenges"
            ? "bg-blue-600 text-white"
            : "text-slate-400 hover:text-white"
        }`}
      >
        <FaFeatherAlt /> Student Challenges
      </Link>
    </div>
  );
}
