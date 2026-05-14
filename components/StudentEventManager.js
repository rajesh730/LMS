"use client";

import { useState } from "react";
import { FaCalendarAlt, FaCheckCircle } from "react-icons/fa";
import EventHub from "@/components/events/EventHub";

const AVAILABLE_FILTERS = [
  { id: "all", label: "All Available" },
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Registered" },
];

const REQUEST_FILTERS = [
  { id: "participated", label: "All Requests" },
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
];

export default function StudentEventManager() {
  const [activeTab, setActiveTab] = useState("available");

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <h3 className="mb-2 flex items-center gap-2 text-2xl font-bold text-white">
          <FaCalendarAlt className="text-blue-400" /> Events & Activities
        </h3>
        <p className="text-slate-400">
          Discover events, track approvals, and follow final outcomes from one
          place.
        </p>
      </div>

      <div className="flex gap-4 border-b border-slate-800">
        <button
          onClick={() => setActiveTab("available")}
          className={`px-6 py-3 font-semibold border-b-2 transition ${
            activeTab === "available"
              ? "border-blue-500 text-blue-400"
              : "border-transparent text-slate-400 hover:text-slate-300"
          }`}
        >
          Available Events
        </button>
        <button
          onClick={() => setActiveTab("requested")}
          className={`px-6 py-3 font-semibold border-b-2 transition ${
            activeTab === "requested"
              ? "border-emerald-500 text-emerald-400"
              : "border-transparent text-slate-400 hover:text-slate-300"
          }`}
        >
          <span className="inline-flex items-center gap-2">
            <FaCheckCircle /> My Requests
          </span>
        </button>
      </div>

      {activeTab === "available" ? (
        <EventHub
          filters={AVAILABLE_FILTERS}
          title="Available Events"
          description="Browse open events and request participation when available."
        />
      ) : (
        <EventHub
          defaultFilter="participated"
          filters={REQUEST_FILTERS}
          title="My Participation Requests"
          description="Track approval, registration progress, and published outcomes."
        />
      )}
    </div>
  );
}
