"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FaArrowLeft,
  FaCalendarAlt,
  FaCheck,
  FaDownload,
  FaPhone,
  FaSearch,
  FaSpinner,
  FaTimes,
  FaUndo,
  FaUser,
  FaUsers,
} from "react-icons/fa";
import { isTeamEventLike } from "@/lib/eventParticipationFormat";

function normalizeStatus(statuses = []) {
  const normalized = statuses.map((status) => String(status || "").toUpperCase());
  if (normalized.includes("APPROVED") || normalized.includes("ENROLLED")) {
    return "APPROVED";
  }
  if (normalized.includes("PENDING")) {
    return "PENDING";
  }
  if (normalized.includes("REJECTED")) {
    return "REJECTED";
  }
  return normalized[0] || "PENDING";
}

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
        statuses: [],
        requestIds: [],
      });
    }

    const bucket = buckets.get(schoolId);
    bucket.contactPerson = bucket.contactPerson || request.contactPerson || "";
    bucket.contactPhone = bucket.contactPhone || request.contactPhone || "";
    bucket.notes = bucket.notes || request.notes || "";
    bucket.statuses.push(request.status);
    bucket.requestIds.push(String(request._id));
    if (request.student) {
      bucket.members.push(request.student);
    }
  });

  return Array.from(buckets.values()).map((bucket) => ({
    ...bucket,
    memberCount: bucket.members.length,
    status: normalizeStatus(bucket.statuses),
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
        statuses: [],
        requestIds: [],
      });
    }

    const bucket = buckets.get(key);
    bucket.contactPerson = bucket.contactPerson || request.contactPerson || "";
    bucket.contactPhone = bucket.contactPhone || request.contactPhone || "";
    bucket.notes = bucket.notes || request.notes || "";
    bucket.captainStudent = bucket.captainStudent || request.captainStudent || null;
    bucket.statuses.push(request.status);
    bucket.requestIds.push(String(request._id));
    if (request.student) {
      bucket.members.push(request.student);
    }
  });

  return Array.from(buckets.values()).map((bucket) => ({
    ...bucket,
    memberCount: bucket.members.length,
    status: normalizeStatus(bucket.statuses),
  }));
}

export default function EventParticipantsView({ event, onBack }) {
  const [filter, setFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [processingId, setProcessingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
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
  const allRequests = useMemo(
    () => [
      ...((detail?.requests?.PENDING) || []),
      ...((detail?.requests?.APPROVED) || []),
      ...((detail?.requests?.ENROLLED) || []),
      ...((detail?.requests?.REJECTED) || []),
    ],
    [detail?.requests]
  );

  const groupedEntries = useMemo(
    () =>
      isTeamEvent
        ? buildTeamEntries(allRequests)
        : buildIndividualEntries(allRequests),
    [allRequests, isTeamEvent]
  );

  const filteredParticipants = groupedEntries.filter((participant) => {
    const matchesFilter = filter === "ALL" || participant.status === filter;
    const matchesSearch =
      participant.school?.schoolName
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      participant.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      participant.teamName?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const stats = {
    total: groupedEntries.length,
    pending: groupedEntries.filter((participant) => participant.status === "PENDING")
      .length,
    approved: groupedEntries.filter((participant) => participant.status === "APPROVED")
      .length,
    rejected: groupedEntries.filter((participant) => participant.status === "REJECTED")
      .length,
  };

  const handleApprove = async (participant, action) => {
    if (!confirm(`Are you sure you want to ${action} this ${isTeamEvent ? "team" : "school"}?`)) {
      return;
    }

    const requestIds = participant.requestIds || [];
    const schoolId = participant.school?._id;

    if (requestIds.length === 0 && !schoolId) {
      alert("No requests found to process");
      return;
    }

    setProcessingId(participant.key);

    try {
      const res = await fetch(`/api/events/${event._id}/approve`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestIds, action, schoolId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to update participant status");
      }
      await fetchDetails();
    } catch (requestError) {
      console.error(requestError);
      alert(requestError.message || "Error processing request");
    } finally {
      setProcessingId(null);
    }
  };

  const exportToCSV = () => {
    if (filteredParticipants.length === 0) {
      alert("No participant rows to export");
      return;
    }

    const headers = isTeamEvent
      ? "School,Team,Captain,Members,Contact Person,Phone,Status,Joined Date,Notes"
      : "School,Contact Person,Phone,Students,Status,Joined Date,Notes";

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
        }","${participant.status}","${joinDate}","${participant.notes || ""}"`;
      }
      return `"${schoolName}","${participant.contactPerson || ""}","${
        participant.contactPhone || ""
      }","${memberNames}","${participant.status}","${joinDate}","${
        participant.notes || ""
      }"`;
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
              {isTeamEvent ? "Team Participants" : "Participants Management"}
            </span>
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            {isTeamEvent
              ? "Review and approve school team registrations with captain and roster details."
              : "Review and approve school participant registrations."}
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

      {loading ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center text-slate-400">
          Loading participant details...
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-200">
          {error}
        </div>
      ) : (
        <>
          <div className="space-y-4">
            <div className="flex bg-slate-800 p-1 rounded-lg w-fit">
              {["ALL", "PENDING", "APPROVED", "REJECTED"].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition whitespace-nowrap ${
                    filter === status
                      ? "bg-blue-600 text-white shadow-lg"
                      : "text-slate-400 hover:text-white hover:bg-slate-700"
                  }`}
                >
                  {status === "ALL"
                    ? "All"
                    : status.charAt(0) + status.slice(1).toLowerCase()}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {[
                { id: "ALL", label: isTeamEvent ? "Teams" : "Schools", value: stats.total, tone: "text-white" },
                { id: "PENDING", label: "Pending", value: stats.pending, tone: "text-yellow-400" },
                { id: "APPROVED", label: "Approved", value: stats.approved, tone: "text-emerald-400" },
                { id: "REJECTED", label: "Rejected", value: stats.rejected, tone: "text-red-400" },
              ].map((card) => (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => setFilter(card.id)}
                  className={`cursor-pointer rounded-xl border p-4 text-left transition-all ${
                    filter === card.id
                      ? "border-blue-500/50 ring-1 ring-blue-500/50 bg-blue-600/10"
                      : "border-slate-800 bg-slate-900/50 hover:border-slate-700"
                  }`}
                >
                  <div className="text-slate-400 text-xs uppercase font-bold tracking-wider mb-1">
                    {card.label}
                  </div>
                  <div className={`text-2xl font-bold ${card.tone}`}>{card.value}</div>
                </button>
              ))}
            </div>
          </div>

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
                Showing {filteredParticipants.length} results
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
                    <th className="p-4 font-medium">Status</th>
                    <th className="p-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-slate-800">
                  {filteredParticipants.length === 0 ? (
                    <tr>
                      <td
                        colSpan={isTeamEvent ? 6 : 5}
                        className="p-8 text-center text-slate-500"
                      >
                        No participant rows found matching your filters.
                      </td>
                    </tr>
                  ) : (
                    filteredParticipants.map((participant) => (
                      <tr
                        key={participant.key}
                        className="hover:bg-slate-800/50 transition group"
                      >
                        <td className="p-4 align-top">
                          <div className="font-medium text-white text-base mb-1">
                            {participant.school?.schoolName || "Unknown School"}
                          </div>
                          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                            <FaCalendarAlt className="text-slate-500" />
                            <span>
                              Joined{" "}
                              {participant.joinedAt
                                ? new Date(participant.joinedAt).toLocaleDateString()
                                : "N/A"}
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

                        <td className="p-4 align-top">
                          {participant.status === "PENDING" && (
                            <span className="inline-flex items-center gap-1.5 text-xs bg-yellow-500/10 text-yellow-400 px-2.5 py-1 rounded-full border border-yellow-500/20 font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse"></span>
                              Pending
                            </span>
                          )}
                          {participant.status === "APPROVED" && (
                            <span className="inline-flex items-center gap-1.5 text-xs bg-green-500/10 text-green-400 px-2.5 py-1 rounded-full border border-green-500/20 font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                              Approved
                            </span>
                          )}
                          {participant.status === "REJECTED" && (
                            <span className="inline-flex items-center gap-1.5 text-xs bg-red-500/10 text-red-400 px-2.5 py-1 rounded-full border border-red-500/20 font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                              Rejected
                            </span>
                          )}
                        </td>

                        <td className="p-4 align-top text-right">
                          <div className="flex flex-col gap-2 items-end w-32 ml-auto">
                            {(participant.status === "PENDING" ||
                              participant.status === "REJECTED") && (
                              <button
                                onClick={() => handleApprove(participant, "approve")}
                                disabled={processingId === participant.key}
                                className="w-full px-3 py-1.5 bg-green-600/20 text-green-400 rounded hover:bg-green-600/30 transition flex items-center justify-center gap-2 text-xs font-medium border border-green-600/20 disabled:opacity-50"
                              >
                                {processingId === participant.key ? (
                                  <FaSpinner className="animate-spin" />
                                ) : (
                                  <FaCheck />
                                )}
                                Approve
                              </button>
                            )}
                            {(participant.status === "PENDING" ||
                              participant.status === "APPROVED") && (
                              <button
                                onClick={() => handleApprove(participant, "reject")}
                                disabled={processingId === participant.key}
                                className="w-full px-3 py-1.5 bg-red-600/20 text-red-400 rounded hover:bg-red-600/30 transition flex items-center justify-center gap-2 text-xs font-medium border border-red-600/20 disabled:opacity-50"
                              >
                                {processingId === participant.key ? (
                                  <FaSpinner className="animate-spin" />
                                ) : (
                                  <FaTimes />
                                )}
                                Reject
                              </button>
                            )}
                            {(participant.status === "APPROVED" ||
                              participant.status === "REJECTED") && (
                              <button
                                onClick={() => handleApprove(participant, "pending")}
                                disabled={processingId === participant.key}
                                className="w-full px-3 py-1.5 bg-yellow-600/20 text-yellow-400 rounded hover:bg-yellow-600/30 transition flex items-center justify-center gap-2 text-xs font-medium border border-yellow-600/20 disabled:opacity-50"
                              >
                                {processingId === participant.key ? (
                                  <FaSpinner className="animate-spin" />
                                ) : (
                                  <FaUndo />
                                )}
                                Pending
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
