"use client";

import { useState } from "react";
import { FaCalendarAlt, FaCheckCircle, FaSchool } from "react-icons/fa";
import EventHub from "@/components/events/EventHub";

const REGISTERED_FILTERS = [
  { id: "participated", label: "All Registered" },
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
];

const DISCOVERY_FILTERS = [
  { id: "all", label: "All Available" },
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Registered" },
];

export default function StudentEventWorkspace() {
  const [activeTab, setActiveTab] = useState("registered");

  const tabs = [
    {
      id: "registered",
      label: "My Registered Events",
      icon: FaCheckCircle,
    },
    {
      id: "platform",
      label: "Platform Competitions",
      icon: FaCalendarAlt,
    },
    {
      id: "school",
      label: "School Events",
      icon: FaSchool,
    },
  ];

  return (
    <div className="space-y-6 text-slate-200">
        <div>
          <h1 className="text-4xl font-bold text-white">Student Events</h1>
          <p className="mt-2 text-slate-400">
            See what you are registered for, discover platform competitions, and
            join school events from one clear place.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-2">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                    activeTab === tab.id
                      ? "bg-blue-600 text-white"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <Icon />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {activeTab === "registered" && (
          <EventHub
            defaultFilter="participated"
            filters={REGISTERED_FILTERS}
            title="My Registered Events"
            description="Track your registrations, round notices, submissions, results, and certificates."
          />
        )}

        {activeTab === "platform" && (
          <EventHub
            eventScope="PLATFORM"
            filters={DISCOVERY_FILTERS}
            title="Platform Competitions"
            description="Inter-school competitions organized by the platform or approved partners."
          />
        )}

        {activeTab === "school" && (
          <EventHub
            eventScope="SCHOOL"
            filters={DISCOVERY_FILTERS}
            title="School Events"
            description="Events created by your school for internal participation, auditions, showcases, and other school activities."
          />
        )}
    </div>
  );
}
