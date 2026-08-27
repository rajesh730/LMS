"use client";

import { useEffect, useState } from "react";
import { FiClock } from "react-icons/fi";
import SettingsAuditPanel from "@/components/settings/SettingsAuditPanel";

export default function SchoolSettingsHistory() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const loadHistory = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await fetch("/api/school/settings/audit", {
          cache: "no-store",
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || "Failed to load settings history");
        }
        if (active) setEntries(data.data || []);
      } catch (loadError) {
        if (active) {
          setError(loadError.message || "Failed to load settings history");
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadHistory();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        <h1 className="flex items-center gap-3 text-3xl font-bold text-white">
          <FiClock className="text-blue-400" />
          History
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-400">
          Review changes made to your school profile, contact information, and
          settings.
        </p>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      ) : (
        <SettingsAuditPanel
          title="Recent Changes"
          description="Recent school settings updates help you track profile and configuration changes."
          entries={entries}
          loading={loading}
        />
      )}
    </div>
  );
}
