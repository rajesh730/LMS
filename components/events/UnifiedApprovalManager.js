"use client";

import { useMemo, useState } from "react";
import {
  FaCheck,
  FaPhone,
  FaSearch,
  FaTimes,
  FaUndo,
  FaUser,
  FaUserGraduate,
} from "react-icons/fa";

function getSchoolLabel(request) {
  return (
    request.school?.schoolName ||
    request.school?.name ||
    request.school?.email ||
    "School"
  );
}

function getSchoolPhone(requests) {
  return requests.find((request) => request.contactPhone)?.contactPhone || "";
}

function getContactPerson(requests) {
  return requests.find((request) => request.contactPerson)?.contactPerson || "-";
}

function getSchoolStatus(requests) {
  if (requests.some((request) => ["APPROVED", "ENROLLED"].includes(request.status))) {
    return "APPROVED";
  }
  if (requests.every((request) => request.status === "REJECTED")) {
    return "REJECTED";
  }
  return "PENDING";
}

function statusChip(status) {
  if (status === "APPROVED") {
    return "border-[#2f7fdb]/20 bg-[#2f7fdb]/10 text-[#1150a1]";
  }
  if (status === "REJECTED") {
    return "border-[#ffb21c]/20 bg-[#ffb21c]/10 text-[#d97706]";
  }
  return "border-[#0a2f66]/20 bg-[#0a2f66]/10 text-[#0a2f66]";
}

export default function UnifiedApprovalManager({ requests, event, onDataChange }) {
  const [filter, setFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [loadingAction, setLoadingAction] = useState("");

  const groupedParticipants = useMemo(() => {
    const grouped = new Map();
    const needle = searchTerm.trim().toLowerCase();

    for (const request of requests) {
      const schoolId = String(request.school?._id || request.school || "");
      const schoolName = getSchoolLabel(request);
      const matchesFilter = filter === "ALL" || request.status === filter;
      const matchesSearch =
        !needle ||
        schoolName.toLowerCase().includes(needle) ||
        String(request.contactPerson || "").toLowerCase().includes(needle) ||
        String(request.student?.name || "").toLowerCase().includes(needle);

      if (!matchesFilter || !matchesSearch) continue;

      if (!grouped.has(schoolId)) {
        grouped.set(schoolId, {
          schoolId,
          schoolName,
          requests: [],
        });
      }
      grouped.get(schoolId).requests.push(request);
    }

    return Array.from(grouped.values()).sort((a, b) =>
      a.schoolName.localeCompare(b.schoolName)
    );
  }, [filter, requests, searchTerm]);

  const stats = useMemo(() => {
    const schoolMap = new Map();
    for (const request of requests) {
      const schoolId = String(request.school?._id || request.school || "");
      if (!schoolMap.has(schoolId)) {
        schoolMap.set(schoolId, []);
      }
      schoolMap.get(schoolId).push(request);
    }

    const schools = Array.from(schoolMap.values());
    return {
      total: schools.length,
      pending: schools.filter((schoolRequests) => getSchoolStatus(schoolRequests) === "PENDING")
        .length,
      approved: schools.filter((schoolRequests) => getSchoolStatus(schoolRequests) === "APPROVED")
        .length,
      rejected: schools.filter((schoolRequests) => getSchoolStatus(schoolRequests) === "REJECTED")
        .length,
    };
  }, [requests]);

  const updateSchoolStatus = async (schoolRequests, action) => {
    try {
      setLoadingAction(`${action}-${schoolRequests[0]?._id}`);
      const res = await fetch(`/api/events/${event._id}/approve`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestIds: schoolRequests.map((request) => request._id),
          action,
          rejectionReason: action === "reject" ? "School registration rejected" : "",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "Failed to update school registration.");
      }
      await onDataChange?.();
    } catch (error) {
      alert(error.message);
    } finally {
      setLoadingAction("");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex w-fit rounded-lg bg-[#0a2145] p-1">
        {["ALL", "PENDING", "APPROVED", "REJECTED"].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition whitespace-nowrap ${
              filter === status
                ? "bg-[#ffb21c] text-[#0a2f66] shadow-lg"
                : "text-[#cddfff] hover:bg-[#1150a1] hover:text-white"
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
          { key: "ALL", label: "Total", value: stats.total, accent: "navy" },
          { key: "PENDING", label: "Pending", value: stats.pending, accent: "gold" },
          { key: "APPROVED", label: "Approved", value: stats.approved, accent: "blue" },
          { key: "REJECTED", label: "Rejected", value: stats.rejected, accent: "amber" },
        ].map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setFilter(item.key)}
            className={`cursor-pointer p-4 rounded-xl border text-left transition-all ${
              filter === item.key
                ? item.accent === "navy"
                  ? "border-[#0a2f66]/50 bg-[#0a2f66]/10 ring-1 ring-[#0a2f66]/40"
                  : item.accent === "gold"
                  ? "border-[#ffb21c]/50 bg-[#ffb21c]/10 ring-1 ring-[#ffb21c]/40"
                  : item.accent === "blue"
                  ? "border-[#2f7fdb]/50 bg-[#2f7fdb]/10 ring-1 ring-[#2f7fdb]/40"
                  : "border-[#d97706]/50 bg-[#ffb21c]/10 ring-1 ring-[#d97706]/30"
                : "border-[#1c4a8d] bg-[#081b39]/60 hover:border-[#2f7fdb]/40"
            }`}
          >
            <div
              className={`text-xs uppercase font-bold tracking-wider mb-1 ${
                item.accent === "navy"
                  ? "text-[#bfd3f5]"
                  : item.accent === "gold"
                  ? "text-[#ffcf57]"
                  : item.accent === "blue"
                  ? "text-[#8fc4ff]"
                  : "text-[#ffc44d]"
              }`}
            >
              {item.label}
            </div>
            <div className="text-2xl font-bold text-white">{item.value}</div>
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#1c4a8d] bg-[#081b39]/70">
        <div className="flex flex-col gap-4 border-b border-[#1c4a8d] p-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative flex-1 max-w-md">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6fa6ef]" />
            <input
              type="text"
              placeholder="Search schools or contact persons..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-[#1c4a8d] bg-[#071833] py-2 pl-10 pr-4 text-white transition focus:border-[#2f7fdb] focus:outline-none"
            />
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="rounded-lg border border-[#1c4a8d] bg-[#071833] px-3 py-2 text-sm text-[#cddfff]">
              Approved students are added to Round 1 automatically.
            </div>
            <div className="text-sm text-[#cddfff]">
              Showing {groupedParticipants.length} results
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#1c4a8d] bg-[#071833] text-xs uppercase tracking-wider text-[#b6d6ff]">
                <th className="p-4 font-medium">School Details</th>
                <th className="p-4 font-medium">Contact Info</th>
                <th className="p-4 font-medium">Students</th>
                <th className="p-4 font-medium">Grade</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#16396d] text-sm">
              {groupedParticipants.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-[#86aee4]">
                    No registrations found matching your filters.
                  </td>
                </tr>
              ) : (
                groupedParticipants.map((group) => {
                  const schoolRequests = group.requests;
                  const schoolStatus = getSchoolStatus(schoolRequests);
                  const contactPerson = getContactPerson(schoolRequests);
                  const phone = getSchoolPhone(schoolRequests);

                  return (
                    <tr key={group.schoolId} className="transition hover:bg-[#0f2953]/60">
                      <td className="p-4 align-top">
                        <div className="font-medium text-white text-base mb-1">
                          {group.schoolName}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[#86aee4]">
                          <span>
                            {schoolRequests.length} registered student
                            {schoolRequests.length === 1 ? "" : "s"}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 align-top">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-[#dce9ff]">
                            <FaUser className="text-[#6fa6ef] text-xs" />
                            <span>{contactPerson}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[#dce9ff]">
                            <FaPhone className="text-[#6fa6ef] text-xs" />
                            <span>{phone || "-"}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 align-top">
                        <div className="flex flex-col gap-2">
                          {schoolRequests.map((request) => (
                            <div
                              key={request._id}
                              className="flex items-center justify-between gap-3 rounded-lg border border-[#16396d] bg-[#071833]/70 px-3 py-2"
                            >
                              <span className="text-slate-300">
                                {request.student?.name || "Student"}
                              </span>
                              <span
                                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusChip(
                                  request.status === "ENROLLED" ? "APPROVED" : request.status
                                )}`}
                              >
                                {request.status === "ENROLLED"
                                  ? "In Competition"
                                  : request.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="p-4 align-top">
                        <div className="flex flex-col gap-2">
                          {schoolRequests.map((request) => (
                            <div
                              key={`${request._id}-grade`}
                              className="flex items-center gap-2 text-slate-300"
                            >
                              <FaUserGraduate className="text-slate-500 text-xs" />
                              <span>{request.student?.grade || "-"}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="p-4 align-top">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium ${statusChip(
                            schoolStatus
                          )}`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                          {schoolStatus.charAt(0) + schoolStatus.slice(1).toLowerCase()}
                        </span>
                      </td>
                      <td className="p-4 align-top text-right">
                        <div className="flex flex-col gap-2 items-end w-32 ml-auto">
                          {schoolStatus !== "APPROVED" && (
                            <button
                              onClick={() => updateSchoolStatus(schoolRequests, "approve")}
                              disabled={Boolean(loadingAction)}
                              className="w-full px-3 py-1.5 bg-green-600/20 text-green-400 rounded hover:bg-green-600/30 transition flex items-center justify-center gap-2 text-xs font-medium border border-green-600/20 disabled:opacity-50"
                            >
                              <FaCheck /> Approve
                            </button>
                          )}
                          {schoolStatus !== "REJECTED" && (
                            <button
                              onClick={() => updateSchoolStatus(schoolRequests, "reject")}
                              disabled={Boolean(loadingAction)}
                              className="w-full px-3 py-1.5 bg-red-600/20 text-red-400 rounded hover:bg-red-600/30 transition flex items-center justify-center gap-2 text-xs font-medium border border-red-600/20 disabled:opacity-50"
                            >
                              <FaTimes /> Reject
                            </button>
                          )}
                          {schoolStatus !== "PENDING" && (
                            <button
                              onClick={() => updateSchoolStatus(schoolRequests, "pending")}
                              disabled={Boolean(loadingAction)}
                              className="w-full px-3 py-1.5 bg-yellow-600/20 text-yellow-400 rounded hover:bg-yellow-600/30 transition flex items-center justify-center gap-2 text-xs font-medium border border-yellow-600/20 disabled:opacity-50"
                            >
                              <FaUndo /> Pending
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
