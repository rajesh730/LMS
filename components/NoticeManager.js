"use client";

import { useCallback, useEffect, useState } from "react";
import {
  FaBullhorn,
  FaClipboardList,
  FaEdit,
  FaPlus,
  FaTrash,
  FaEye,
  FaFileAlt,
  FaFilter,
  FaInfoCircle,
  FaPaperPlane,
  FaRegCalendarAlt,
  FaSearch,
  FaUserGraduate,
  FaChalkboardTeacher,
  FaUserFriends,
} from "react-icons/fa";
import { buildGradeLabels, normalizeGradeValue } from "@/lib/schoolGrades";
import EmptyState from "@/components/EmptyState";
import PaginationControls from "@/components/PaginationControls";
import AlertBanner from "@/components/ui/AlertBanner";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

export default function NoticeManager({
  scopeMode = "school",
  title = "Notice Board",
  subtitle = "Manage and publish notices for your school",
  fixedAudience = null,
}) {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState(null);
  const [editingNoticeId, setEditingNoticeId] = useState("");
  const [filters, setFilters] = useState({
    type: "",
    priority: "",
    audience: "",
    status: "",
    grade: "",
    search: "",
  });
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    totalItems: 0,
    limit: 20,
  });
  const [feedback, setFeedback] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [summaryNotices, setSummaryNotices] = useState([]);

  const [noticeForm, setNoticeForm] = useState({
    title: "",
    content: "",
    type: "GENERAL",
    priority: "NORMAL",
    status: "PUBLISHED",
    visibility: "PRIVATE",
    targetAudience: {
      students: fixedAudience === "students",
      teachers: false,
      parents: false,
    },
    grades: [],
    expiryDate: "",
  });
  const [gradeOptions, setGradeOptions] = useState([]);

  const noticeTypes = [
    { value: "GENERAL", label: "General", color: "bg-blue-500" },
    { value: "URGENT", label: "Urgent", color: "bg-red-500" },
    { value: "EVENT", label: "Event", color: "bg-purple-500" },
    { value: "HOLIDAY", label: "Holiday", color: "bg-blue-500" },
    { value: "SHOWCASE", label: "Showcase", color: "bg-slate-500" },
  ];

  const priorities = [
    { value: "LOW", label: "Low", color: "text-[#52657d]" },
    { value: "NORMAL", label: "Normal", color: "text-blue-400" },
    { value: "HIGH", label: "High", color: "text-blue-400" },
    { value: "URGENT", label: "Urgent", color: "text-red-400" },
  ];
  const isPlatformMode = scopeMode === "platform";
  const isStudentOnlyMode = fixedAudience === "students";

  const buildDefaultAudience = useCallback(
    () => ({
      students: isStudentOnlyMode,
      teachers: false,
      parents: false,
    }),
    [isStudentOnlyMode]
  );

  const fetchNotices = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      setFeedback(null);
      const params = new URLSearchParams();
      params.append("page", String(page));
      params.append("limit", "10");
      if (!isPlatformMode && filters.type) params.append("type", filters.type);
      if (!isPlatformMode && filters.priority) {
        params.append("priority", filters.priority);
      }
      if (filters.status) params.append("status", filters.status);
      if (!isPlatformMode && filters.grade) params.append("grade", filters.grade);
      if (!isPlatformMode && isStudentOnlyMode) {
        params.append("audience", "students");
      } else if (!isPlatformMode && filters.audience) {
        params.append("audience", filters.audience);
      }
      if (filters.search.trim()) {
        params.append("search", filters.search.trim());
      }
      params.append("scope", isPlatformMode ? "PLATFORM" : "SCHOOL");

      const res = await fetch(`/api/notices?${params}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || data.message || "Failed to load notices.");
      }
      setNotices(data.notices || []);
      if (data.pagination) {
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Error fetching notices:", error);
      setNotices([]);
      setFeedback({
        type: "error",
        title: "Notices could not be loaded",
        message:
          error.message ||
          "Please retry. If it continues, check your connection and server logs.",
        retry: () => fetchNotices(page),
      });
    } finally {
      setLoading(false);
    }
  }, [filters, isPlatformMode, isStudentOnlyMode]);

  const fetchNoticeSummary = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.append("page", "1");
      params.append("limit", "100");
      params.append("scope", isPlatformMode ? "PLATFORM" : "SCHOOL");
      if (!isPlatformMode && isStudentOnlyMode) {
        params.append("audience", "students");
      }

      const res = await fetch(`/api/notices?${params}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setSummaryNotices(Array.isArray(data.notices) ? data.notices : []);
      }
    } catch (error) {
      console.error("Error fetching notice summary:", error);
    }
  }, [isPlatformMode, isStudentOnlyMode]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchNotices(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchNotices]);

  useEffect(() => {
    fetchNoticeSummary();
  }, [fetchNoticeSummary]);

  useEffect(() => {
    let isActive = true;

    const fetchGradeOptions = async () => {
      try {
        const res = await fetch("/api/school/grade-structure", {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Failed to load grade options");

        const data = await res.json();
        const grades = (data.grades || data.data?.grades || [])
          .map((grade) => normalizeGradeValue(grade.name || grade._id || grade))
          .filter(Boolean);

        if (isActive) {
          setGradeOptions(grades.length > 0 ? grades : buildGradeLabels());
        }
      } catch (error) {
        if (isActive) {
          setGradeOptions(buildGradeLabels());
        }
      }
    };

    fetchGradeOptions();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    setNoticeForm((prev) => ({
      ...prev,
      grades: prev.grades.filter((grade) =>
        gradeOptions.includes(normalizeGradeValue(grade))
      ),
    }));
  }, [gradeOptions]);

  const saveNotice = async (e) => {
    e.preventDefault();

    if (!isPlatformMode && !isStudentOnlyMode) {
      const { students, teachers, parents } = noticeForm.targetAudience;
      if (!students && !teachers && !parents) {
        setFeedback({
          type: "warning",
          title: "Missing Audience",
          message:
            "Please select at least one target audience (Students, Teachers, or Parents) before saving.",
        });
        return;
      }
    }

    try {
      setFeedback(null);
      const isEditing = Boolean(editingNoticeId);
      const res = await fetch(
        isEditing ? `/api/notices/${editingNoticeId}` : "/api/notices",
        {
          method: isEditing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...noticeForm,
            targetAudience: isStudentOnlyMode
              ? buildDefaultAudience()
              : noticeForm.targetAudience,
            scope: isPlatformMode ? "PLATFORM" : "SCHOOL",
          }),
        });
      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(payload.error || payload.message || "Failed to save notice.");
      }

      setFeedback({
        type: "success",
        title:
          noticeForm.status === "DRAFT"
            ? "Notice saved as draft"
            : isEditing
              ? "Notice updated"
              : "Notice published",
        message:
          payload.message ||
          "Your notice list has been refreshed with the latest changes.",
      });
      resetForm();
      setEditingNoticeId("");
      setShowForm(false);
      fetchNotices();
      fetchNoticeSummary();
    } catch (error) {
      console.error("Error saving notice:", error);
      setFeedback({
        type: "error",
        title: "Notice was not saved",
        message: error.message || "Please retry after checking the notice details.",
      });
    }
  };

  const deleteNotice = async () => {
    if (!deleteTarget) return;
    try {
      setDeleteTarget((current) => ({ ...current, busy: true }));
      setFeedback(null);
      const res = await fetch(`/api/notices/${deleteTarget._id}`, { method: "DELETE" });
      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(payload.error || payload.message || "Failed to archive notice.");
      }

      setFeedback({
        type: "success",
        title: "Notice archived",
        message: `"${deleteTarget.title}" is no longer visible in the active notice list.`,
      });
      setDeleteTarget(null);
      fetchNotices(pagination.page || 1);
      fetchNoticeSummary();
    } catch (error) {
      console.error("Error deleting notice:", error);
      setFeedback({
        type: "error",
        title: "Notice was not archived",
        message: error.message || "Please retry after checking the connection.",
      });
      setDeleteTarget(null);
    }
  };

  const resetForm = () => {
    setNoticeForm({
      title: "",
      content: "",
      type: "GENERAL",
      priority: "NORMAL",
      status: "PUBLISHED",
      visibility: "PRIVATE",
      targetAudience: buildDefaultAudience(),
      grades: [],
      expiryDate: "",
    });
  };

  const toggleGrade = (grade) => {
    const grades = noticeForm.grades.includes(grade)
      ? noticeForm.grades.filter((g) => g !== grade)
      : [...noticeForm.grades, grade];
    setNoticeForm({ ...noticeForm, grades });
  };

  const openEditNotice = (notice) => {
    setEditingNoticeId(notice._id);
    setSelectedNotice(null);
    setNoticeForm({
      title: notice.title || "",
      content: notice.content || "",
      type: notice.type || "GENERAL",
      priority: notice.priority || "NORMAL",
      status: notice.status || "PUBLISHED",
      visibility: notice.visibility || "PRIVATE",
      targetAudience: isStudentOnlyMode
        ? buildDefaultAudience()
        : notice.targetAudience || buildDefaultAudience(),
      grades: Array.isArray(notice.grades) ? notice.grades : [],
      expiryDate: notice.expiryDate
        ? new Date(notice.expiryDate).toISOString().slice(0, 16)
        : "",
    });
    setShowForm(true);
  };

  const getTypeColor = (type) => {
    return noticeTypes.find((t) => t.value === type)?.color || "bg-slate-500";
  };

  const getPriorityColor = (priority) => {
    return (
      priorities.find((p) => p.value === priority)?.color || "text-[#52657d]"
    );
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusLabel = (notice) => {
    return notice.status === "DRAFT" ? "Draft" : "Published";
  };

  const sourceForMetrics = summaryNotices.length > 0 ? summaryNotices : notices;
  const totalNoticeCount = pagination.totalItems ?? sourceForMetrics.length;
  const publishedNoticeCount = sourceForMetrics.filter(
    (notice) => notice.status !== "DRAFT"
  ).length;
  const draftNoticeCount = sourceForMetrics.filter(
    (notice) => notice.status === "DRAFT"
  ).length;
  const scheduledNoticeCount = sourceForMetrics.filter(
    (notice) => notice.expiryDate && new Date(notice.expiryDate) > new Date()
  ).length;

  const metricCards = [
    {
      label: "Total Notices",
      value: totalNoticeCount,
      note: "This academic year",
      icon: FaClipboardList,
      tone: "purple",
    },
    {
      label: "Published",
      value: publishedNoticeCount,
      note: "Visible to students",
      icon: FaPaperPlane,
      tone: "emerald",
    },
    {
      label: "Scheduled",
      value: scheduledNoticeCount,
      note: "Have an expiry date",
      icon: FaRegCalendarAlt,
      tone: "amber",
    },
    {
      label: "Drafts",
      value: draftNoticeCount,
      note: "Not published yet",
      icon: FaFileAlt,
      tone: "blue",
    },
  ];

  const metricToneClasses = {
    purple: "border-purple-100 bg-purple-50 text-purple-700",
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-700",
    amber: "border-amber-100 bg-amber-50 text-amber-700",
    blue: "border-blue-100 bg-blue-50 text-[#0a2f66]",
  };

  const typeStyles = {
    GENERAL: "border-emerald-100 bg-emerald-50 text-emerald-700",
    URGENT: "border-red-100 bg-red-50 text-red-700",
    EVENT: "border-purple-100 bg-purple-50 text-purple-700",
    HOLIDAY: "border-amber-100 bg-amber-50 text-amber-700",
    SHOWCASE: "border-blue-100 bg-blue-50 text-[#0a2f66]",
  };

  const statusStyles = {
    PUBLISHED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    DRAFT: "bg-blue-50 text-[#0a2f66] ring-blue-200",
  };

  const rowAccentStyles = {
    GENERAL: "border-l-4 border-l-emerald-400",
    URGENT: "border-l-4 border-l-red-400",
    EVENT: "border-l-4 border-l-purple-400",
    HOLIDAY: "border-l-4 border-l-amber-400",
    SHOWCASE: "border-l-4 border-l-blue-400",
  };

  if (selectedNotice) {
    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-[#d7cdbb] shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => setSelectedNotice(null)}
              className="bg-slate-800 hover:bg-slate-700 text-[#17120a] px-4 py-2 rounded-lg transition"
            >
              Back to Notices
            </button>
            <div className="flex items-center gap-2">
              {!isPlatformMode && (
                <>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium text-[#17120a] ${getTypeColor(
                      selectedNotice.type
                    )}`}
                  >
                    {selectedNotice.type}
                  </span>
                  <span
                    className={`text-sm font-medium ${getPriorityColor(
                      selectedNotice.priority
                    )}`}
                  >
                    {selectedNotice.priority} Priority
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-[#17120a] mb-2">
                {selectedNotice.title}
              </h1>
              <div className="flex items-center gap-4 text-[#52657d] text-sm">
                <span>By {selectedNotice.author?.name}</span>
                <span>-</span>
                <span>{getStatusLabel(selectedNotice)}</span>
                <span>
                  {selectedNotice.publishedAt
                    ? formatDate(selectedNotice.publishedAt)
                    : "Not published yet"}
                </span>
              </div>
            </div>

            <div className="bg-[#f8fbff] p-6 rounded-xl border border-[#d7cdbb]">
              {isPlatformMode ? (
                <>
                  <h3 className="text-lg font-semibold text-[#17120a] mb-3">
                    Notice Delivery
                  </h3>
                  <div className="inline-flex rounded-full bg-slate-700 px-3 py-2 text-sm text-slate-200">
                    Visible inside school dashboards
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-semibold text-[#17120a] mb-3">
                    Target Audience
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {selectedNotice.targetAudience.students && (
                      <div className="flex items-center gap-2 bg-blue-600/20 text-blue-300 px-3 py-2 rounded-lg">
                        <FaUserGraduate />
                        <span>Students</span>
                      </div>
                    )}
                    {selectedNotice.targetAudience.teachers && (
                      <div className="flex items-center gap-2 bg-emerald-600/20 text-emerald-300 px-3 py-2 rounded-lg">
                        <FaChalkboardTeacher />
                        <span>Teachers</span>
                      </div>
                    )}
                    {selectedNotice.targetAudience.parents && (
                      <div className="flex items-center gap-2 bg-purple-600/20 text-purple-300 px-3 py-2 rounded-lg">
                        <FaUserFriends />
                        <span>Parents</span>
                      </div>
                    )}
                  </div>

                  {selectedNotice.grades?.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-[#17120a] font-medium mb-2">
                        Specific Grades:
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedNotice.grades.map((grade) => (
                          <span
                            key={grade}
                            className="bg-slate-700 text-[#344f77] px-2 py-1 rounded text-sm"
                          >
                            {grade}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="bg-[#f8fbff] p-6 rounded-xl border border-[#d7cdbb]">
              <h3 className="text-lg font-semibold text-[#17120a] mb-3">Content</h3>
              <div className="prose prose-invert max-w-none">
                <p className="text-[#344f77] whitespace-pre-wrap leading-relaxed">
                  {selectedNotice.content}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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

      {/* Header */}
      <div className="rounded-2xl border border-[#e1e7f2] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-purple-50 text-xl text-purple-700">
              <FaBullhorn />
            </span>
            <div>
              <h2 className="text-3xl font-black text-[#17120a]">{title}</h2>
              <p className="mt-2 max-w-2xl text-base text-[#52657d]">{subtitle}</p>
            </div>
          </div>
          <button
            onClick={() => {
              if (showForm) {
                resetForm();
                setEditingNoticeId("");
              }
              setShowForm(!showForm);
            }}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-purple-700 px-5 text-sm font-black text-white shadow-sm transition hover:bg-purple-800"
          >
            <FaPlus />
            {showForm ? "Cancel" : editingNoticeId ? "Edit Notice" : "Create Notice"}
          </button>
        </div>

        <div className="mt-5 flex gap-3 rounded-xl border border-purple-100 bg-purple-50/70 p-4 text-sm font-semibold text-[#40516b]">
          <FaInfoCircle className="mt-0.5 shrink-0 text-purple-700" />
          <p>
            {isPlatformMode
              ? "Platform notices appear inside logged-in school dashboards and notification panels."
              : isStudentOnlyMode
                ? "These notices are sent only to students of your school. Leave grades empty to send to all students."
                : "Choose the audience carefully so each notice reaches the right school community members."}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
                    metricToneClasses[card.tone]
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

      {/* Create Notice Form */}
      {showForm && (
        <div className="bg-white p-6 rounded-2xl border border-[#d7cdbb] shadow-sm">
          <h3 className="text-xl font-semibold text-[#17120a] mb-4">
            {editingNoticeId ? "Edit Notice" : "Create New Notice"}
          </h3>

          <form onSubmit={saveNotice} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Notice Title"
                value={noticeForm.title}
                onChange={(e) =>
                  setNoticeForm({ ...noticeForm, title: e.target.value })
                }
                className="bg-[#f8fbff] text-[#17120a] p-3 rounded-lg border border-[#d7cdbb] focus:border-[#0a2f66] focus:bg-white focus:outline-none"
                required
                maxLength={200}
              />

              {!isPlatformMode && !isStudentOnlyMode && (
                <div className="flex gap-2">
                  <select
                    value={noticeForm.type}
                    onChange={(e) =>
                      setNoticeForm({ ...noticeForm, type: e.target.value })
                    }
                    className="bg-[#f8fbff] text-[#17120a] p-3 rounded-lg border border-[#d7cdbb] focus:border-[#0a2f66] focus:bg-white focus:outline-none flex-1"
                  >
                    {noticeTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>

                  <select
                    value={noticeForm.priority}
                    onChange={(e) =>
                      setNoticeForm({ ...noticeForm, priority: e.target.value })
                    }
                    className="bg-[#f8fbff] text-[#17120a] p-3 rounded-lg border border-[#d7cdbb] focus:border-[#0a2f66] focus:bg-white focus:outline-none flex-1"
                  >
                    {priorities.map((priority) => (
                      <option key={priority.value} value={priority.value}>
                        {priority.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <textarea
              placeholder="Notice Content"
              value={noticeForm.content}
              onChange={(e) =>
                setNoticeForm({ ...noticeForm, content: e.target.value })
              }
              className="w-full bg-[#f8fbff] text-[#17120a] p-3 rounded-lg border border-[#d7cdbb] focus:border-[#0a2f66] focus:bg-white focus:outline-none h-32"
              required
              maxLength={2000}
            />

            {isPlatformMode ? (
              <div className="rounded-xl border border-[#2f7fdb]/30 bg-[#eaf2ff] p-4 text-sm text-[#0a2f66]">
                Published platform notices will be shown to schools inside their dashboard notification areas.
              </div>
            ) : isStudentOnlyMode ? (
              <div className="rounded-xl border border-[#2f7fdb]/30 bg-[#eaf2ff] p-4 text-sm text-[#0a2f66]">
                This notice will be delivered only to students of your school. You can limit it to selected grades below.
              </div>
            ) : (
              <div>
                <label className="block text-[#344f77] mb-2 font-medium">
                  Target Audience (Select at least one)
                </label>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={noticeForm.targetAudience.students}
                      onChange={(e) =>
                        setNoticeForm({
                          ...noticeForm,
                          targetAudience: {
                            ...noticeForm.targetAudience,
                            students: e.target.checked,
                          },
                        })
                      }
                      className="rounded border-[#d7cdbb] bg-white text-[#0a2f66] text-blue-600"
                    />
                    <FaUserGraduate className="text-blue-400" />
                    <span className="text-[#17120a]">Students</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={noticeForm.targetAudience.teachers}
                      onChange={(e) =>
                        setNoticeForm({
                          ...noticeForm,
                          targetAudience: {
                            ...noticeForm.targetAudience,
                            teachers: e.target.checked,
                          },
                        })
                      }
                      className="rounded border-[#d7cdbb] bg-white text-[#0a2f66] text-emerald-600"
                    />
                    <FaChalkboardTeacher className="text-emerald-400" />
                    <span className="text-[#17120a]">Teachers</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={noticeForm.targetAudience.parents}
                      onChange={(e) =>
                        setNoticeForm({
                          ...noticeForm,
                          targetAudience: {
                            ...noticeForm.targetAudience,
                            parents: e.target.checked,
                          },
                        })
                      }
                      className="rounded border-[#d7cdbb] bg-white text-[#0a2f66] text-purple-600"
                    />
                    <FaUserFriends className="text-purple-400" />
                    <span className="text-[#17120a]">Parents</span>
                  </label>
                </div>
              </div>
            )}

            {!isPlatformMode && (
              <div>
                <label className="block text-[#344f77] mb-2 font-medium">
                  Specific Grades (Leave empty for all grades)
                </label>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                  {gradeOptions.length === 0 ? (
                    <p className="col-span-full text-sm text-[#52657d]">
                      Loading grades...
                    </p>
                  ) : (
                    gradeOptions.map((grade) => (
                      <label
                        key={grade}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={noticeForm.grades.includes(grade)}
                          onChange={() => toggleGrade(grade)}
                          className="rounded border-[#d7cdbb] bg-white text-[#0a2f66] text-emerald-600"
                        />
                        <span className="text-[#344f77] text-sm">{grade}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}

            {!isPlatformMode && !isStudentOnlyMode && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-[#2f7fdb]/30 bg-[#eaf2ff] p-4 text-sm text-[#0a2f66]">
                  Notices stay visible until you edit, draft, or delete them.
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[#344f77] mb-2 font-medium">
                  Save As
                </label>
                <select
                  value={noticeForm.status}
                  onChange={(e) =>
                    setNoticeForm({ ...noticeForm, status: e.target.value })
                  }
                  className="w-full bg-[#f8fbff] text-[#17120a] p-3 rounded-lg border border-[#d7cdbb] focus:border-[#0a2f66] focus:bg-white focus:outline-none"
                >
                  <option value="PUBLISHED">Published</option>
                  <option value="DRAFT">Draft</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-500 text-[#17120a] px-6 py-3 rounded-lg font-medium transition"
              >
                {noticeForm.status === "DRAFT"
                  ? "Save as draft"
                  : editingNoticeId
                    ? "Update Notice"
                    : "Publish Notice"}
              </button>
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setEditingNoticeId("");
                  setShowForm(false);
                }}
                className="bg-slate-600 hover:bg-slate-500 text-[#17120a] px-6 py-3 rounded-lg font-medium transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="rounded-2xl border border-[#e6eaf7] bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[minmax(240px,1fr)_160px_160px_160px_auto]">
          <div className="relative">
            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-[#75869b]" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder={
                isStudentOnlyMode
                  ? "Search student notices..."
                  : "Search notice title or content..."
              }
              className="h-12 w-full rounded-xl border border-[#dbe5f4] bg-[#f8fbff] pl-11 pr-4 text-sm font-semibold outline-none transition focus:border-purple-300"
            />
          </div>
          {!isPlatformMode && (
            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              className="h-12 rounded-xl border border-[#dbe5f4] bg-white px-4 text-sm font-black text-[#24314d] outline-none transition focus:border-purple-300"
            >
              <option value="">All Types</option>
              {noticeTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          )}
          {!isPlatformMode && (
            <select
              value={filters.grade}
              onChange={(e) => setFilters({ ...filters, grade: e.target.value })}
              className="h-12 rounded-xl border border-[#dbe5f4] bg-white px-4 text-sm font-black text-[#24314d] outline-none transition focus:border-purple-300"
            >
              <option value="">All Grades</option>
              {gradeOptions.map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
            </select>
          )}
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="h-12 rounded-xl border border-[#dbe5f4] bg-white px-4 text-sm font-black text-[#24314d] outline-none transition focus:border-purple-300"
          >
            <option value="">All Status</option>
            <option value="PUBLISHED">Published</option>
            <option value="DRAFT">Draft</option>
          </select>
          <button
            type="button"
            onClick={() =>
              setFilters({
                type: "",
                priority: "",
                audience: "",
                status: "",
                grade: "",
                search: "",
              })
            }
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-[#dbe5f4] bg-white px-4 text-sm font-black text-[#0a2f66] transition hover:bg-[#f8fbff]"
          >
            <FaFilter />
            Clear
          </button>
        </div>
      </div>

      {/* Notices List */}
      <div className="rounded-2xl border border-[#e1e7f2] bg-white p-5 shadow-[0_14px_34px_rgba(10,47,102,0.08)]">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-xl font-black text-[#17120a]">
            All Notices ({pagination.totalItems ?? notices.length})
          </h3>
          <span className="text-sm font-black text-purple-700">
            Sort by: Newest First
          </span>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-xl border border-[#e1e7f2] bg-[#f8fbff] p-4"
              >
                <div className="mb-3 h-4 w-1/2 animate-pulse rounded bg-[#e1e7f2]" />
                <div className="mb-2 h-3 w-full animate-pulse rounded bg-[#e1e7f2]" />
                <div className="h-3 w-3/4 animate-pulse rounded bg-[#e1e7f2]" />
              </div>
            ))}
          </div>
        ) : notices.length > 0 ? (
          <>
            <div className="space-y-4">
              {notices.map((notice) => (
                <div
                  key={notice._id}
                  className={`rounded-xl border border-[#e1e7f2] bg-white p-4 shadow-sm transition hover:border-purple-200 hover:bg-[#f8fbff] ${
                    rowAccentStyles[notice.type] || rowAccentStyles.GENERAL
                  }`}
                >
                  <div className="grid gap-4 lg:grid-cols-[1fr_180px_112px] lg:items-center">
                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-black uppercase ${
                            typeStyles[notice.type] || typeStyles.GENERAL
                          }`}
                        >
                          {notice.type}
                        </span>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-black uppercase ring-1 ${
                            statusStyles[notice.status] || statusStyles.PUBLISHED
                          }`}
                        >
                          {getStatusLabel(notice)}
                        </span>
                        {!isPlatformMode && notice.grades?.length > 0 && (
                          <span className="rounded-full bg-[#f8fbff] px-2.5 py-1 text-[11px] font-black uppercase text-[#52657d]">
                            {notice.grades.join(", ")}
                          </span>
                        )}
                      </div>

                      <h4 className="line-clamp-1 text-lg font-black text-[#17120a]">
                        {notice.title}
                      </h4>
                      <p className="mt-1 line-clamp-2 text-sm text-[#52657d]">
                        {notice.content}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-bold text-[#75869b]">
                        <span>{notice.author?.name || "School Admin"}</span>
                        <span>
                          {notice.grades?.length > 0
                            ? `${notice.grades.length} grade target${
                                notice.grades.length === 1 ? "" : "s"
                              }`
                            : "All Students"}
                        </span>
                        <span>
                          {notice.publishedAt
                            ? formatDate(notice.publishedAt)
                            : "Not published yet"}
                        </span>
                      </div>
                    </div>

                    <div>
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-black ring-1 ${
                          statusStyles[notice.status] || statusStyles.PUBLISHED
                        }`}
                      >
                        {getStatusLabel(notice)}
                      </span>
                      <p className="mt-1 text-xs font-semibold text-[#75869b]">
                        {notice.publishedAt
                          ? formatDate(notice.publishedAt)
                          : "Not published yet"}
                      </p>
                    </div>

                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setSelectedNotice(notice)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#dbe5f4] bg-white text-[#0a2f66] transition hover:bg-[#f8fbff]"
                        title="View notice"
                      >
                        <FaEye />
                      </button>
                      <button
                        onClick={() => openEditNotice(notice)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#dbe5f4] bg-white text-[#0a2f66] transition hover:bg-[#f8fbff]"
                        title="Edit notice"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(notice)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-700 transition hover:bg-rose-100"
                        title="Archive notice"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>

                </div>
              ))}
            </div>
            <PaginationControls
              currentPage={pagination.page || pagination.currentPage || 1}
              totalPages={pagination.totalPages || 1}
              onPageChange={fetchNotices}
              totalItems={pagination.totalItems}
              start={pagination.start}
              end={pagination.end}
            />
          </>
        ) : (
          <EmptyState
            icon={FaBullhorn}
            title="No notices found"
            description="Create your first notice when you are ready to publish an update."
          />
        )}
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Archive this notice?"
        message={
          deleteTarget
            ? `"${deleteTarget.title}" will be removed from active notice lists, while keeping the record safely archived.`
            : ""
        }
        confirmLabel="Archive notice"
        tone="danger"
        busy={Boolean(deleteTarget?.busy)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={deleteNotice}
      />
    </div>
  );
}
