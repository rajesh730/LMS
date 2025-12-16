'use client';

import Link from 'next/link';
import { useSearchParams, usePathname } from 'next/navigation';
import { FaCheckCircle, FaSchool, FaLayerGroup, FaCalendarAlt, FaBook } from 'react-icons/fa';

export default function AdminTopNav({ pendingCount = 0 }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const currentTab = searchParams.get('tab') || 'approvals';
  
  const isDashboard = pathname === '/admin/dashboard';
  const isCurriculum = pathname === '/admin/curriculum';

  return (
    <div className="flex gap-4 mb-8 border-b border-slate-800 pb-1 overflow-x-auto">
      <Link
        href="/admin/dashboard?tab=approvals"
        className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition whitespace-nowrap ${
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
        className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition whitespace-nowrap ${
          isDashboard && currentTab === 'schools'
            ? "bg-blue-600 text-white"
            : "text-slate-400 hover:text-white"
        }`}
      >
        <FaSchool /> Schools
      </Link>
      
      <Link
        href="/admin/dashboard?tab=groups"
        className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition whitespace-nowrap ${
          isDashboard && currentTab === 'groups'
            ? "bg-blue-600 text-white"
            : "text-slate-400 hover:text-white"
        }`}
      >
        <FaLayerGroup /> Groups
      </Link>
      
      <Link
        href="/admin/dashboard?tab=events"
        className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition whitespace-nowrap ${
          isDashboard && currentTab === 'events'
            ? "bg-blue-600 text-white"
            : "text-slate-400 hover:text-white"
        }`}
      >
        <FaCalendarAlt /> Events
      </Link>

      <Link
        href="/admin/curriculum"
        className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition whitespace-nowrap ${
          isCurriculum
            ? "bg-blue-600 text-white"
            : "text-slate-400 hover:text-white"
        }`}
      >
        <FaBook /> Curriculum
      </Link>
    </div>
  );
}
