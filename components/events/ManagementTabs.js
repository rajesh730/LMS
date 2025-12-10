"use client";

import { useState } from "react";
import PendingRequestsTab from "./PendingRequestsTab";
import ApprovedStudentsTab from "./ApprovedStudentsTab";
import RejectedRequestsTab from "./RejectedRequestsTab";
import CapacityTab from "./CapacityTab";

export default function ManagementTabs({
  requests,
  capacityInfo,
  perSchoolBreakdown,
  event,
  activeTab,
  setActiveTab,
  onDataChange,
}) {
  const tabs = [
    {
      id: "pending",
      label: "PENDING",
      count: requests.PENDING.length,
      color: "bg-yellow-500",
    },
    {
      id: "approved",
      label: "APPROVED",
      count: requests.APPROVED.length,
      color: "bg-green-500",
    },
    {
      id: "rejected",
      label: "REJECTED",
      count: requests.REJECTED.length,
      color: "bg-red-500",
    },
    {
      id: "capacity",
      label: "CAPACITY",
      count: null,
      color: "bg-blue-500",
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
        {activeTab === "pending" && (
          <PendingRequestsTab
            requests={requests.PENDING}
            event={event}
            onApprovalChange={onDataChange}
          />
        )}

        {activeTab === "approved" && (
          <ApprovedStudentsTab
            requests={requests.APPROVED}
            event={event}
            capacityInfo={capacityInfo}
            onDataChange={onDataChange}
          />
        )}

        {activeTab === "rejected" && (
          <RejectedRequestsTab requests={requests.REJECTED} />
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
