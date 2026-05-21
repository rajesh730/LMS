'use client';

import Link from 'next/link';
import { useSearchParams, usePathname } from 'next/navigation';
import { FaBullhorn, FaBullseye, FaCalendarAlt, FaCheckCircle, FaFeatherAlt, FaHandshake, FaSchool } from 'react-icons/fa';

export default function AdminTopNav({ pendingCount = 0 }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const rawTab = searchParams.get("tab") || "approvals";
  const currentTab = ["judging", "results"].includes(rawTab) ? "events" : rawTab;
  
  const isDashboard = pathname === '/admin/dashboard';
  return (
    <div className="mb-8 mt-8 -mx-4 overflow-x-auto border-y border-[#d7cdbb] bg-white/65 px-4 py-2 shadow-sm sm:mx-0 sm:rounded-2xl sm:border sm:p-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      <div className="flex min-w-max snap-x gap-2">
      <Link
        href="/admin/dashboard?tab=approvals"
        className={`flex min-h-11 snap-start items-center gap-2 rounded-xl px-4 text-sm font-semibold transition whitespace-nowrap ${
          isDashboard && currentTab === 'approvals'
            ? "bg-blue-600 text-white"
            : "text-[#52657d] hover:bg-[#eaf2ff] hover:text-[#0a2f66]"
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
        className={`flex min-h-11 snap-start items-center gap-2 rounded-xl px-4 text-sm font-semibold transition whitespace-nowrap ${
          isDashboard && currentTab === 'schools'
            ? "bg-blue-600 text-white"
            : "text-[#52657d] hover:bg-[#eaf2ff] hover:text-[#0a2f66]"
        }`}
      >
        <FaSchool /> Schools
      </Link>
      
      <Link
        href="/admin/dashboard?tab=events"
        className={`flex min-h-11 snap-start items-center gap-2 rounded-xl px-4 text-sm font-semibold transition whitespace-nowrap ${
          isDashboard && currentTab === 'events'
            ? "bg-blue-600 text-white"
            : "text-[#52657d] hover:bg-[#eaf2ff] hover:text-[#0a2f66]"
        }`}
      >
        <FaCalendarAlt /> Platform Events
      </Link>

      <Link
        href="/admin/dashboard?tab=partners"
        className={`flex min-h-11 snap-start items-center gap-2 rounded-xl px-4 text-sm font-semibold transition whitespace-nowrap ${
          isDashboard && currentTab === "partners"
            ? "bg-blue-600 text-white"
            : "text-[#52657d] hover:bg-[#eaf2ff] hover:text-[#0a2f66]"
        }`}
      >
        <FaHandshake /> Partners
      </Link>

      <Link
        href="/admin/dashboard?tab=notices"
        className={`flex min-h-11 snap-start items-center gap-2 rounded-xl px-4 text-sm font-semibold transition whitespace-nowrap ${
          isDashboard && currentTab === "notices"
            ? "bg-blue-600 text-white"
            : "text-[#52657d] hover:bg-[#eaf2ff] hover:text-[#0a2f66]"
        }`}
      >
        <FaBullhorn /> Notices
      </Link>

      <Link
        href="/admin/dashboard?tab=challenges"
        className={`flex min-h-11 snap-start items-center gap-2 rounded-xl px-4 text-sm font-semibold transition whitespace-nowrap ${
          isDashboard && currentTab === "challenges"
            ? "bg-blue-600 text-white"
            : "text-[#52657d] hover:bg-[#eaf2ff] hover:text-[#0a2f66]"
        }`}
      >
        <FaFeatherAlt /> Student Challenges
      </Link>

      <Link
        href="/admin/dashboard?tab=spotlight"
        className={`flex min-h-11 snap-start items-center gap-2 rounded-xl px-4 text-sm font-semibold transition whitespace-nowrap ${
          isDashboard && currentTab === "spotlight"
            ? "bg-blue-600 text-white"
            : "text-[#52657d] hover:bg-[#eaf2ff] hover:text-[#0a2f66]"
        }`}
      >
        <FaBullseye /> School Spotlight
      </Link>
      </div>
    </div>
  );
}
