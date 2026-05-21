"use client";

import { useCallback, useEffect, useState } from "react";
import {
  FaBullhorn,
  FaEdit,
  FaPlus,
  FaTrash,
  FaEye,
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
    { value: "LOW", label: "Low", color: "text-slate-400" },
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

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchNotices(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchNotices]);

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
      priorities.find((p) => p.value === priority)?.color || "text-slate-400"
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

  if (selectedNotice) {
    return (
      <div className="space-y-6">
        <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => setSelectedNotice(null)}
              className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg transition"
            >
              Back to Notices
            </button>
            <div className="flex items-center gap-2">
              {!isPlatformMode && (
                <>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium text-white ${getTypeColor(
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
              <h1 className="text-3xl font-bold text-white mb-2">
                {selectedNotice.title}
              </h1>
              <div className="flex items-center gap-4 text-slate-400 text-sm">
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

            <div className="bg-slate-800/50 p-6 rounded-xl">
              {isPlatformMode ? (
                <>
                  <h3 className="text-lg font-semibold text-white mb-3">
                    Notice Delivery
                  </h3>
                  <div className="inline-flex rounded-full bg-slate-700 px-3 py-2 text-sm text-slate-200">
                    Visible inside school dashboards
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-semibold text-white mb-3">
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
                      <h4 className="text-white font-medium mb-2">
                        Specific Grades:
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedNotice.grades.map((grade) => (
                          <span
                            key={grade}
                            className="bg-slate-700 text-slate-300 px-2 py-1 rounded text-sm"
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

            <div className="bg-slate-800/50 p-6 rounded-xl">
              <h3 className="text-lg font-semibold text-white mb-3">Content</h3>
              <div className="prose prose-invert max-w-none">
                <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">
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
      <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <FaBullhorn className="text-emerald-400" />
              {title}
            </h2>
            <p className="text-slate-400 text-sm">
              {subtitle}
            </p>
          </div>
          <button
            onClick={() => {
              if (showForm) {
                resetForm();
                setEditingNoticeId("");
              }
              setShowForm(!showForm);
            }}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-medium transition flex items-center gap-2"
          >
            <FaPlus />
            {showForm ? "Cancel" : editingNoticeId ? "Edit Notice" : "Create Notice"}
          </button>
        </div>

        {/* Filters */}
        <div
          className={`mt-6 grid gap-4 ${
            isPlatformMode ? "grid-cols-1" : "grid-cols-1 md:grid-cols-3"
          }`}
        >
          {isPlatformMode ? (
            <>
              <div className="bg-slate-800 text-slate-400 p-3 rounded-lg border border-slate-700 text-sm">
                Platform notices appear inside logged-in school dashboards and notification panels.
              </div>
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) =>
                    setFilters({ ...filters, search: e.target.value })
                  }
                  placeholder="Search platform notices..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 py-3 pl-10 pr-3 text-white outline-none transition focus:border-blue-500"
                />
              </div>
            </>
          ) : isStudentOnlyMode ? (
            <>
              <div className="bg-slate-800 text-slate-300 p-3 rounded-lg border border-slate-700 text-sm">
                These notices are sent only to students of your school. Leave grades empty to send to all students.
              </div>
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) =>
                    setFilters({ ...filters, search: e.target.value })
                  }
                  placeholder="Search student notices..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 py-3 pl-10 pr-3 text-white outline-none transition focus:border-blue-500"
                />
              </div>
            </>
          ) : (
            <>
              <div className="relative md:col-span-3">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) =>
                    setFilters({ ...filters, search: e.target.value })
                  }
                  placeholder="Search notice title or content..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 py-3 pl-10 pr-3 text-white outline-none transition focus:border-blue-500"
                />
              </div>
              <select
                value={filters.type}
                onChange={(e) =>
                  setFilters({ ...filters, type: e.target.value })
                }
                className="bg-slate-800 text-white p-3 rounded-lg border border-slate-700"
              >
                <option value="">All Types</option>
                {noticeTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>

              <select
                value={filters.priority}
                onChange={(e) =>
                  setFilters({ ...filters, priority: e.target.value })
                }
                className="bg-slate-800 text-white p-3 rounded-lg border border-slate-700"
              >
                <option value="">All Priorities</option>
                {priorities.map((priority) => (
                  <option key={priority.value} value={priority.value}>
                    {priority.label}
                  </option>
                ))}
              </select>

              <select
                value={filters.audience}
                onChange={(e) =>
                  setFilters({ ...filters, audience: e.target.value })
                }
                className="bg-slate-800 text-white p-3 rounded-lg border border-slate-700"
              >
                <option value="">All Audiences</option>
                <option value="students">Students</option>
                <option value="teachers">Teachers</option>
                <option value="parents">Parents</option>
              </select>
            </>
          )}
        </div>
      </div>

      {/* Create Notice Form */}
      {showForm && (
        <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
          <h3 className="text-xl font-semibold text-white mb-4">
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
                className="bg-slate-800 text-white p-3 rounded-lg border border-slate-700"
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
                    className="bg-slate-800 text-white p-3 rounded-lg border border-slate-700 flex-1"
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
                    className="bg-slate-800 text-white p-3 rounded-lg border border-slate-700 flex-1"
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
              className="w-full bg-slate-800 text-white p-3 rounded-lg border border-slate-700 h-32"
              required
              maxLength={2000}
            />

            {isPlatformMode ? (
              <div className="rounded-lg border border-slate-700 bg-slate-800/80 p-4 text-sm text-slate-300">
                Published platform notices will be shown to schools inside their dashboard notification areas.
              </div>
            ) : isStudentOnlyMode ? (
              <div className="rounded-lg border border-slate-700 bg-slate-800/80 p-4 text-sm text-slate-300">
                This notice will be delivered only to students of your school. You can limit it to selected grades below.
              </div>
            ) : (
              <div>
                <label className="block text-slate-300 mb-2 font-medium">
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
                      className="rounded border-slate-600 bg-slate-700 text-blue-600"
                    />
                    <FaUserGraduate className="text-blue-400" />
                    <span className="text-white">Students</span>
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
                      className="rounded border-slate-600 bg-slate-700 text-emerald-600"
                    />
                    <FaChalkboardTeacher className="text-emerald-400" />
                    <span className="text-white">Teachers</span>
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
                      className="rounded border-slate-600 bg-slate-700 text-purple-600"
                    />
                    <FaUserFriends className="text-purple-400" />
                    <span className="text-white">Parents</span>
                  </label>
                </div>
              </div>
            )}

            {!isPlatformMode && (
              <div>
                <label className="block text-slate-300 mb-2 font-medium">
                  Specific Grades (Leave empty for all grades)
                </label>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                  {gradeOptions.length === 0 ? (
                    <p className="col-span-full text-sm text-slate-400">
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
                          className="rounded border-slate-600 bg-slate-700 text-emerald-600"
                        />
                        <span className="text-slate-300 text-sm">{grade}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}

            {!isPlatformMode && !isStudentOnlyMode && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg border border-slate-700 bg-slate-800/80 p-4 text-sm text-slate-300">
                  Notices stay visible until you edit, draft, or delete them.
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 mb-2 font-medium">
                  Save As
                </label>
                <select
                  value={noticeForm.status}
                  onChange={(e) =>
                    setNoticeForm({ ...noticeForm, status: e.target.value })
                  }
                  className="w-full bg-slate-800 text-white p-3 rounded-lg border border-slate-700"
                >
                  <option value="PUBLISHED">Published</option>
                  <option value="DRAFT">Draft</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-lg font-medium transition"
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
                className="bg-slate-600 hover:bg-slate-500 text-white px-6 py-3 rounded-lg font-medium transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Notices List */}
      <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
        <h3 className="text-xl font-semibold text-white mb-4">
          All Notices ({pagination.totalItems ?? notices.length})
        </h3>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-slate-800 p-4 rounded-xl animate-pulse"
              >
                <div className="h-4 bg-slate-700 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-slate-700 rounded w-full mb-2"></div>
                <div className="h-3 bg-slate-700 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        ) : notices.length > 0 ? (
          <>
            <div className="space-y-4">
              {notices.map((notice) => (
                <div
                key={notice._id}
                className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 hover:border-slate-600 transition"
              >
                <div className="flex items-start justify-between mb-3">
                  {!isPlatformMode ? (
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium text-white ${getTypeColor(
                          notice.type
                        )}`}
                      >
                        {notice.type}
                      </span>
                      <span
                        className={`text-xs font-medium ${getPriorityColor(
                          notice.priority
                        )}`}
                      >
                        {notice.priority}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                      <span>{getStatusLabel(notice)}</span>
                      <span>Platform notice</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditNotice(notice)}
                      className="text-slate-400 hover:text-blue-400 transition"
                      title="Edit Notice"
                    >
                      <FaEdit />
                    </button>
                    <button
                      onClick={() => setSelectedNotice(notice)}
                      className="text-slate-400 hover:text-blue-400 transition"
                      title="View Details"
                    >
                      <FaEye />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(notice)}
                      className="text-slate-400 hover:text-red-400 transition"
                      title="Delete Notice"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>

                <h4 className="text-lg font-semibold text-white mb-2">
                  {notice.title}
                </h4>
                <p className="text-slate-400 text-sm mb-3 line-clamp-2">
                  {notice.content}
                </p>

                <div className="flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-4">
                    <span>By {notice.author?.name}</span>
                    <span>{getStatusLabel(notice)}</span>
                    <span>
                      {notice.publishedAt
                        ? formatDate(notice.publishedAt)
                        : "Not published yet"}
                    </span>
                  </div>

                  {isPlatformMode ? (
                    <div className="rounded-full bg-slate-700 px-2 py-1 text-[11px] font-semibold text-slate-200">
                      Dashboard notice
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      {notice.targetAudience.students && (
                        <FaUserGraduate className="text-blue-400" />
                      )}
                      {notice.targetAudience.teachers && (
                        <FaChalkboardTeacher className="text-emerald-400" />
                      )}
                      {notice.targetAudience.parents && (
                        <FaUserFriends className="text-purple-400" />
                      )}
                    </div>
                  )}
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
