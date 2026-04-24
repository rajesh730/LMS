"use client";

import { useState } from "react";
import StudentTalentProfileManager from "./StudentTalentProfileManager";
import StudentTalentSubmissionManager from "./StudentTalentSubmissionManager";

export default function StudentTalentWorkspace() {
  const [activeTab, setActiveTab] = useState("profile");

  return (
    <div className="space-y-6">
      <div className="flex gap-3 border-b border-slate-800 pb-3 overflow-x-auto">
        {[
          ["profile", "Talent Profile"],
          ["submissions", "Submissions"],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`px-4 py-2 rounded-xl whitespace-nowrap transition ${
              activeTab === id
                ? "bg-blue-600 text-white"
                : "bg-slate-900 text-slate-300 hover:bg-slate-800"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === "profile" && <StudentTalentProfileManager />}
      {activeTab === "submissions" && <StudentTalentSubmissionManager />}
    </div>
  );
}
