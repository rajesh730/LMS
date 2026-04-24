"use client";

import { useEffect, useState } from "react";
import EventEditorForm from "./EventEditorForm";
import EventHub from "./EventHub";
import SchoolEventInvitations from "./SchoolEventInvitations";
import SchoolOwnedEventsManager from "./SchoolOwnedEventsManager";

export default function SchoolEventWorkspace() {
  const [groups, setGroups] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const loadDependencies = async () => {
      try {
        const [groupsRes, teachersRes] = await Promise.all([
          fetch("/api/groups", { cache: "no-store" }),
          fetch("/api/teachers?limit=200", { cache: "no-store" }),
        ]);

        if (groupsRes.ok) {
          const groupsData = await groupsRes.json();
          setGroups(Array.isArray(groupsData.groups) ? groupsData.groups : []);
        } else {
          setGroups([]);
        }

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
        setGroups([]);
        setTeachers([]);
      }
    };

    loadDependencies();
  }, []);

  return (
    <div className="space-y-6">
      <EventEditorForm
        groups={groups}
        teachers={teachers}
        ownerMode="school"
        showFeaturedOnLanding={false}
        onEventCreated={() => setRefreshKey((value) => value + 1)}
      />
      <SchoolEventInvitations
        refreshKey={refreshKey}
        onChanged={() => setRefreshKey((value) => value + 1)}
      />
      <SchoolOwnedEventsManager
        groups={groups}
        teachers={teachers}
        refreshKey={refreshKey}
        onChanged={() => setRefreshKey((value) => value + 1)}
      />
      <EventHub refreshKey={refreshKey} />
    </div>
  );
}
