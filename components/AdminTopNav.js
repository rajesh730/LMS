'use client';

import Link from 'next/link';
import { useSearchParams, usePathname } from 'next/navigation';
import { FaBullhorn, FaBullseye, FaCalendarAlt, FaCheckCircle, FaFeatherAlt, FaHandshake, FaSchool, FaHeartbeat } from 'react-icons/fa';
import WorkIndicatorBadge from '@/components/work-indicators/WorkIndicatorBadge';
import useWorkIndicators from '@/lib/useWorkIndicators';

export default function AdminTopNav({ pendingCount = 0 }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const rawTab = searchParams.get("tab") || "approvals";
  const currentTab = ["judging", "results"].includes(rawTab) ? "events" : rawTab;
  const { getIndicator } = useWorkIndicators();
  
  const isDashboard = pathname === '/admin/dashboard';
  const isDiagnostics = pathname === '/admin/diagnostics';
  const approvalIndicator = getIndicator("admin.approvals");
  const eventsIndicator = getIndicator("admin.events");
  const challengesIndicator = getIndicator("admin.challenges");
  const spotlightIndicator = getIndicator("admin.spotlight");
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
        <WorkIndicatorBadge
          count={approvalIndicator.count || pendingCount}
          tone={approvalIndicator.tone}
          compact
        />
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
        <WorkIndicatorBadge
          count={eventsIndicator.count}
          tone={eventsIndicator.tone}
          compact
        />
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
        <WorkIndicatorBadge
          count={challengesIndicator.count}
          tone={challengesIndicator.tone}
          compact
        />
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
        <WorkIndicatorBadge
          count={spotlightIndicator.count}
          tone={spotlightIndicator.tone}
          compact
        />
      </Link>

      <Link
        href="/admin/diagnostics"
        className={`flex min-h-11 snap-start items-center gap-2 rounded-xl px-4 text-sm font-semibold transition whitespace-nowrap ${
          isDiagnostics
            ? "bg-blue-600 text-white"
            : "text-[#52657d] hover:bg-[#eaf2ff] hover:text-[#0a2f66]"
        }`}
      >
        <FaHeartbeat /> Diagnostics
      </Link>
      </div>
    </div>
  );
}
