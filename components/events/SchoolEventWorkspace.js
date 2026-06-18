"use client";

import { useEffect, useState } from "react";
import EventEditorForm from "./EventEditorForm";
import SchoolOwnedEventsManager from "./SchoolOwnedEventsManager";

const SCHOOL_TABS = [
  { id: "hosted", label: "My School Events" },
  { id: "create", label: "Create School Event" },
];

export default function SchoolEventWorkspace() {
  const [teachers, setTeachers] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeSection, setActiveSection] = useState("hosted");
  const tabs = SCHOOL_TABS;
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
      {selectedSection === "create" && (
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
            onEventCreated={() => {
              setRefreshKey((value) => value + 1);
              setActiveSection("hosted");
            }}
          />
        </div>
      )}

      {selectedSection === "hosted" && (
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
