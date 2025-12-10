"use client";

import { FaCheckCircle, FaClock, FaTimesCircle } from "react-icons/fa";

export default function StatusSidebar({
  statusCounts,
  activeStatus,
  onStatusChange,
  selectedCount,
  totalCount,
}) {
  const statuses = [
    {
      key: "PENDING",
      label: "Pending",
      icon: FaClock,
      color: "bg-yellow-100 text-yellow-700 border-yellow-300",
      hoverColor: "hover:bg-yellow-50",
      count: statusCounts.PENDING,
    },
    {
      key: "APPROVED",
      label: "Approved",
      icon: FaCheckCircle,
      color: "bg-green-100 text-green-700 border-green-300",
      hoverColor: "hover:bg-green-50",
      count: statusCounts.APPROVED,
    },
    {
      key: "REJECTED",
      label: "Rejected",
      icon: FaTimesCircle,
      color: "bg-red-100 text-red-700 border-red-300",
      hoverColor: "hover:bg-red-50",
      count: statusCounts.REJECTED,
    },
  ];

  return (
    <div className="lg:col-span-1 bg-white rounded-lg border border-gray-200 p-6 h-full overflow-y-auto">
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Request Status</h2>
        <p className="text-sm text-gray-500">
          {selectedCount} of {totalCount} selected
        </p>
      </div>

      <div className="space-y-3">
        {statuses.map((status) => {
          const Icon = status.icon;
          const isActive = activeStatus === status.key;

          return (
            <button
              key={status.key}
              onClick={() => onStatusChange(status.key)}
              className={`w-full flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                isActive
                  ? `${status.color} border-current`
                  : `bg-gray-50 text-gray-700 border-gray-200 ${status.hoverColor}`
              }`}
            >
              <Icon className="text-lg flex-shrink-0" />
              <div className="text-left flex-1">
                <p className="font-semibold">{status.label}</p>
                <p className="text-sm opacity-75">{status.count} requests</p>
              </div>
              {isActive && (
                <div className="text-lg font-bold">{status.count}</div>
              )}
            </button>
          );
        })}
      </div>

      {/* All Requests */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <button
          onClick={() => onStatusChange("ALL")}
          className={`w-full flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
            activeStatus === "ALL"
              ? "bg-blue-100 text-blue-700 border-blue-300"
              : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
          }`}
        >
          <div className="text-lg flex-shrink-0">📋</div>
          <div className="text-left flex-1">
            <p className="font-semibold">All Requests</p>
            <p className="text-sm opacity-75">{statusCounts.ALL} total</p>
          </div>
          {activeStatus === "ALL" && (
            <div className="text-lg font-bold">{statusCounts.ALL}</div>
          )}
        </button>
      </div>

      {/* Info Box */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-xs text-blue-700">
          <span className="font-semibold">💡 Tip:</span> Click a status to view
          those requests, then select students to perform bulk actions.
        </p>
      </div>
    </div>
  );
}
