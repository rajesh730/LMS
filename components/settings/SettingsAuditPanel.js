"use client";

import AppDate from "@/components/common/AppDate";

function summarizeChanges(before, after) {
  if (!before || !after) return "Updated settings";

  const changes = [];

  const walk = (left, right, prefix = "") => {
    const keys = new Set([
      ...Object.keys(left || {}),
      ...Object.keys(right || {}),
    ]);

    keys.forEach((key) => {
      const nextPrefix = prefix ? `${prefix}.${key}` : key;
      const beforeValue = left?.[key];
      const afterValue = right?.[key];

      if (
        beforeValue &&
        afterValue &&
        typeof beforeValue === "object" &&
        typeof afterValue === "object" &&
        !Array.isArray(beforeValue) &&
        !Array.isArray(afterValue)
      ) {
        walk(beforeValue, afterValue, nextPrefix);
        return;
      }

      if (JSON.stringify(beforeValue) !== JSON.stringify(afterValue)) {
        changes.push(nextPrefix);
      }
    });
  };

  walk(before, after);
  return changes.length > 0 ? changes.slice(0, 4) : ["Updated settings"];
}

export default function SettingsAuditPanel({
  title,
  description,
  entries = [],
  loading = false,
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      <p className="mt-2 text-sm text-slate-400">{description}</p>

      {loading ? (
        <p className="mt-4 text-sm text-slate-500">Loading recent activity...</p>
      ) : entries.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">
          No settings changes have been recorded yet.
        </p>
      ) : (
        <div className="mt-5 space-y-3">
          {entries.map((entry) => {
            const changes = summarizeChanges(entry.before, entry.after);
            return (
              <div
                key={entry._id}
                className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
              >
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {entry.performedBy?.name || "System"}{" "}
                      <span className="font-normal text-slate-400">
                        ({entry.role || "Unknown role"})
                      </span>
                    </p>
                    <p className="text-xs text-slate-500">
                      {entry.performedBy?.email || "No email available"}
                    </p>
                  </div>
                  <p className="text-xs text-slate-500">
                    <AppDate value={entry.createdAt} mode="dateTime" fallback="Unknown time" />
                  </p>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {changes.map((change) => (
                    <span
                      key={change}
                      className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-300"
                    >
                      {change}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
