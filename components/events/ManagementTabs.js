"use client";

import UnifiedApprovalManager from "./UnifiedApprovalManager";
import RoundsTab from "./RoundsTab";
import EventOverviewTab from "./EventOverviewTab";
import EventResultsManager from "@/components/EventResultsManager";
import EventNoticeManager from "./EventNoticeManager";

export default function ManagementTabs({
  requests,
  capacityInfo,
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
      id: "overview",
      label: "OVERVIEW",
      count: null,
      color: "bg-red-600",
    },
    {
      id: "manage",
      label: "PARTICIPANTS",
      count: allRequests.length,
      color: "bg-red-600",
    },
    {
      id: "rounds",
      label: "ROUNDS",
      count: null,
      color: "bg-red-600",
    },
    {
      id: "notices",
      label: "NOTICES",
      count: null,
      color: "bg-red-600",
    },
    {
      id: "results",
      label: "RESULTS & CERTIFICATES",
      count: null,
      color: "bg-red-600",
    },
  ];

  return (
    <div className="mb-8 overflow-hidden rounded-xl border border-[#d7cdbb] bg-white shadow-[0_14px_36px_rgba(10,47,102,0.08)]">
      {/* Tab Headers */}
      <div className="grid border-b border-[#d7cdbb] bg-white sm:grid-cols-2 lg:grid-cols-5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`event-manage-tab flex min-h-12 items-center justify-center gap-2 border-b border-r border-[#d7cdbb] px-3 py-3 text-sm font-bold transition-all last:border-r-0 ${
              activeTab === tab.id
                ? `${tab.color} event-manage-tab-active border-red-600`
                : "text-[#0a2f66] hover:bg-red-50 hover:text-red-700"
            }`}
          >
            {tab.label}
            {tab.count !== null && (
              <span className={`inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold ${
                activeTab === tab.id
                  ? "bg-white text-red-700"
                  : "bg-red-100 text-red-700"
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-[#f8fbff] p-4 md:p-6">
        {activeTab === "overview" && (
          <EventOverviewTab
            event={event}
            capacityInfo={capacityInfo}
            requests={requests}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === "manage" && (
          <UnifiedApprovalManager
            requests={allRequests}
            event={event}
            onDataChange={onDataChange}
          />
        )}

        {activeTab === "rounds" && (
          <RoundsTab
            event={event}
            onCompetitionClosed={async () => {
              await onDataChange?.();
              setActiveTab("results");
            }}
          />
        )}

        {activeTab === "notices" && (
          <EventNoticeManager
            eventId={event.id || event._id}
            eventTitle={event.title}
          />
        )}

        {activeTab === "results" && (
          <EventResultsManager
            fixedEventId={event.id || event._id}
            embedded
            title="Event Results & Certificates"
            description="Publish this event's final placements and generate school-issued digital certificates."
          />
        )}
      </div>
    </div>
  );
}
