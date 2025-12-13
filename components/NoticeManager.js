"use client";

import { useState, useEffect } from "react";
import {
  FaBullhorn,
  FaPlus,
  FaEdit,
  FaTrash,
  FaEye,
  FaUsers,
  FaCalendarAlt,
  FaExclamationTriangle,
  FaUserGraduate,
  FaChalkboardTeacher,
  FaUserFriends,
} from "react-icons/fa";

export default function NoticeManager() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState(null);
  const [filters, setFilters] = useState({
    type: "",
    priority: "",
    audience: "",
  });

  const [noticeForm, setNoticeForm] = useState({
    title: "",
    content: "",
    type: "GENERAL",
    priority: "NORMAL",
    targetAudience: {
      students: false,
      teachers: false,
      parents: false,
    },
    grades: [],
    expiryDate: "",
  });

  const noticeTypes = [
    { value: "GENERAL", label: "General", color: "bg-blue-500" },
    { value: "URGENT", label: "Urgent", color: "bg-red-500" },
    { value: "ACADEMIC", label: "Academic", color: "bg-green-500" },
    { value: "EVENT", label: "Event", color: "bg-purple-500" },
    { value: "HOLIDAY", label: "Holiday", color: "bg-yellow-500" },
    { value: "EXAM", label: "Exam", color: "bg-orange-500" },
  ];

  const priorities = [
    { value: "LOW", label: "Low", color: "text-slate-400" },
    { value: "NORMAL", label: "Normal", color: "text-blue-400" },
    { value: "HIGH", label: "High", color: "text-orange-400" },
    { value: "URGENT", label: "Urgent", color: "text-red-400" },
  ];

  const gradeOptions = [
    "Grade 1",
    "Grade 2",
    "Grade 3",
    "Grade 4",
    "Grade 5",
    "Grade 6",
    "Grade 7",
    "Grade 8",
    "Grade 9",
    "Grade 10",
    "Grade 11",
    "Grade 12",
    "Bachelor",
  ];

  useEffect(() => {
    fetchNotices();
  }, [filters]);

  const fetchNotices = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.type) params.append("type", filters.type);
      if (filters.priority) params.append("priority", filters.priority);
      if (filters.audience) params.append("audience", filters.audience);

      const res = await fetch(`/api/notices?${params}`);
      const data = await res.json();
      setNotices(data.notices || []);
    } catch (error) {
      console.error("Error fetching notices:", error);
    } finally {
      setLoading(false);
    }
  };

  const createNotice = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/notices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(noticeForm),
      });

      if (res.ok) {
        alert("Notice published successfully!");
        resetForm();
        setShowForm(false);
        fetchNotices();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to publish notice");
      }
    } catch (error) {
      console.error("Error creating notice:", error);
      alert("Error publishing notice");
    }
  };

  const deleteNotice = async (noticeId) => {
    if (!confirm("Are you sure you want to delete this notice?")) return;

    try {
      const res = await fetch(`/api/notices/${noticeId}`, { method: "DELETE" });

      if (res.ok) {
        alert("Notice deleted successfully!");
        fetchNotices();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to delete notice");
      }
    } catch (error) {
      console.error("Error deleting notice:", error);
      alert("Error deleting notice");
    }
  };

  const resetForm = () => {
    setNoticeForm({
      title: "",
      content: "",
      type: "GENERAL",
      priority: "NORMAL",
      targetAudience: {
        students: false,
        teachers: false,
        parents: false,
      },
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

  if (selectedNotice) {
    return (
      <div className="space-y-6">
        <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => setSelectedNotice(null)}
              className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg transition"
            >
              ← Back to Notices
            </button>
            <div className="flex items-center gap-2">
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
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                {selectedNotice.title}
              </h1>
              <div className="flex items-center gap-4 text-slate-400 text-sm">
                <span>By {selectedNotice.author?.name}</span>
                <span>•</span>
                <span>{formatDate(selectedNotice.publishedAt)}</span>
                {selectedNotice.expiryDate && (
                  <>
                    <span>•</span>
                    <span>
                      Expires: {formatDate(selectedNotice.expiryDate)}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="bg-slate-800/50 p-6 rounded-xl">
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
      {/* Header */}
      <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <FaBullhorn className="text-emerald-400" />
              Notice Board
            </h2>
            <p className="text-slate-400 text-sm">
              Manage and publish notices for your school
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-medium transition flex items-center gap-2"
          >
            <FaPlus />
            {showForm ? "Cancel" : "Create Notice"}
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <select
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
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
        </div>
      </div>

      {/* Create Notice Form */}
      {showForm && (
        <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
          <h3 className="text-xl font-semibold text-white mb-4">
            Create New Notice
          </h3>

          <form onSubmit={createNotice} className="space-y-4">
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

            {/* Target Audience */}
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

            {/* Grade Selection */}
            <div>
              <label className="block text-slate-300 mb-2 font-medium">
                Specific Grades (Leave empty for all grades)
              </label>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                {gradeOptions.map((grade) => (
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
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 mb-2 font-medium">
                  Expiry Date (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={noticeForm.expiryDate}
                  onChange={(e) =>
                    setNoticeForm({ ...noticeForm, expiryDate: e.target.value })
                  }
                  className="w-full bg-slate-800 text-white p-3 rounded-lg border border-slate-700"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-lg font-medium transition"
              >
                Publish Notice
              </button>
              <button
                type="button"
                onClick={() => {
                  resetForm();
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
          All Notices ({notices.length})
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
          <div className="space-y-4">
            {notices.map((notice) => (
              <div
                key={notice._id}
                className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 hover:border-slate-600 transition"
              >
                <div className="flex items-start justify-between mb-3">
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

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedNotice(notice)}
                      className="text-slate-400 hover:text-blue-400 transition"
                      title="View Details"
                    >
                      <FaEye />
                    </button>
                    <button
                      onClick={() => deleteNotice(notice._id)}
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
                    <span>{formatDate(notice.publishedAt)}</span>
                  </div>

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
                </div>

                {notice.expiryDate && (
                  <div className="mt-2 text-xs text-orange-400 flex items-center gap-1">
                    <FaCalendarAlt />
                    Expires: {formatDate(notice.expiryDate)}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <FaBullhorn className="text-6xl text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 text-lg">No notices found</p>
            <p className="text-slate-500 text-sm">
              Create your first notice to get started
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
