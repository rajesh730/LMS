"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  FaBriefcase,
  FaChalkboardTeacher,
  FaCheckCircle,
  FaDownload,
  FaEnvelope,
  FaFilter,
  FaIdBadge,
  FaPlus,
  FaSearch,
  FaUpload,
  FaUserSlash,
} from "react-icons/fa";
import { TableSkeleton } from "@/components/Skeletons";
import PaginationControls from "@/components/PaginationControls";
import EmptyState from "@/components/EmptyState";
import AlertBanner from "@/components/ui/AlertBanner";

export default function TeacherManager() {
  // Data State
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    totalTeachers: 0,
    limit: 10,
  });

  // Filters & Search
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [teacherStats, setTeacherStats] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const fetchTeacherStats = useCallback(async () => {
    try {
      const res = await fetch("/api/school/dashboard/stats", {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setTeacherStats(data.data?.teachers || null);
      }
    } catch (error) {
      console.error("Error fetching teacher stats:", error);
    }
  }, []);

  // Fetch Teachers
  const fetchTeachers = useCallback(async (page = 1) => {
    setLoading(true);
    setFeedback(null);
    try {
      const params = new URLSearchParams({
        page,
        limit: 10,
        ...(search && { search }),
        ...(status !== "ALL" && { status }),
      });

      const res = await fetch(`/api/teachers?${params}`);
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || "Failed to load teachers.");
      }

      // Handle both paginated and non-paginated responses
      if (data.teachers) {
        setTeachers(data.teachers);
        if (data.pagination) {
          setPagination(data.pagination);
        } else {
          // Fallback if API doesn't return pagination
          setPagination({
            page: 1,
            totalPages: 1,
            totalTeachers: data.teachers.length,
            limit: data.teachers.length,
          });
        }
      } else {
        setTeachers([]);
      }
    } catch (error) {
      console.error("Error fetching teachers:", error);
      setTeachers([]);
      setFeedback({
        type: "error",
        title: "Teachers could not be loaded",
        message: error.message || "Please retry after checking your connection.",
        retry: () => fetchTeachers(page),
      });
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTeachers(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [fetchTeachers]);

  useEffect(() => {
    fetchTeacherStats();
  }, [fetchTeacherStats]);

  const handlePageChange = (newPage) => {
    fetchTeachers(newPage);
  };

  const handleCopyEmail = async (teacher) => {
    if (!teacher.email) return;
    try {
      await navigator.clipboard.writeText(teacher.email);
      setFeedback({
        type: "success",
        title: "Teacher email copied",
        message: `${teacher.email} is ready to share or use as the login email.`,
      });
    } catch (error) {
      console.error("Could not copy teacher email:", error);
      setFeedback({
        type: "error",
        title: "Email was not copied",
        message: "Please copy it manually from the teacher row.",
      });
    }
  };

  const handleExportCsv = () => {
    if (teachers.length === 0) {
      setFeedback({
        type: "error",
        title: "No teachers to export",
        message: "Adjust filters or add teachers before exporting.",
      });
      return;
    }

    const headers = [
      "Name",
      "Email",
      "Phone",
      "Designation",
      "Focus Area",
      "Roles",
      "Qualification",
      "Experience",
      "Employment Type",
      "Status",
    ];
    const rows = teachers.map((teacher) => [
      teacher.name || "",
      teacher.email || "",
      teacher.phone || "",
      teacher.designation || "",
      teacher.subject || "",
      Array.isArray(teacher.roles) ? teacher.roles.join(" | ") : "",
      teacher.qualification || "",
      teacher.experience || "",
      teacher.employmentType || "",
      teacher.status || "",
    ]);

    const escapeCsv = (value) => `"${String(value).replaceAll('"', '""')}"`;
    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCsv).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `teachers-page-${pagination.page || 1}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const totalTeacherCount =
    typeof teacherStats?.total === "number"
      ? teacherStats.total
      : pagination.totalTeachers || teachers.length;
  const activeTeacherCount =
    typeof teacherStats?.byStatus?.ACTIVE === "number"
      ? teacherStats.byStatus.ACTIVE
      : teachers.filter(
          (teacher) => String(teacher.status || "ACTIVE").toUpperCase() === "ACTIVE"
        ).length;
  const inactiveTeacherCount =
    typeof teacherStats?.byStatus?.INACTIVE === "number"
      ? teacherStats.byStatus.INACTIVE
      : Math.max(totalTeacherCount - activeTeacherCount, 0);
  const focusAreaCount = new Set(
    teachers.map((teacher) => teacher.subject).filter(Boolean)
  ).size;
  const fullTimeCount = teachers.filter(
    (teacher) => String(teacher.employmentType || "").toUpperCase() === "FULL_TIME"
  ).length;

  const metricCards = [
    {
      label: "Total Teachers",
      value: totalTeacherCount,
      note: `${activeTeacherCount} active`,
      icon: FaChalkboardTeacher,
      tone: "purple",
    },
    {
      label: "Active Mentors",
      value: activeTeacherCount,
      note: "Available for students",
      icon: FaCheckCircle,
      tone: "emerald",
    },
    {
      label: "Inactive Records",
      value: inactiveTeacherCount,
      note: "Not active now",
      icon: FaUserSlash,
      tone: "amber",
    },
    {
      label: "Focus Areas",
      value: focusAreaCount,
      note: "On this page",
      icon: FaIdBadge,
      tone: "blue",
    },
    {
      label: "Full Time",
      value: fullTimeCount,
      note: "On this page",
      icon: FaBriefcase,
      tone: "violet",
    },
  ];

  const toneClasses = {
    purple: "border-purple-100 bg-purple-50 text-purple-700",
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-700",
    amber: "border-amber-100 bg-amber-50 text-amber-700",
    blue: "border-blue-100 bg-blue-50 text-[#0a2f66]",
    violet: "border-violet-100 bg-violet-50 text-violet-700",
  };

  const statusStyles = {
    ACTIVE: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    INACTIVE: "bg-slate-100 text-slate-600 ring-slate-200",
  };

  const initialsFor = (name = "Teacher") =>
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "TR";

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-black text-[#17120a]">Teachers</h1>
          <p className="mt-2 text-base text-[#52657d]">
            Manage teacher accounts, mentor roles, contact details, and focus areas.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/school/dashboard?tab=register-teacher"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#dbe5f4] bg-white px-4 text-sm font-black text-[#0a2f66] shadow-sm transition hover:bg-[#f8fbff]"
          >
            <FaUpload />
            Import Teachers
          </Link>
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#dbe5f4] bg-white px-4 text-sm font-black text-[#0a2f66] shadow-sm transition hover:bg-[#f8fbff]"
          >
            <FaDownload />
            Export CSV
          </button>
          <Link
            href="/school/dashboard?tab=register-teacher"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-purple-700 px-5 text-sm font-black text-white shadow-sm transition hover:bg-purple-800"
          >
            <FaPlus />
            Add Teacher
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {metricCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="rounded-2xl border border-[#e6eaf7] bg-white p-5 shadow-sm"
            >
              <div className="flex items-center gap-4">
                <span
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${
                    toneClasses[card.tone]
                  }`}
                >
                  <Icon />
                </span>
                <span className="min-w-0">
                  <strong className="block text-2xl font-black text-[#17120a]">
                    {card.value}
                  </strong>
                  <span className="block truncate text-sm font-black text-[#24314d]">
                    {card.label}
                  </span>
                  <span className="mt-1 block text-xs font-bold text-[#52657d]">
                    {card.note}
                  </span>
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {feedback && (
        <AlertBanner
          type={feedback.type}
          title={feedback.title}
          message={feedback.message}
          action={
            feedback.retry ? (
              <button
                type="button"
                onClick={feedback.retry}
                className="rounded-lg bg-white/80 px-3 py-2 text-xs font-black text-slate-900 transition hover:bg-white"
              >
                Retry
              </button>
            ) : null
          }
        />
      )}

      <div className="rounded-2xl border border-[#e6eaf7] bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[minmax(240px,1fr)_180px_auto]">
          <div className="relative">
            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-[#75869b]" />
            <input
              type="text"
              placeholder="Search by teacher, email, phone, or focus area..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-12 w-full rounded-xl border border-[#dbe5f4] bg-[#f8fbff] pl-11 pr-4 text-sm font-semibold outline-none transition focus:border-purple-300"
            />
          </div>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="h-12 rounded-xl border border-[#dbe5f4] bg-white px-4 text-sm font-black text-[#24314d] outline-none transition focus:border-purple-300"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setStatus("ALL");
            }}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-[#dbe5f4] bg-white px-4 text-sm font-black text-[#0a2f66] transition hover:bg-[#f8fbff]"
          >
            <FaFilter />
            Clear Filters
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-[#e1e7f2] bg-white shadow-[0_14px_34px_rgba(10,47,102,0.08)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm text-[#27344a]">
            <thead className="border-b border-[#e1e7f2] bg-[#f8fbff] text-[11px] uppercase text-[#75869b]">
              <tr>
                <th className="w-12 px-4 py-3">
                  <input type="checkbox" className="h-4 w-4 rounded border-[#c8d4e6]" />
                </th>
                <th className="px-4 py-3">Teacher</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Focus Area</th>
                <th className="px-4 py-3">Role & Type</th>
                <th className="px-4 py-3">Details</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e1e7f2]">
              {loading ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-slate-500">
                    <TableSkeleton />
                  </td>
                </tr>
              ) : teachers.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-slate-500">
                    <EmptyState
                      title={search ? "No teachers match this search" : "No teachers added yet"}
                      description={
                        search
                          ? "Try a different name, email, phone, or focus area."
                          : "Add teachers so they can mentor students, support events, and manage school activities."
                      }
                    />
                  </td>
                </tr>
              ) : (
                teachers.map((teacher) => (
                  <tr key={teacher._id} className="transition-colors hover:bg-[#f8fbff]">
                    <td className="px-4 py-3">
                      <input type="checkbox" className="h-4 w-4 rounded border-[#c8d4e6]" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-50 text-xs font-black text-purple-700">
                          {initialsFor(teacher.name)}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-black text-[#17120a]">
                            {teacher.name}
                          </span>
                          <span className="block truncate text-xs font-bold text-[#75869b]">
                            {teacher.designation || "Teacher"}
                          </span>
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-[#24314d]">{teacher.email || "No email"}</div>
                      <div className="text-xs font-semibold text-[#75869b]">
                        {teacher.phone || "No phone"}
                      </div>
                      <div className="mt-1 max-w-[220px] truncate text-xs font-semibold text-[#75869b]">
                        {teacher.address || "No address"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-[#24314d]">
                        {teacher.subject || "General mentoring"}
                      </div>
                      <div className="text-xs font-semibold text-[#75869b]">
                        Joined:{" "}
                        {teacher.dateOfJoining
                          ? new Date(teacher.dateOfJoining).toLocaleDateString()
                          : "Not set"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="mb-2 flex flex-wrap gap-1">
                        {(teacher.roles || ["MENTOR"]).map((role, i) => (
                          <span
                            key={`${teacher._id}-${role}-${i}`}
                            className="rounded-full border border-[#bfd7f7] bg-[#eaf2ff] px-2 py-0.5 text-xs font-black text-[#0a2f66]"
                          >
                            {role}
                          </span>
                        ))}
                      </div>
                      <div className="text-xs font-semibold text-[#75869b]">
                        {teacher.employmentType || "Type not set"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs font-semibold text-[#344f77]">
                        <span className="text-[#75869b]">Qual:</span>{" "}
                        {teacher.qualification || "N/A"}
                      </div>
                      <div className="text-xs font-semibold text-[#344f77]">
                        <span className="text-[#75869b]">Exp:</span>{" "}
                        {teacher.experience ? `${teacher.experience} yrs` : "N/A"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black ring-1 ${
                          statusStyles[String(teacher.status || "ACTIVE").toUpperCase()] ||
                          statusStyles.INACTIVE
                        }`}
                      >
                        {String(teacher.status || "ACTIVE").toUpperCase() === "ACTIVE" ? (
                          <FaCheckCircle />
                        ) : (
                          <FaUserSlash />
                        )}
                        {teacher.status || "ACTIVE"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopyEmail(teacher)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#dbe5f4] bg-white text-[#0a2f66] transition hover:bg-[#f8fbff]"
                          title="Copy teacher email"
                        >
                          <FaEnvelope />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {!loading && teachers.length > 0 && (
            <div className="border-t border-[#e1e7f2] p-4">
                <PaginationControls
                    currentPage={pagination.page}
                    totalPages={pagination.totalPages}
                    onPageChange={handlePageChange}
                    totalItems={pagination.totalTeachers}
                    start={pagination.start}
                    end={pagination.end}
                />
            </div>
        )}
      </div>
    </div>
  );
}
