"use client";

import {
  FaArchive,
  FaBell,
  FaCertificate,
  FaClipboardList,
  FaCog,
  FaEdit,
  FaGlobe,
  FaLayerGroup,
  FaListUl,
  FaUsers,
} from "react-icons/fa";
import UnifiedApprovalManager from "./UnifiedApprovalManager";
import RoundsTab from "./RoundsTab";
import EventOverviewTab from "./EventOverviewTab";
import EventResultsManager from "@/components/EventResultsManager";
import EventNoticeManager from "./EventNoticeManager";
import EventParticipationForm from "./EventParticipationForm";

export default function ManagementTabs({
  requests,
  capacityInfo,
  event,
  activeTab,
  setActiveTab,
  onDataChange,
  onEdit,
  onArchive,
}) {
  // Combine all requests into a single array
  const allRequests = [
    ...requests.PENDING,
    ...requests.APPROVED,
    ...requests.REJECTED,
    ...(requests.ENROLLED || []),
  ];
  const selectedTab = activeTab === "manage" ? "registrations" : activeTab;

  const tabs = [
    {
      id: "overview",
      label: "Overview",
      count: null,
      icon: FaClipboardList,
    },
    {
      id: "registrations",
      label: "Participants",
      count: allRequests.length,
      icon: FaUsers,
    },
    {
      id: "rounds",
      label: "Rounds",
      count: null,
      icon: FaLayerGroup,
    },
    {
      id: "notices",
      label: "Notices",
      count: null,
      icon: FaBell,
    },
    {
      id: "results",
      label: "Results & Certificates",
      count: null,
      icon: FaCertificate,
    },
  ];
  const completedRounds = event.resultsPublished ? "1/1" : "0/1";
  const quickActions = [
    { label: "Edit Event", icon: FaEdit, onClick: onEdit },
    { label: "Event Notices", icon: FaBell, onClick: () => setActiveTab("notices") },
    {
      label: "Manage Participants",
      icon: FaUsers,
      onClick: () => setActiveTab("registrations"),
    },
    { label: "View Rounds", icon: FaLayerGroup, onClick: () => setActiveTab("rounds") },
    {
      label: "Results & Certificates",
      icon: FaCertificate,
      onClick: () => setActiveTab("results"),
    },
    { label: "Archive Event", icon: FaArchive, onClick: onArchive, danger: true },
  ].filter((action) => typeof action.onClick === "function");

  return (
    <div className="mb-8 grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
      <div className="overflow-hidden rounded-xl border border-[#e1e7f2] bg-white shadow-[0_14px_36px_rgba(10,47,102,0.07)]">
        <div className="flex flex-wrap border-b border-[#e1e7f2] bg-white px-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative inline-flex min-h-12 items-center gap-2 px-4 text-xs font-black transition ${
                  selectedTab === tab.id
                    ? "text-purple-700 after:absolute after:bottom-0 after:left-0 after:h-[3px] after:w-full after:rounded-full after:bg-purple-700"
                    : "text-[#0a2f66] hover:bg-[#f8fbff] hover:text-purple-700"
                }`}
              >
                <Icon />
                {tab.label}
                {tab.count !== null && (
                  <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-black text-white">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="bg-[#f8fbff] p-4 md:p-5">
          {selectedTab === "overview" && (
            <EventOverviewTab
              event={event}
              capacityInfo={capacityInfo}
              requests={requests}
              setActiveTab={setActiveTab}
            />
          )}

          {selectedTab === "registrations" && (
            <div className="space-y-5">
              <div className="rounded-xl border border-[#e1e7f2] bg-white p-4 shadow-sm md:p-5">
                <div className="mb-4 flex flex-col gap-2 border-b border-[#e1e7f2] pb-4 md:flex-row md:items-end md:justify-between">
                  <div>
                    <h2 className="text-xl font-black text-[#17120a]">
                      Register Students
                    </h2>
                    <p className="mt-1 text-sm text-[#52657d]">
                      Add or update the students and teams for this school event.
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#dbe5f4] bg-[#f8fbff] px-4 py-2 text-sm font-black text-[#0a2f66]">
                    {capacityInfo.filled || 0}
                    {capacityInfo.total ? `/${capacityInfo.total}` : ""} registered
                  </div>
                </div>
                <EventParticipationForm
                  event={event}
                  isEditing={allRequests.length > 0}
                  onSuccess={onDataChange}
                />
              </div>

              <div className="rounded-xl border border-[#e1e7f2] bg-white p-4 shadow-sm md:p-5">
                <div className="mb-4 border-b border-[#e1e7f2] pb-4">
                  <h2 className="text-xl font-black text-[#17120a]">
                    Registration Records
                  </h2>
                  <p className="mt-1 text-sm text-[#52657d]">
                    Review submitted students, approval state, and registration history.
                  </p>
                </div>
                <UnifiedApprovalManager
                  requests={allRequests}
                  event={event}
                  onDataChange={onDataChange}
                />
              </div>
            </div>
          )}

          {selectedTab === "rounds" && (
            <RoundsTab
              event={event}
              onAddNotice={() => setActiveTab("notices")}
              onCompetitionClosed={async () => {
                await onDataChange?.();
                setActiveTab("results");
              }}
            />
          )}

          {selectedTab === "notices" && (
            <EventNoticeManager
              eventId={event.id || event._id}
              eventTitle={event.title}
            />
          )}

          {selectedTab === "results" && (
            <EventResultsManager
              fixedEventId={event.id || event._id}
              embedded
              title="Event Results & Certificates"
              description="Final placements and school-issued digital certificates are prepared automatically."
            />
          )}
        </div>
      </div>

      <aside className="space-y-4">
        <div className="rounded-xl border border-[#e1e7f2] bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-black text-[#17120a]">Quick Actions</h3>
          <div className="space-y-1.5">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.label}
                  type="button"
                  onClick={action.onClick}
                  className={`flex min-h-9 w-full items-center justify-between rounded-lg px-3 text-left text-xs font-black transition hover:bg-[#f8fbff] ${
                    action.danger ? "text-rose-700" : "text-[#0a2f66]"
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    <Icon />
                    {action.label}
                  </span>
                  <span>&gt;</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-[#e1e7f2] bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-black text-[#17120a]">At a Glance</h3>
          <div className="space-y-3">
            {[
              ["Schools Participated", capacityInfo.schoolCount || 1, FaUsers],
              ["Total Participant", capacityInfo.filled || 0, FaUsers],
              ["Rounds Completed", completedRounds, FaLayerGroup],
              ["Certificates Issued", event.resultsPublished ? capacityInfo.filled || 0 : 0, FaCertificate],
            ].map(([label, value, Icon]) => (
              <div
                key={label}
                className="flex items-center justify-between gap-3 rounded-lg bg-[#f8fbff] px-3 py-2"
              >
                <span className="inline-flex items-center gap-2 text-xs font-bold text-[#52657d]">
                  <Icon className="text-purple-700" />
                  {label}
                </span>
                <strong className="text-sm font-black text-[#17120a]">{value}</strong>
              </div>
            ))}
          </div>
        </div>

        {selectedTab === "notices" && (
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 shadow-sm">
            <div className="flex gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-emerald-700">
                <FaGlobe />
              </span>
              <div>
                <h3 className="text-sm font-black text-[#17120a]">
                  Where notices appear
                </h3>
                <p className="mt-2 text-xs font-bold leading-5 text-emerald-800">
                  Published notices are visible on the public event page and in
                  the school dashboard event card.
                </p>
              </div>
            </div>
          </div>
        )}
      </aside>
      </div>
  );
}
