"use client";

import {
  FaArchive,
  FaBell,
  FaCertificate,
  FaClipboardList,
  FaEdit,
  FaGlobe,
  FaLayerGroup,
  FaUsers,
} from "react-icons/fa";
import RoundsTab from "./RoundsTab";
import EventOverviewTab from "./EventOverviewTab";
import EventResultsManager from "@/components/EventResultsManager";
import EventNoticeManager from "./EventNoticeManager";
import EventParticipationForm from "./EventParticipationForm";
import StudentEventCertificatesPanel from "./StudentEventCertificatesPanel";

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
  // Enrolled participants only — registration enrolls students directly, so the
  // roster is just who is in the event (no pending/approved/rejected review).
  const allRequests = [
    ...(requests.APPROVED || []),
    ...(requests.ENROLLED || []),
  ];
  const isPlatformCompetition = event.eventScope === "PLATFORM";
  // Students open this same dashboard read-only — they can view every tab but
  // edit nothing, and never see the Register Students tab.
  const isReadOnly = currentUserRole === "STUDENT";
  const isSuperAdminPlatformManager =
    currentUserRole === "SUPER_ADMIN" && isPlatformCompetition;
  const canControlEventOperations =
    !isPlatformCompetition || canManagePlatformOperations;
  const isCompletedEvent =
    event.resultsPublished ||
    ["COMPLETED", "ARCHIVED"].includes(
      String(event.lifecycleStatus || "ACTIVE").toUpperCase()
    );
  const availableTabs = [
    {
      id: "overview",
      label: "Overview",
      count: null,
      icon: FaClipboardList,
    },
    !isSuperAdminPlatformManager && !isReadOnly && {
      id: "registrations",
      label: "Register Students",
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
  // Only genuinely unique actions live here — navigation between sections is the
  // job of the tab bar above, so we don't duplicate those as buttons.
  const quickActions = [
    !isReadOnly &&
      canControlEventOperations &&
      !isCompletedEvent && { label: "Edit Event", icon: FaEdit, onClick: onEdit },
    !isReadOnly &&
      canControlEventOperations &&
      !isCompletedEvent && {
        label: "Archive Event",
        icon: FaArchive,
        onClick: onArchive,
        danger: true,
      },
  ].filter((action) => action && typeof action.onClick === "function");

  return (
    <div className="mb-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
      <div className="overflow-hidden rounded-xl border border-[#e1e7f2] bg-white shadow-[0_10px_28px_rgba(10,47,102,0.06)]">
        <div className="flex overflow-x-auto border-b border-[#e1e7f2] bg-white px-2">
          {availableTabs.map((tab) => {
            const Icon = tab.icon;
            const isSelected = selectedTab === tab.id;
            const hasCount = tab.count !== null;
            const hasParticipants = Number(tab.count || 0) > 0;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative inline-flex min-h-12 shrink-0 items-center gap-2 rounded-t-lg px-3 text-[13px] font-black transition sm:px-4 ${
                  isSelected
                    ? "bg-[#eef4f8] text-[#1f4e79] after:absolute after:bottom-0 after:left-2 after:right-2 after:h-[3px] after:rounded-full after:bg-[#1f4e79]"
                    : "text-[#0a2f66] hover:bg-[#f8fbff] hover:text-[#1f4e79]"
                }`}
              >
                <span
                  className={`inline-flex h-7 w-7 items-center justify-center rounded-lg text-xs transition ${
                    isSelected
                      ? "bg-white text-[#1f4e79] shadow-sm"
                      : "bg-[#f3f7fb] text-[#1f4e79]"
                  }`}
                >
                  <Icon />
                </span>
                {tab.label}
                {hasCount && (
                  <span
                    className={`inline-flex min-w-6 items-center justify-center rounded-full border px-2 py-0.5 text-[10px] font-black ${
                      hasParticipants
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-[#d6e2ea] bg-white text-[#1f4e79]"
                    }`}
                    title={`${tab.count} participant${tab.count === 1 ? "" : "s"}`}
                  >
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
            </div>
          )}

          {selectedTab === "rounds" && (
            <RoundsTab
              event={event}
              readOnly={isReadOnly}
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
              readOnly={isReadOnly}
            />
          )}

          {selectedTab === "results" && (
            isReadOnly ? (
              <StudentEventCertificatesPanel eventId={event.id || event._id} />
            ) : (
              <EventResultsManager
                fixedEventId={event.id || event._id}
                embedded
                readOnly={isReadOnly}
                title="Event Results & Certificates"
                description="Review the final placements and publish school-issued digital certificates."
              />
            )
          )}
        </div>
      </div>

      <aside className="space-y-3">
        {quickActions.length > 0 && (
        <div className="rounded-xl border border-[#e1e7f2] bg-white p-3 shadow-sm">
          <h3 className="mb-3 text-sm font-black text-[#17120a]">Event Actions</h3>
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
        )}

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
