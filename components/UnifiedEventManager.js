"use client";

import {
  FaUsers,
  FaClipboardCheck,
  FaClock,
  FaInfoCircle,
} from "react-icons/fa";
import ParticipationApprovalManager from "./ParticipationApprovalManager";

/**
 * Event Management (requests only)
 * Live capacity overview removed per request
 */
export default function UnifiedEventManager() {
  return (
    <div className="space-y-6">
      {/* Hero banner */}
      <div className="overflow-hidden rounded-2xl border border-emerald-700/40 bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-xl">
        <div className="p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-emerald-50/90">
              <FaUsers /> Event Management
            </p>
            <h2 className="text-2xl font-bold">
              Review student participation requests
            </h2>
            <p className="text-emerald-50/90 text-sm md:text-base max-w-3xl">
              Process approvals and rejections in one place. Live capacity views
              have been removed; focus here is on clear, fast request handling.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 text-sm">
            <div className="bg-white/15 border border-white/20 rounded-xl px-4 py-3 flex items-center gap-2 shadow-sm shadow-emerald-900/20">
              <FaClipboardCheck />
              <span className="font-medium">Approve or reject quickly</span>
            </div>
            <div className="bg-white/15 border border-white/20 rounded-xl px-4 py-3 flex items-center gap-2 shadow-sm shadow-emerald-900/20">
              <FaClock />
              <span className="font-medium">See current statuses</span>
            </div>
          </div>
        </div>
      </div>

      {/* Requests panel */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 md:p-6">
        <div className="mb-4 flex items-center gap-2 text-slate-600 text-sm">
          <FaInfoCircle className="text-emerald-500" />
          <span>
            All participation requests and their current states are managed
            below.
          </span>
        </div>
        <ParticipationApprovalManager />
      </div>
    </div>
  );
}
