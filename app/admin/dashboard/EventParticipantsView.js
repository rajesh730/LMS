"use client";

import { useState } from "react";
import {
  FaArrowLeft,
  FaSearch,
  FaFilter,
  FaCheck,
  FaTimes,
  FaUndo,
  FaUser,
  FaPhone,
  FaUserGraduate,
  FaCalendarAlt,
  FaDownload,
} from "react-icons/fa";

export default function EventParticipantsView({ event, onBack, onRefresh }) {
  const [filter, setFilter] = useState("ALL"); // ALL, PENDING, APPROVED, REJECTED
  const [searchTerm, setSearchTerm] = useState("");
  const [processingId, setProcessingId] = useState(null);

  const handleApprove = async (participant, action) => {
    if (!confirm(`Are you sure you want to ${action} this school?`)) return;

    const requestIds = participant.students
      .map((s) => (typeof s === "object" ? s.requestId : null))
      .filter(Boolean);

    const schoolId = participant.school?._id;

    if (requestIds.length === 0 && !schoolId) {
      alert("No requests found to process");
      return;
    }

    setProcessingId(participant.school._id);

    try {
      const res = await fetch(`/api/events/${event._id}/approve`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestIds, action, schoolId }),
      });
      if (res.ok) {
        // alert(`Successfully ${action}ed`);
        if (onRefresh) onRefresh();
      } else {
        const data = await res.json();
        alert(data.message || "Failed");
      }
    } catch (e) {
      console.error(e);
      alert("Error processing request");
    } finally {
      setProcessingId(null);
    }
  };

  const exportToCSV = () => {
    if (!event.participants || event.participants.length === 0) {
      alert("No participants to export");
      return;
    }

    const headers =
      "School Name,Contact Person,Phone,Expected Students,Joined Date,Status,Notes";
    const rows = filteredParticipants.map((p) => {
      const schoolName = p.school?.schoolName || "Unknown";
      const joinDate = new Date(p.joinedAt).toLocaleDateString();
      return `"${schoolName}","${p.contactPerson || ""}","${
        p.contactPhone || ""
      }","${p.expectedStudents || 0}","${joinDate}","${p.status}","${
        p.notes || ""
      }"`;
    });

    const csvContent =
      "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `${event.title.replace(/[^a-z0-9]/gi, "_")}_participants.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredParticipants = event.participants?.filter((p) => {
    const matchesFilter = filter === "ALL" || p.status === filter;
    const matchesSearch =
      p.school?.schoolName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const stats = {
    total: event.participants?.length || 0,
    pending:
      event.participants?.filter((p) => p.status === "PENDING").length || 0,
    approved:
      event.participants?.filter((p) => p.status === "APPROVED").length || 0,
    rejected:
      event.participants?.filter((p) => p.status === "REJECTED").length || 0,
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
        <div>
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-400 hover:text-white mb-2 transition-colors"
          >
            <FaArrowLeft /> Back to Events
          </button>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            {event.title}
            <span className="text-sm font-normal bg-slate-800 text-slate-300 px-3 py-1 rounded-full border border-slate-700">
              Participants Management
            </span>
          </h2>
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

      {/* Stats & Filters Bar */}
      <div className="space-y-4">
        {/* Filter Tabs */}
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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div
            onClick={() => setFilter("ALL")}
            className={`cursor-pointer p-4 rounded-xl border transition-all ${
              filter === "ALL"
                ? "bg-blue-600/10 border-blue-500/50 ring-1 ring-blue-500/50"
                : "bg-slate-900/50 border-slate-800 hover:border-slate-700"
            }`}
          >
            <div className="text-slate-400 text-xs uppercase font-bold tracking-wider mb-1">
              Total
            </div>
            <div className="text-2xl font-bold text-white">{stats.total}</div>
          </div>
          <div
            onClick={() => setFilter("PENDING")}
            className={`cursor-pointer p-4 rounded-xl border transition-all ${
              filter === "PENDING"
                ? "bg-yellow-600/10 border-yellow-500/50 ring-1 ring-yellow-500/50"
                : "bg-slate-900/50 border-slate-800 hover:border-slate-700"
            }`}
          >
            <div className="text-yellow-400 text-xs uppercase font-bold tracking-wider mb-1">
              Pending
            </div>
            <div className="text-2xl font-bold text-white">{stats.pending}</div>
          </div>
          <div
            onClick={() => setFilter("APPROVED")}
            className={`cursor-pointer p-4 rounded-xl border transition-all ${
              filter === "APPROVED"
                ? "bg-green-600/10 border-green-500/50 ring-1 ring-green-500/50"
                : "bg-slate-900/50 border-slate-800 hover:border-slate-700"
            }`}
          >
            <div className="text-green-400 text-xs uppercase font-bold tracking-wider mb-1">
              Approved
            </div>
            <div className="text-2xl font-bold text-white">
              {stats.approved}
            </div>
          </div>
          <div
            onClick={() => setFilter("REJECTED")}
            className={`cursor-pointer p-4 rounded-xl border transition-all ${
              filter === "REJECTED"
                ? "bg-red-600/10 border-red-500/50 ring-1 ring-red-500/50"
                : "bg-slate-900/50 border-slate-800 hover:border-slate-700"
            }`}
          >
            <div className="text-red-400 text-xs uppercase font-bold tracking-wider mb-1">
              Rejected
            </div>
            <div className="text-2xl font-bold text-white">
              {stats.rejected}
            </div>
          </div>
        </div>
      </div>

      {/* Search & Table */}
      <div className="bg-slate-900/50 rounded-2xl border border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search schools or contact persons..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-blue-500 transition"
            />
          </div>
          <div className="text-slate-400 text-sm">
            Showing {filteredParticipants?.length || 0} results
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-slate-400 border-b border-slate-800 text-xs uppercase tracking-wider bg-slate-950/50">
                <th className="p-4 font-medium">School Details</th>
                <th className="p-4 font-medium">Contact Info</th>
                <th className="p-4 font-medium">Students</th>
                <th className="p-4 font-medium">Grade</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-800">
              {filteredParticipants?.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-500">
                    No participants found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredParticipants.map((participant, index) => (
                  <tr
                    key={index}
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
                          {new Date(participant.joinedAt).toLocaleDateString()}
                        </span>
                      </div>
                      {participant.notes && (
                        <p className="text-slate-500 text-xs italic mt-2 bg-slate-950/50 p-2 rounded border border-slate-800">
                          "{participant.notes}"
                        </p>
                      )}
                    </td>
                    <td className="p-4 align-top">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-slate-300">
                          <FaUser className="text-slate-500 text-xs" />
                          <span>{participant.contactPerson}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-300">
                          <FaPhone className="text-slate-500 text-xs" />
                          <span>{participant.contactPhone}</span>
                        </div>
                        {participant.school?.schoolPhone && (
                          <div className="flex items-center gap-2 text-slate-300">
                            <FaPhone className="text-emerald-500 text-xs" />
                            <span>
                              {participant.school.schoolPhone} (School)
                            </span>
                          </div>
                        )}
                        {participant.expectedStudents > 0 && (
                          <div className="flex items-center gap-2 text-slate-300">
                            <FaUserGraduate className="text-slate-500 text-xs" />
                            <span>{participant.expectedStudents} expected</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-4 align-top">
                      {participant.students &&
                      participant.students.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {participant.students.map((student, sIndex) => (
                            <div
                              key={sIndex}
                              className="text-slate-300 text-xs py-1 border-b border-slate-800 last:border-0"
                            >
                              {typeof student === "object"
                                ? student.name
                                : `ID: ${student}`}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-500 italic text-xs">
                          No students
                        </span>
                      )}
                    </td>
                    <td className="p-4 align-top">
                      {participant.students &&
                      participant.students.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {participant.students.map((student, sIndex) => (
                            <div
                              key={sIndex}
                              className="text-slate-400 text-xs py-1 border-b border-slate-800 last:border-0"
                            >
                              {typeof student === "object"
                                ? student.grade || "N/A"
                                : "-"}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-500 italic text-xs">-</span>
                      )}
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
                            onClick={() =>
                              handleApprove(participant, "approve")
                            }
                            disabled={processingId === participant.school._id}
                            className="w-full px-3 py-1.5 bg-green-600/20 text-green-400 rounded hover:bg-green-600/30 transition flex items-center justify-center gap-2 text-xs font-medium border border-green-600/20 disabled:opacity-50"
                            title="Approve School"
                          >
                            <FaCheck /> Approve
                          </button>
                        )}
                        {(participant.status === "PENDING" ||
                          participant.status === "APPROVED") && (
                          <button
                            onClick={() => handleApprove(participant, "reject")}
                            disabled={processingId === participant.school._id}
                            className="w-full px-3 py-1.5 bg-red-600/20 text-red-400 rounded hover:bg-red-600/30 transition flex items-center justify-center gap-2 text-xs font-medium border border-red-600/20 disabled:opacity-50"
                            title="Reject School"
                          >
                            <FaTimes /> Reject
                          </button>
                        )}
                        {(participant.status === "APPROVED" ||
                          participant.status === "REJECTED") && (
                          <button
                            onClick={() =>
                              handleApprove(participant, "pending")
                            }
                            disabled={processingId === participant.school._id}
                            className="w-full px-3 py-1.5 bg-yellow-600/20 text-yellow-400 rounded hover:bg-yellow-600/30 transition flex items-center justify-center gap-2 text-xs font-medium border border-yellow-600/20 disabled:opacity-50"
                            title="Reset to Pending"
                          >
                            <FaUndo /> Pending
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
    </div>
  );
}
