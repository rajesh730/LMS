"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FaArrowLeft,
  FaCalendarAlt,
  FaDownload,
  FaPhone,
  FaSearch,
  FaUser,
  FaUsers,
} from "react-icons/fa";
import { isTeamEventLike } from "@/lib/eventParticipationFormat";
import AlertBanner from "@/components/ui/AlertBanner";
import AppDate from "@/components/common/AppDate";

function buildIndividualEntries(requests = []) {
  const buckets = new Map();

  requests.forEach((request) => {
    const schoolId = String(request.school?._id || request.school || "");
    if (!schoolId) return;

    if (!buckets.has(schoolId)) {
      buckets.set(schoolId, {
        key: schoolId,
        school: request.school || null,
        contactPerson: request.contactPerson || "",
        contactPhone: request.contactPhone || "",
        notes: request.notes || "",
        joinedAt:
          request.requestedAt ||
          request.approvedAt ||
          request.enrollmentConfirmedAt ||
          null,
        captainStudent: null,
        teamName: "",
        members: [],
      });
    }

    const bucket = buckets.get(schoolId);
    bucket.contactPerson = bucket.contactPerson || request.contactPerson || "";
    bucket.contactPhone = bucket.contactPhone || request.contactPhone || "";
    bucket.notes = bucket.notes || request.notes || "";
    if (request.student) {
      bucket.members.push(request.student);
    }
  });

  return Array.from(buckets.values()).map((bucket) => ({
    ...bucket,
    memberCount: bucket.members.length,
  }));
}

function buildTeamEntries(requests = []) {
  const buckets = new Map();

  requests.forEach((request) => {
    const schoolId = String(request.school?._id || request.school || "");
    const teamName = String(request.teamName || "").trim() || "Unnamed Team";
    const key = `${schoolId}::${teamName.toLowerCase()}`;
    if (!schoolId) return;

    if (!buckets.has(key)) {
      buckets.set(key, {
        key,
        school: request.school || null,
        contactPerson: request.contactPerson || "",
        contactPhone: request.contactPhone || "",
        notes: request.notes || "",
        joinedAt:
          request.requestedAt ||
          request.approvedAt ||
          request.enrollmentConfirmedAt ||
          null,
        captainStudent: request.captainStudent || null,
        teamName,
        members: [],
      });
    }

    const bucket = buckets.get(key);
    bucket.contactPerson = bucket.contactPerson || request.contactPerson || "";
    bucket.contactPhone = bucket.contactPhone || request.contactPhone || "";
    bucket.notes = bucket.notes || request.notes || "";
    bucket.captainStudent = bucket.captainStudent || request.captainStudent || null;
    if (request.student) {
      bucket.members.push(request.student);
    }
  });

  return Array.from(buckets.values()).map((bucket) => ({
    ...bucket,
    memberCount: bucket.members.length,
  }));
}

export default function EventParticipantsView({ event, onBack }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [detail, setDetail] = useState(null);

  const fetchDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`/api/events/${event._id}/manage`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to load participants");
      }
      setDetail(data);
    } catch (fetchError) {
      console.error(fetchError);
      setError(fetchError.message || "Failed to load participants");
    } finally {
      setLoading(false);
    }
  }, [event._id]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const eventMeta = detail?.event || event;
  const isTeamEvent = isTeamEventLike(eventMeta);

  // Enrolled participants only — registration enrolls directly, so there is no
  // pending/approved/rejected review.
  const activeRequests = useMemo(
    () => [
      ...((detail?.requests?.APPROVED) || []),
      ...((detail?.requests?.ENROLLED) || []),
    ],
    [detail?.requests]
  );

  const groupedEntries = useMemo(
    () =>
      isTeamEvent
        ? buildTeamEntries(activeRequests)
        : buildIndividualEntries(activeRequests),
    [activeRequests, isTeamEvent]
  );

  const filteredParticipants = groupedEntries.filter((participant) => {
    const term = searchTerm.toLowerCase();
    return (
      participant.school?.schoolName?.toLowerCase().includes(term) ||
      participant.contactPerson?.toLowerCase().includes(term) ||
      participant.teamName?.toLowerCase().includes(term) ||
      !searchTerm
    );
  });

  const totalMembers = groupedEntries.reduce(
    (sum, entry) => sum + entry.memberCount,
    0
  );

  const exportToCSV = () => {
    if (filteredParticipants.length === 0) {
      setFeedback({
        type: "warning",
        title: "No rows to export",
        message: "Change the search query before exporting.",
      });
      return;
    }

    const headers = isTeamEvent
      ? "School,Team,Captain,Members,Contact Person,Phone,Joined Date,Notes"
      : "School,Contact Person,Phone,Students,Joined Date,Notes";

    const rows = filteredParticipants.map((participant) => {
      const schoolName = participant.school?.schoolName || "Unknown School";
      const joinDate = participant.joinedAt
        ? new Date(participant.joinedAt).toLocaleDateString()
        : "";
      const memberNames = participant.members
        .map((member) => member?.name || "Unknown")
        .join(" | ");
      if (isTeamEvent) {
        return `"${schoolName}","${participant.teamName || ""}","${
          participant.captainStudent?.name || ""
        }","${memberNames}","${participant.contactPerson || ""}","${
          participant.contactPhone || ""
        }","${joinDate}","${participant.notes || ""}"`;
      }
      return `"${schoolName}","${participant.contactPerson || ""}","${
        participant.contactPhone || ""
      }","${memberNames}","${joinDate}","${participant.notes || ""}"`;
    });

    const csvContent =
      "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `${event.title.replace(/[^a-z0-9]/gi, "_")}_${isTeamEvent ? "teams" : "participants"}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
        <div>
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-400 hover:text-white mb-2 transition-colors"
          >
            <FaArrowLeft /> Back to Events
          </button>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            {eventMeta.title}
            <span className="text-sm font-normal bg-slate-800 text-slate-300 px-3 py-1 rounded-full border border-slate-700">
              {isTeamEvent ? "Team Roster" : "Participant Roster"}
            </span>
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Registered {isTeamEvent ? "teams" : "students"} are enrolled
            automatically. This is a read-only roster.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg transition border border-slate-700"
          >
            <FaDownload /> Export CSV
          </button>
        </div>
      </div>

      {feedback && (
        <AlertBanner
          type={feedback.type}
          title={feedback.title}
          message={feedback.message}
        />
      )}

      {loading ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center text-slate-400">
          Loading participant details...
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-200">
          {error}
        </div>
      ) : (
        <div className="bg-slate-900/50 rounded-2xl border border-slate-800 overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder={
                  isTeamEvent
                    ? "Search school, team, or contact person..."
                    : "Search schools or contact persons..."
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-blue-500 transition"
              />
            </div>
            <div className="text-slate-400 text-sm">
              {totalMembers} {isTeamEvent ? "member" : "student"}
              {totalMembers === 1 ? "" : "s"} • {filteredParticipants.length}{" "}
              {isTeamEvent ? "teams" : "schools"}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-slate-400 border-b border-slate-800 text-xs uppercase tracking-wider bg-slate-950/50">
                  <th className="p-4 font-medium">School</th>
                  {isTeamEvent && <th className="p-4 font-medium">Team</th>}
                  <th className="p-4 font-medium">Contact</th>
                  <th className="p-4 font-medium">
                    {isTeamEvent ? "Members" : "Students"}
                  </th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-800">
                {filteredParticipants.length === 0 ? (
                  <tr>
                    <td
                      colSpan={isTeamEvent ? 4 : 3}
                      className="p-8 text-center text-slate-500"
                    >
                      No registered participants yet.
                    </td>
                  </tr>
                ) : (
                  filteredParticipants.map((participant) => (
                    <tr key={participant.key} className="hover:bg-slate-800/50 transition">
                      <td className="p-4 align-top">
                        <div className="font-medium text-white text-base mb-1">
                          {participant.school?.schoolName || "Unknown School"}
                        </div>
                        <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                          <FaCalendarAlt className="text-slate-500" />
                          <span>
                            Joined <AppDate value={participant.joinedAt} fallback="N/A" />
                          </span>
                        </div>
                        {participant.notes && (
                          <p className="text-slate-500 text-xs italic mt-2 bg-slate-950/50 p-2 rounded border border-slate-800">
                            &quot;{participant.notes}&quot;
                          </p>
                        )}
                      </td>

                      {isTeamEvent && (
                        <td className="p-4 align-top">
                          <div className="font-medium text-white">
                            {participant.teamName}
                          </div>
                          <div className="mt-2 text-xs text-slate-400">
                            {participant.captainStudent?.name ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-emerald-200">
                                <FaUser />
                                Captain: {participant.captainStudent.name}
                              </span>
                            ) : (
                              "Captain not set"
                            )}
                          </div>
                        </td>
                      )}

                      <td className="p-4 align-top">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-slate-300">
                            <FaUser className="text-slate-500 text-xs" />
                            <span>{participant.contactPerson || "Not provided"}</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-300">
                            <FaPhone className="text-slate-500 text-xs" />
                            <span>{participant.contactPhone || "Not provided"}</span>
                          </div>
                        </div>
                      </td>

                      <td className="p-4 align-top">
                        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950/60 px-3 py-1 text-xs font-semibold text-slate-200">
                          <FaUsers />
                          {participant.memberCount}{" "}
                          {participant.memberCount === 1 ? "member" : "members"}
                        </div>
                        <div className="space-y-1">
                          {participant.members.map((student, index) => (
                            <div
                              key={`${participant.key}-member-${index}`}
                              className="text-slate-300 text-xs rounded border border-slate-800 bg-slate-950/50 px-2 py-1"
                            >
                              {student?.name || "Unknown"}{" "}
                              {student?.grade ? (
                                <span className="text-slate-500">• {student.grade}</span>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
