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
  currentUserRole = "",
  canManagePlatformOperations = false,
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
  const isPlatformCompetition = event.eventScope === "PLATFORM";
  const isSuperAdminPlatformManager =
    currentUserRole === "SUPER_ADMIN" && isPlatformCompetition;
  const canControlEventOperations =
    !isPlatformCompetition || canManagePlatformOperations;

  const availableTabs = [
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
    canControlEventOperations && {
      id: "rounds",
      label: "Rounds",
      count: null,
      icon: FaLayerGroup,
    },
    canControlEventOperations && {
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
  ].filter(Boolean);
  const normalizedTab = activeTab === "manage" ? "registrations" : activeTab;
  const selectedTab = availableTabs.some((tab) => tab.id === normalizedTab)
    ? normalizedTab
    : "overview";
  const completedRounds = event.resultsPublished ? "1/1" : "0/1";
  const quickActions = [
    canControlEventOperations && { label: "Edit Event", icon: FaEdit, onClick: onEdit },
    canControlEventOperations && { label: "Event Notices", icon: FaBell, onClick: () => setActiveTab("notices") },
    {
      label: "Manage Participants",
      icon: FaUsers,
      onClick: () => setActiveTab("registrations"),
    },
    canControlEventOperations && { label: "View Rounds", icon: FaLayerGroup, onClick: () => setActiveTab("rounds") },
    {
      label: "Results & Certificates",
      icon: FaCertificate,
      onClick: () => setActiveTab("results"),
    },
    canControlEventOperations && { label: "Archive Event", icon: FaArchive, onClick: onArchive, danger: true },
  ].filter((action) => action && typeof action.onClick === "function");

  return (
    <div className="mb-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
      <div className="overflow-hidden rounded-xl border border-[#e1e7f2] bg-white shadow-[0_10px_28px_rgba(10,47,102,0.06)]">
        <div className="flex overflow-x-auto border-b border-[#e1e7f2] bg-white px-2">
          {availableTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative inline-flex min-h-11 shrink-0 items-center gap-2 px-3 text-[13px] font-black transition sm:px-4 ${
                  selectedTab === tab.id
                    ? "text-purple-700 after:absolute after:bottom-0 after:left-0 after:h-[3px] after:w-full after:rounded-full after:bg-purple-700"
                    : "text-[#0a2f66] hover:bg-[#f8fbff] hover:text-purple-700"
                }`}
              >
                <Icon />
                {tab.label}
                {tab.count !== null && (
                  <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-black text-white/90">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="bg-[#f8fbff] p-3 md:p-4">
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
              {!isSuperAdminPlatformManager && (
                <div className="rounded-xl border border-[#e1e7f2] bg-white p-4 shadow-sm">
                  <div className="mb-4 flex flex-col gap-2 border-b border-[#e1e7f2] pb-4 md:flex-row md:items-end md:justify-between">
                    <div>
                      <h2 className="text-lg font-black text-[#17120a]">
                        Register Students
                      </h2>
                      <p className="mt-1 text-sm text-[#52657d]">
                        Add or update the students and teams for this competition.
                      </p>
                    </div>
                    <div className="rounded-lg border border-[#dbe5f4] bg-[#f8fbff] px-3 py-2 text-xs font-black text-[#0a2f66]">
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
              )}

              <div className="rounded-xl border border-[#e1e7f2] bg-white p-4 shadow-sm">
                <div className="mb-4 border-b border-[#e1e7f2] pb-3">
                  <h2 className="text-lg font-black text-[#17120a]">
                    {isSuperAdminPlatformManager
                      ? "Platform Participant Management"
                      : "Registration Records"}
                  </h2>
                  <p className="mt-1 text-sm text-[#52657d]">
                    {isSuperAdminPlatformManager
                      ? "Review school registrations, approve participants, and send approved entries into Round 1."
                      : "Review submitted students, approval state, and registration history."}
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

      <aside className="space-y-3">
        <div className="rounded-xl border border-[#e1e7f2] bg-white p-3 shadow-sm">
          <h3 className="mb-3 text-sm font-black text-[#17120a]">Quick Actions</h3>
          <div className="space-y-1.5">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.label}
                  type="button"
                  onClick={action.onClick}
                  className={`flex min-h-9 w-full items-center justify-between rounded-lg px-3 text-left text-xs font-bold transition hover:bg-[#f8fbff] ${
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

        <div className="rounded-xl border border-[#e1e7f2] bg-white p-3 shadow-sm">
          <h3 className="mb-3 text-sm font-black text-[#17120a]">At a Glance</h3>
          <div className="space-y-3">
            {[
              ["Schools Participated", capacityInfo.schoolCount || 1, FaUsers],
              ["Total Participant", capacityInfo.filled || 0, FaUsers],
              canControlEventOperations && ["Rounds Completed", completedRounds, FaLayerGroup],
              ["Certificates Issued", event.resultsPublished ? capacityInfo.filled || 0 : 0, FaCertificate],
            ].filter(Boolean).map(([label, value, Icon]) => (
              <div
                key={label}
                className="flex items-center justify-between gap-3 rounded-lg bg-[#f8fbff] px-3 py-2"
              >
                <span className="inline-flex items-center gap-2 text-[11px] font-bold text-[#52657d]">
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
