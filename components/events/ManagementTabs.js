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
      color: "bg-[#0a2f66]",
    },
    {
      id: "manage",
      label: "PARTICIPANTS",
      count: allRequests.length,
      color: "bg-[#0a2f66]",
    },
    {
      id: "rounds",
      label: "ROUNDS",
      count: null,
      color: "bg-[#0a2f66]",
    },
    {
      id: "notices",
      label: "NOTICES",
      count: null,
      color: "bg-[#0a2f66]",
    },
    {
      id: "results",
      label: "RESULTS & CERTIFICATES",
      count: null,
      color: "bg-[#0a2f66]",
    },
  ];

  return (
    <div className="mb-8 overflow-hidden rounded-2xl border border-[#d7cdbb] bg-white shadow-[0_14px_36px_rgba(10,47,102,0.08)]">
      {/* Tab Headers */}
      <div className="flex flex-wrap gap-0 border-b border-[#d7cdbb] bg-white">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-4 py-4 font-semibold text-sm md:text-base transition-all border-b-2 ${
              activeTab === tab.id
                ? `${tab.color} text-white border-b-transparent`
                : "border-b-transparent text-[#0a2f66] hover:bg-[#eaf2ff] hover:text-[#0a2f66]"
            }`}
          >
            {tab.label}
            {tab.count !== null && (
              <span className="ml-2 inline-block rounded-full bg-[#dce9ff] px-2.5 py-0.5 text-xs font-bold text-[#0a2f66]">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-[#f8fbff] p-6 md:p-8">
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
