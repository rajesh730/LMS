"use client";

import UnifiedApprovalManager from "./UnifiedApprovalManager";
import CapacityTab from "./CapacityTab";
import { useState } from "react";

export default function ManagementTabs({
  requests,
  capacityInfo,
  perSchoolBreakdown,
  event,
  activeTab,
  setActiveTab,
  onDataChange,
}) {
  // Combine all requests into a single array
  const allRequests = [
    ...requests.PENDING,
    ...requests.APPROVED,
    ...requests.REJECTED,
    ...(requests.ENROLLED || []),
  ];

  const tabs = [
    {
      id: "manage",
      label: "MANAGE REQUESTS",
      count: allRequests.length,
      color: "bg-blue-500",
    },
    {
      id: "capacity",
      label: "CAPACITY",
      count: null,
      color: "bg-indigo-500",
    },
  ];

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-8">
      {/* Tab Headers */}
      <div className="flex flex-wrap gap-0 border-b border-slate-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-4 py-4 font-semibold text-sm md:text-base transition-all border-b-2 ${
              activeTab === tab.id
                ? `${tab.color} text-white border-b-transparent`
                : "text-slate-600 hover:text-slate-900 border-b-transparent"
            }`}
          >
            {tab.label}
            {tab.count !== null && (
              <span className="ml-2 inline-block bg-slate-200 text-slate-800 rounded-full px-2.5 py-0.5 text-xs font-bold">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="p-6 md:p-8">
        {activeTab === "manage" && (
          <UnifiedApprovalManager
            requests={allRequests}
            event={event}
            capacityInfo={capacityInfo}
            onDataChange={onDataChange}
          />
        )}

        {activeTab === "capacity" && (
          <CapacityTab
            capacityInfo={capacityInfo}
            perSchoolBreakdown={perSchoolBreakdown}
            event={event}
          />
        )}
      </div>
    </div>
  );
}
