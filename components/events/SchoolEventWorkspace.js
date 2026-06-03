"use client";

import { useEffect, useState } from "react";
import EventEditorForm from "./EventEditorForm";
import EventHub from "./EventHub";
import SchoolEventInvitations from "./SchoolEventInvitations";
import SchoolOwnedEventsManager from "./SchoolOwnedEventsManager";

const PLATFORM_TABS = [
  { id: "invitations", label: "Invitations" },
  { id: "events", label: "Active Competitions" },
  { id: "disapproved", label: "Disapproved" },
  { id: "completed", label: "Final Results" },
];

const SCHOOL_TABS = [
  { id: "hosted", label: "My School Events" },
  { id: "create", label: "Create School Event" },
];

export default function SchoolEventWorkspace({ mode = "platform" }) {
  const [teachers, setTeachers] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeSection, setActiveSection] = useState(
    mode === "school" ? "hosted" : "invitations"
  );
  const tabs = mode === "school" ? SCHOOL_TABS : PLATFORM_TABS;
  const selectedSection = tabs.some((tab) => tab.id === activeSection)
    ? activeSection
    : tabs[0].id;

  useEffect(() => {
    const loadDependencies = async () => {
      try {
        const teachersRes = await fetch("/api/teachers?limit=200", {
          cache: "no-store",
        });

        if (teachersRes.ok) {
          const teachersData = await teachersRes.json();
          setTeachers(
            Array.isArray(teachersData.teachers) ? teachersData.teachers : []
          );
        } else {
          setTeachers([]);
        }
      } catch (error) {
        console.error("Failed to load school event dependencies", error);
        setTeachers([]);
      }
    };

    loadDependencies();
  }, []);

  return (
    <div className="space-y-6">
      {mode !== "school" && (
        <div className="rounded-2xl border border-[#d8e0f0] bg-white p-2 shadow-[0_10px_26px_rgba(10,47,102,0.05)]">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSection(tab.id)}
                className={`min-h-11 rounded-xl px-5 text-sm font-black transition ${
                  selectedSection === tab.id
                    ? "bg-[#4326e8] text-white shadow-[0_10px_20px_rgba(67,38,232,0.18)]"
                    : "text-[#4326e8] hover:bg-[#f8f6ff]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {mode === "platform" && selectedSection === "invitations" && (
        <SchoolEventInvitations
          refreshKey={refreshKey}
          status="PENDING"
          title="Invitations"
          description="Platform competitions waiting for your school decision."
          emptyTitle="No invitations waiting right now."
          emptyDescription="New platform competitions sent to your school will appear here."
          onChanged={() => setRefreshKey((value) => value + 1)}
        />
      )}

      {mode === "platform" && selectedSection === "events" && (
        <EventHub
          refreshKey={refreshKey}
          eventScope="PLATFORM"
          lifecycleFilter="ACTIVE"
          title="Active Competitions"
          description="Register participants and continue your school's competition management."
          defaultFilter="approved"
          showFilters={false}
        />
      )}

      {mode === "platform" && selectedSection === "disapproved" && (
        <SchoolEventInvitations
          refreshKey={refreshKey}
          status="DISAPPROVED"
          title="Disapproved Invitations"
          description="Platform competitions your school declined. Re-approve if this was a mistake."
          emptyTitle="No disapproved invitations."
          emptyDescription="Declined platform competitions will appear here for recovery."
          onChanged={() => setRefreshKey((value) => value + 1)}
        />
      )}

      {mode === "platform" && selectedSection === "completed" && (
        <EventHub
          refreshKey={refreshKey}
          eventScope="PLATFORM"
          lifecycleFilter="COMPLETED"
          completedView
          title="Final Results"
          description="Review your school's completed competition results first, then open certificates or the public result page."
          defaultFilter="completed"
          showFilters={false}
        />
      )}

      {mode === "school" && selectedSection === "create" && (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setActiveSection("hosted")}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#dbe5f4] bg-white px-4 text-sm font-black text-[#0a2f66] shadow-sm transition hover:bg-[#f8fbff]"
          >
            Back to school events
          </button>
          <EventEditorForm
            teachers={teachers}
            ownerMode="school"
            showFeaturedOnLanding={false}
            onEventCreated={() => {
              setRefreshKey((value) => value + 1);
              setActiveSection("hosted");
            }}
          />
        </div>
      )}

      {mode === "school" && selectedSection === "hosted" && (
        <SchoolOwnedEventsManager
          teachers={teachers}
          refreshKey={refreshKey}
          onCreate={() => setActiveSection("create")}
          onChanged={() => setRefreshKey((value) => value + 1)}
        />
      )}
    </div>
  );
}
