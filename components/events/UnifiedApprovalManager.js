"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FaCheck,
  FaPhone,
  FaSearch,
  FaTimes,
  FaUndo,
  FaUser,
  FaUserGraduate,
} from "react-icons/fa";
import PaginationControls from "@/components/PaginationControls";
import LifecycleTimeline from "@/components/ui/LifecycleTimeline";
import AlertBanner from "@/components/ui/AlertBanner";

const PAGE_SIZE = 10;

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
    return "border-[#9ed8b5] bg-[#e8f8ef] text-[#17643a]";
  }
  if (status === "REJECTED") {
    return "border-rose-200 bg-rose-50 text-rose-800";
  }
  return "border-[#bfd7f7] bg-[#eaf2ff] text-[#0a2f66]";
}

function getGroupLifecycle(requests) {
  const items = requests
    .flatMap((request) => request.lifecycle || [])
    .filter((item) => item?.at)
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  const seen = new Set();
  return items
    .filter((item) => {
      const key = `${item.label}-${item.status}-${item.at}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(-4);
}

export default function UnifiedApprovalManager({ requests, event, onDataChange }) {
  const [filter, setFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [loadingAction, setLoadingAction] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [feedback, setFeedback] = useState(null);

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

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchTerm, requests]);

  const totalPages = Math.max(1, Math.ceil(groupedParticipants.length / PAGE_SIZE));
  const pagedParticipants = groupedParticipants.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

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
      setFeedback(null);
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
      const statusLabel =
        action === "approve"
          ? "approved"
          : action === "reject"
          ? "rejected"
          : "marked pending";
      setFeedback({
        type: "success",
        title: "Registration updated",
        message: `${getSchoolLabel(schoolRequests[0])} is now ${statusLabel}.`,
      });
      await onDataChange?.();
    } catch (error) {
      setFeedback({
        type: "error",
        title: "Registration update failed",
        message: error.message || "Please retry after checking the connection.",
      });
    } finally {
      setLoadingAction("");
    }
  };

  return (
    <div className="space-y-4">
      {feedback && (
        <AlertBanner
          type={feedback.type}
          title={feedback.title}
          message={feedback.message}
        />
      )}

      <div className="flex w-full overflow-x-auto rounded-lg border border-[#dbe5f4] bg-white p-1 shadow-sm md:w-fit">
        {["ALL", "PENDING", "APPROVED", "REJECTED"].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`rounded-md px-3 py-2 text-xs font-bold transition whitespace-nowrap sm:px-4 ${
              filter === status
                ? "bg-[#4326e8] text-white shadow-sm"
                : "text-[#344f77] hover:bg-[#f4f1ff] hover:text-[#4326e8]"
            }`}
          >
            {status === "ALL"
              ? "All"
              : status.charAt(0) + status.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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
            className={`cursor-pointer rounded-xl border p-3 text-left transition-all ${
              filter === item.key
                ? item.accent === "navy"
                  ? "border-[#cfc4ff] bg-[#f4f1ff] ring-1 ring-[#cfc4ff]"
                  : item.accent === "gold"
                  ? "border-amber-200 bg-amber-50 ring-1 ring-amber-200"
                  : item.accent === "blue"
                  ? "border-emerald-200 bg-emerald-50 ring-1 ring-emerald-200"
                  : "border-rose-200 bg-rose-50 ring-1 ring-rose-200"
                : "border-[#dbe5f4] bg-white hover:border-[#cfc4ff] hover:bg-[#fbfaff]"
            }`}
          >
            <div
              className={`mb-1 text-[11px] font-black uppercase ${
                item.accent === "navy"
                  ? "text-[#4326e8]"
                  : item.accent === "gold"
                  ? "text-amber-700"
                  : item.accent === "blue"
                  ? "text-emerald-700"
                  : "text-rose-700"
              }`}
            >
              {item.label}
            </div>
            <div className="text-xl font-black text-[#17120a]">{item.value}</div>
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-[#dbe5f4] bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-[#e6eaf7] p-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative flex-1 max-w-md">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#52657d]" />
            <input
              type="text"
              placeholder="Search schools or contact persons..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-[#dbe5f4] bg-[#f8fbff] py-2 pl-10 pr-4 text-sm font-semibold text-[#17120a] transition placeholder:text-[#75869b] focus:border-[#4326e8] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#4326e8]/10"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-lg border border-[#dbe5f4] bg-[#f8fbff] px-3 py-2 text-xs font-semibold text-[#344f77]">
              Approved students are added to Round 1 automatically.
            </div>
            <div className="text-xs font-bold text-[#52657d]">
              Showing {groupedParticipants.length} school
              {groupedParticipants.length === 1 ? "" : "s"}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[860px] w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[#e6eaf7] bg-[#f8fafc] text-[11px] uppercase text-[#52657d]">
                <th className="px-4 py-3 font-black">School Details</th>
                <th className="px-4 py-3 font-black">Contact Info</th>
                <th className="px-4 py-3 font-black">Students</th>
                <th className="px-4 py-3 font-black">Grade</th>
                <th className="px-4 py-3 font-black">Status</th>
                <th className="px-4 py-3 font-black text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eef2f8] text-sm">
              {groupedParticipants.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-6 text-center text-sm font-semibold text-[#52657d]">
                    No registrations found matching your filters.
                  </td>
                </tr>
              ) : (
                pagedParticipants.map((group) => {
                  const schoolRequests = group.requests;
                  const schoolStatus = getSchoolStatus(schoolRequests);
                  const contactPerson = getContactPerson(schoolRequests);
                  const phone = getSchoolPhone(schoolRequests);
                  const groupLifecycle = getGroupLifecycle(schoolRequests);

                  return (
                    <tr key={group.schoolId} className="transition hover:bg-[#fbfcff]">
                      <td className="px-4 py-3 align-top">
                        <div className="mb-1 text-sm font-black text-[#17120a]">
                          {group.schoolName}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[#52657d]">
                          <span>
                            {schoolRequests.length} registered student
                            {schoolRequests.length === 1 ? "" : "s"}
                          </span>
                        </div>
                        <div className="mt-3 min-w-[220px]">
                          <LifecycleTimeline
                            compact
                            title="Registration history"
                            items={groupLifecycle}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 text-[#27344a]">
                            <FaUser className="text-[#52657d] text-xs" />
                            <span>{contactPerson}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[#27344a]">
                            <FaPhone className="text-[#52657d] text-xs" />
                            <span>{phone || "-"}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex flex-col gap-1.5">
                          {schoolRequests.map((request) => (
                            <div
                              key={request._id}
                              className="flex items-center justify-between gap-3 rounded-lg border border-[#e6eaf7] bg-[#f8fbff] px-3 py-2"
                            >
                              <span className="font-semibold text-[#27344a]">
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
                      <td className="px-4 py-3 align-top">
                        <div className="flex flex-col gap-2">
                          {schoolRequests.map((request) => (
                            <div
                              key={`${request._id}-grade`}
                              className="flex items-center gap-2 text-[#27344a]"
                            >
                              <FaUserGraduate className="text-[#52657d] text-xs" />
                              <span>{request.student?.grade || "-"}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium ${statusChip(
                            schoolStatus
                          )}`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                          {schoolStatus.charAt(0) + schoolStatus.slice(1).toLowerCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-top text-right">
                        <div className="ml-auto flex w-28 flex-col items-end gap-2">
                          {schoolStatus !== "APPROVED" && (
                            <button
                              onClick={() => updateSchoolStatus(schoolRequests, "approve")}
                              disabled={Boolean(loadingAction)}
                              className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-800 px-3 py-2 text-xs font-black text-white transition hover:bg-emerald-900 disabled:opacity-50"
                            >
                              <FaCheck /> Approve
                            </button>
                          )}
                          {schoolStatus !== "REJECTED" && (
                            <button
                              onClick={() => updateSchoolStatus(schoolRequests, "reject")}
                              disabled={Boolean(loadingAction)}
                              className="flex w-full items-center justify-center gap-2 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-black text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
                            >
                              <FaTimes /> Reject
                            </button>
                          )}
                          {schoolStatus !== "PENDING" && (
                            <button
                              onClick={() => updateSchoolStatus(schoolRequests, "pending")}
                              disabled={Boolean(loadingAction)}
                              className="flex w-full items-center justify-center gap-2 rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs font-black text-amber-700 transition hover:bg-amber-50 disabled:opacity-50"
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
        <div className="border-t border-[#e6eaf7] px-4 pb-4">
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>
    </div>
  );
}
