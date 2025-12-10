"use client";

import { FaUsers, FaCheck, FaClock } from "react-icons/fa";

export default function CapacityTab({
  capacityInfo,
  perSchoolBreakdown,
  event,
}) {
  const getStatusColor = (percentage) => {
    if (percentage >= 100) return "text-red-600";
    if (percentage >= 80) return "text-yellow-600";
    return "text-green-600";
  };

  const getStatusBg = (percentage) => {
    if (percentage >= 100) return "bg-red-100 border-red-300";
    if (percentage >= 80) return "bg-yellow-100 border-yellow-300";
    return "bg-green-100 border-green-300";
  };

  return (
    <div className="space-y-6">
      {/* Overall Capacity Card */}
      {capacityInfo.total && (
        <div className={`border-2 rounded-lg p-6 ${getStatusBg(capacityInfo.percentage)}`}>
          <div className="flex items-center gap-4 mb-4">
            <div className={`text-4xl font-bold ${getStatusColor(capacityInfo.percentage)}`}>
              {capacityInfo.percentage}%
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">Total Capacity</p>
              <p className="text-2xl font-bold text-slate-900">
                {capacityInfo.filled} / {capacityInfo.total}
              </p>
            </div>
          </div>

          {/* Capacity Bar */}
          <div className="mb-4">
            <div className="w-full bg-slate-300 rounded-full h-4 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  capacityInfo.percentage >= 100
                    ? "bg-red-500"
                    : capacityInfo.percentage >= 80
                    ? "bg-yellow-500"
                    : "bg-green-500"
                }`}
                style={{ width: `${Math.min(capacityInfo.percentage, 100)}%` }}
              />
            </div>
          </div>

          {/* Status Info Grid */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/50 rounded p-3 text-center">
              <FaCheck className="text-green-600 mx-auto mb-2" size={20} />
              <p className="text-2xl font-bold text-slate-900">
                {capacityInfo.filled}
              </p>
              <p className="text-sm text-slate-600">Enrolled</p>
            </div>
            <div className="bg-white/50 rounded p-3 text-center">
              <FaClock className="text-yellow-600 mx-auto mb-2" size={20} />
              <p className="text-2xl font-bold text-slate-900">
                {capacityInfo.pending}
              </p>
              <p className="text-sm text-slate-600">Pending</p>
            </div>
            <div className="bg-white/50 rounded p-3 text-center">
              <FaUsers className="text-blue-600 mx-auto mb-2" size={20} />
              <p className="text-2xl font-bold text-slate-900">
                {capacityInfo.available}
              </p>
              <p className="text-sm text-slate-600">Available</p>
            </div>
          </div>
        </div>
      )}

      {/* Per-School Breakdown */}
      {perSchoolBreakdown.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-slate-900 mb-4">
            Per-School Breakdown
          </h3>
          <div className="space-y-3">
            {perSchoolBreakdown.map((breakdown, idx) => (
              <div key={idx} className="border border-slate-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <p className="font-semibold text-slate-900">
                    {breakdown.school || `School ${idx + 1}`}
                  </p>
                  <span className="text-sm font-bold text-slate-600">
                    {breakdown.count}
                    {breakdown.limit && `/${breakdown.limit}`}
                  </span>
                </div>
                {breakdown.limit && (
                  <>
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden mb-1">
                      <div
                        className={`h-full transition-all duration-300 ${
                          breakdown.percentage >= 100
                            ? "bg-red-500"
                            : breakdown.percentage >= 80
                            ? "bg-yellow-500"
                            : "bg-green-500"
                        }`}
                        style={{
                          width: `${Math.min(breakdown.percentage, 100)}%`,
                        }}
                      />
                    </div>
                    <p className="text-xs text-slate-500">
                      {breakdown.percentage}% of per-school limit
                    </p>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">Capacity Summary</h3>
        <ul className="space-y-1 text-sm text-blue-800">
          <li>• Total Capacity: {capacityInfo.total || "Unlimited"}</li>
          <li>• Currently Enrolled: {capacityInfo.filled}</li>
          <li>• Pending Approvals: {capacityInfo.pending}</li>
          <li>• Available Slots: {capacityInfo.available || "Unlimited"}</li>
          {event.maxParticipantsPerSchool && (
            <li>• Per-School Limit: {event.maxParticipantsPerSchool}</li>
          )}
        </ul>
      </div>
    </div>
  );
}
