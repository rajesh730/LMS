"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FaExternalLinkAlt, FaSchool, FaSearch, FaTrophy } from "react-icons/fa";
import { formatPlacement } from "@/lib/displayFormat";

function placementTone(value) {
  const placement = String(value || "").toUpperCase();
  if (placement === "WINNER") return "bg-amber-50 text-amber-800";
  if (placement === "RUNNER_UP") return "bg-blue-50 text-blue-800";
  if (placement === "THIRD_PLACE") return "bg-orange-50 text-orange-800";
  if (placement === "PARTICIPANT") return "bg-emerald-50 text-emerald-800";
  if (placement === "FINALIST") return "bg-purple-50 text-purple-800";
  return "bg-slate-100 text-slate-700";
}

export default function PublicResultsTable({ achievements = [], resultsPublished }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [placementFilter, setPlacementFilter] = useState("all");

  const placementOptions = useMemo(() => {
    const placements = new Set();
    achievements.forEach((achievement) => {
      if (achievement.placement) placements.add(String(achievement.placement));
    });
    return Array.from(placements);
  }, [achievements]);

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return achievements.filter((achievement) => {
      if (placementFilter !== "all" && achievement.placement !== placementFilter) {
        return false;
      }
      if (!term) return true;
      const name = (achievement.studentName || "").toLowerCase();
      const school = (achievement.schoolName || "").toLowerCase();
      return name.includes(term) || school.includes(term);
    });
  }, [achievements, searchTerm, placementFilter]);

  const hasResults = resultsPublished && achievements.length > 0;

  return (
    <section id="results" className="rounded-xl border border-[#e6eaf7] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="inline-flex items-center gap-2 text-base font-black text-[#10142f]">
          <FaTrophy className="text-[#d98b00]" />
          Results
        </h2>
        {hasResults && (
          <span className="rounded-full bg-[#f4f1ff] px-3 py-1 text-xs font-black text-[#4326e8]">
            {filtered.length} of {achievements.length}
          </span>
        )}
      </div>

      {!resultsPublished ? (
        <p className="mt-4 rounded-lg bg-[#f8f9fd] p-4 text-sm font-semibold text-[#526071]">
          Results are not published yet.
        </p>
      ) : achievements.length === 0 ? (
        <p className="mt-4 rounded-lg bg-[#f8f9fd] p-4 text-sm font-semibold text-[#526071]">
          No public result records are available yet.
        </p>
      ) : (
        <>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <FaSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#94a3b8]" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by student or school name..."
                className="w-full rounded-lg border border-[#e6eaf7] bg-[#f8f9fd] py-2 pl-9 pr-3 text-sm font-semibold text-[#10142f] outline-none focus:border-[#4326e8]"
              />
            </div>
            {placementOptions.length > 1 && (
              <select
                value={placementFilter}
                onChange={(e) => setPlacementFilter(e.target.value)}
                className="rounded-lg border border-[#e6eaf7] bg-[#f8f9fd] px-3 py-2 text-sm font-semibold text-[#10142f] outline-none focus:border-[#4326e8] sm:w-48"
              >
                <option value="all">All placements</option>
                {placementOptions.map((placement) => (
                  <option key={placement} value={placement}>
                    {formatPlacement(placement)}
                  </option>
                ))}
              </select>
            )}
          </div>

          {filtered.length === 0 ? (
            <p className="mt-4 rounded-lg bg-[#f8f9fd] p-4 text-sm font-semibold text-[#526071]">
              No results match your search.
            </p>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden sm:block mt-4 overflow-x-auto rounded-lg border border-[#e6eaf7]">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-[#f8f9fd] text-[#526071]">
                    <tr>
                      <th className="px-4 py-3 font-black">Student</th>
                      <th className="px-4 py-3 font-black">School</th>
                      <th className="px-4 py-3 font-black">Placement</th>
                      <th className="px-4 py-3 font-black">Certificate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e6eaf7]">
                    {filtered.map((achievement) => (
                      <tr key={achievement._id}>
                        <td className="px-4 py-3 font-bold text-[#10142f]">
                          {achievement.studentName}
                        </td>
                        <td className="px-4 py-3">
                          {achievement.schoolId ? (
                            <Link
                              href={`/schools/${achievement.schoolId}`}
                              className="font-semibold text-[#0a2f66] hover:text-[#4326e8]"
                            >
                              {achievement.schoolName || "School"}
                            </Link>
                          ) : (
                            <span className="text-[#526071]">School</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2.5 py-1 text-[10px] font-black ${placementTone(
                              achievement.placement
                            )}`}
                          >
                            {formatPlacement(achievement.placement)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {achievement.certificateUrl ? (
                            <a
                              href={achievement.certificateUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-black text-[#4326e8]"
                            >
                              View certificate
                              <FaExternalLinkAlt />
                            </a>
                          ) : (
                            <span className="text-[#8a9ab1]">Not public</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card-based View */}
              <div className="block sm:hidden mt-4 space-y-3">
                {filtered.map((achievement) => (
                  <div
                    key={achievement._id}
                    className="rounded-xl border border-[#e6eaf7] p-4 bg-[#f8f9fd] shadow-sm flex flex-col gap-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-[#10142f] text-sm truncate">
                        {achievement.studentName}
                      </span>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[9px] font-black uppercase ${placementTone(
                          achievement.placement
                        )}`}
                      >
                        {formatPlacement(achievement.placement)}
                      </span>
                    </div>
                    <div className="text-xs text-[#526071] flex items-center gap-1.5">
                      <FaSchool className="text-[#4326e8] shrink-0" />
                      {achievement.schoolId ? (
                        <Link
                          href={`/schools/${achievement.schoolId}`}
                          className="font-semibold text-[#0a2f66] hover:text-[#4326e8] truncate"
                        >
                          {achievement.schoolName || "School"}
                        </Link>
                      ) : (
                        <span className="truncate">School</span>
                      )}
                    </div>
                    {achievement.certificateUrl && (
                      <div className="mt-1.5 pt-2 border-t border-[#e6eaf7] flex justify-end">
                        <a
                          href={achievement.certificateUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-black text-[#4326e8]"
                        >
                          View certificate
                          <FaExternalLinkAlt className="text-[10px]" />
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
