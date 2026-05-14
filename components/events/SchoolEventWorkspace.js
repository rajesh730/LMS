"use client";

import { useEffect, useState } from "react";
import EventEditorForm from "./EventEditorForm";
import EventHub from "./EventHub";
import SchoolEventInvitations from "./SchoolEventInvitations";
import SchoolOwnedEventsManager from "./SchoolOwnedEventsManager";

const PLATFORM_TABS = [
  { id: "invitations", label: "Invitations" },
  { id: "events", label: "Active Competitions" },
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
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-2">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSection(tab.id)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                selectedSection === tab.id
                  ? "bg-emerald-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {mode === "platform" && selectedSection === "invitations" && (
        <SchoolEventInvitations
          refreshKey={refreshKey}
          onChanged={() => setRefreshKey((value) => value + 1)}
        />
      )}

      {mode === "platform" && selectedSection === "events" && (
        <EventHub
          refreshKey={refreshKey}
          eventScope="PLATFORM"
          lifecycleFilter="ACTIVE"
          title="Active Competitions"
          description="Manage your school's active platform competitions, team registration, and round progress."
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
          filters={[{ id: "completed", label: "Final Results" }]}
        />
      )}

      {mode === "school" && selectedSection === "create" && (
        <EventEditorForm
          teachers={teachers}
          ownerMode="school"
          showFeaturedOnLanding={false}
          onEventCreated={() => {
            setRefreshKey((value) => value + 1);
            setActiveSection("hosted");
          }}
        />
      )}

      {mode === "school" && selectedSection === "hosted" && (
        <SchoolOwnedEventsManager
          teachers={teachers}
          refreshKey={refreshKey}
          onChanged={() => setRefreshKey((value) => value + 1)}
        />
      )}
    </div>
  );
}
