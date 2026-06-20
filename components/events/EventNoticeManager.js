"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FaBell,
  FaCalendarAlt,
  FaEdit,
  FaEllipsisH,
  FaEye,
  FaFileAlt,
  FaFilter,
  FaGlobe,
  FaPaperPlane,
  FaPlus,
  FaSave,
  FaSearch,
  FaTrash,
} from "react-icons/fa";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

const NOTICE_TYPES = [
  "GENERAL",
  "REGISTRATION",
  "ROUND_INSTRUCTIONS",
  "SCHEDULE_UPDATE",
  "SHORTLIST",
  "POSTPONEMENT",
  "CANCELLATION",
  "FINAL_RESULT",
];

const EMPTY_FORM = {
  title: "",
  message: "",
  type: "GENERAL",
  status: "PUBLISHED",
};

function formatDate(value) {
  if (!value) return "Draft";
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function label(value) {
  return String(value || "GENERAL").replaceAll("_", " ");
}

function statusClass(status) {
  if (status === "PUBLISHED") return "bg-emerald-50 text-emerald-700";
  if (status === "DRAFT") return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-700";
}

function noticeIconClass(type = "") {
  const normalized = String(type).toUpperCase();
  if (normalized.includes("IMPORTANT")) return "bg-rose-50 text-rose-600";
  if (normalized.includes("SCHEDULE")) return "bg-amber-50 text-amber-600";
  if (normalized.includes("RESULT")) return "bg-purple-50 text-purple-700";
  return "bg-purple-50 text-purple-700";
}

export default function EventNoticeManager({ eventId, eventTitle = "Event", readOnly = false }) {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingNoticeId, setEditingNoticeId] = useState("");
  const [selectedNotice, setSelectedNotice] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState("");
  const [activeView, setActiveView] = useState("ALL");
  const [openMenuId, setOpenMenuId] = useState("");

  const fetchNotices = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/events/${eventId}/notices`, {
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "Failed to load notices.");
      }
      setNotices(Array.isArray(data.notices) ? data.notices : []);
    } catch (error) {
      setStatusMessage(error.message);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchNotices();
  }, [fetchNotices]);

  const metrics = useMemo(
    () => ({
      total: notices.length,
      published: notices.filter((notice) => notice.status === "PUBLISHED").length,
      drafts: notices.filter((notice) => notice.status === "DRAFT").length,
      public: notices.filter(
        (notice) => String(notice.visibility || "PUBLIC").toUpperCase() === "PUBLIC"
      ).length,
    }),
    [notices]
  );

  const typeOptions = useMemo(
    () =>
      Array.from(
        new Set([
          ...NOTICE_TYPES,
          ...notices.map((notice) => notice.type).filter(Boolean),
        ])
      ),
    [notices]
  );

  const filteredNotices = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return notices.filter((notice) => {
      const status = String(notice.status || "").toUpperCase();
      const visibility = String(notice.visibility || "PUBLIC").toUpperCase();
      const matchesView =
        activeView === "ALL" ||
        (activeView === "PUBLISHED" && status === "PUBLISHED") ||
        (activeView === "DRAFT" && status === "DRAFT") ||
        (activeView === "SCHEDULED" && status === "SCHEDULED");
      const matchesSearch =
        !needle ||
        String(notice.title || "").toLowerCase().includes(needle) ||
        String(notice.message || "").toLowerCase().includes(needle);
      const matchesType =
        !typeFilter || String(notice.type || "GENERAL").toUpperCase() === typeFilter;
      const matchesStatus = !statusFilter || status === statusFilter;
      const matchesVisibility = !visibilityFilter || visibility === visibilityFilter;

      return (
        matchesView &&
        matchesSearch &&
        matchesType &&
        matchesStatus &&
        matchesVisibility
      );
    });
  }, [activeView, notices, search, statusFilter, typeFilter, visibilityFilter]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingNoticeId("");
  };

  const openCreate = () => {
    resetForm();
    setSelectedNotice(null);
    setShowForm(true);
  };

  const openEdit = (notice) => {
    setEditingNoticeId(notice._id);
    setSelectedNotice(null);
    setForm({
      title: notice.title || "",
      message: notice.message || "",
      type: notice.type || "GENERAL",
      status: notice.status || "DRAFT",
    });
    setShowForm(true);
  };

  const saveNotice = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setStatusMessage("");
      const method = editingNoticeId ? "PATCH" : "POST";
      const url = editingNoticeId
        ? `/api/events/${eventId}/notices/${editingNoticeId}`
        : `/api/events/${eventId}/notices`;
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "Failed to save notice.");
      }
      setStatusMessage(data.message || "Notice saved.");
      setShowForm(false);
      resetForm();
      await fetchNotices();
    } catch (error) {
      setStatusMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const deleteNotice = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/events/${eventId}/notices/${deleteTarget._id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "Failed to delete notice.");
      }
      setStatusMessage(data.message || "Notice archived.");
      if (selectedNotice?._id === deleteTarget._id) {
        setSelectedNotice(null);
      }
      setDeleteTarget(null);
      await fetchNotices();
    } catch (error) {
      setStatusMessage(error.message);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-[#e1e7f2] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-2xl text-purple-700">
              <FaBell />
            </span>
            <div>
              <h2 className="text-2xl font-black text-[#17120a]">Event Notices</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-[#52657d]">
                {readOnly
                  ? "Notices and updates posted by the organizer for this event."
                  : "Create and manage notices for this event. Notices are shown on the public event page and the matching school dashboard card."}
              </p>
            </div>
          </div>
          {!readOnly && (
            <button
              type="button"
              onClick={showForm ? () => setShowForm(false) : openCreate}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-purple-700 px-5 text-sm font-black text-white shadow-sm transition hover:bg-purple-800"
            >
              <FaPlus />
              {showForm ? "Close" : "Create Notice"}
            </button>
          )}
        </div>

        {statusMessage && (
          <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-bold text-[#0a2f66]">
            {statusMessage}
          </div>
        )}
      </section>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          ["Total Notices", metrics.total, "All time", FaFileAlt, "purple"],
          ["Published", metrics.published, "Live on event page", FaPaperPlane, "emerald"],
          ["Drafts", metrics.drafts, "Not yet published", FaCalendarAlt, "amber"],
          ["Public", metrics.public, "Visible to public", FaGlobe, "blue"],
        ].map(([title, value, detail, Icon, tone]) => {
          const toneClass =
            tone === "emerald"
              ? "bg-emerald-50 text-emerald-700"
              : tone === "amber"
              ? "bg-amber-50 text-amber-700"
              : tone === "blue"
              ? "bg-blue-50 text-[#0a2f66]"
              : "bg-purple-50 text-purple-700";
          return (
            <button
              key={title}
              type="button"
              onClick={() => {
                if (title === "Published") setActiveView("PUBLISHED");
                if (title === "Drafts") setActiveView("DRAFT");
                if (title === "Total Notices") setActiveView("ALL");
              }}
              className="rounded-xl border border-[#e1e7f2] bg-white p-4 text-left shadow-sm transition hover:border-purple-200 hover:bg-[#f8fbff]"
            >
              <div className="flex items-center gap-3">
                <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${toneClass}`}>
                  <Icon />
                </span>
                <span>
                  <span className="block text-xs font-black text-[#52657d]">
                    {title}
                  </span>
                  <strong className="block text-2xl font-black text-[#17120a]">
                    {value}
                  </strong>
                  <span className="block text-xs font-bold text-[#52657d]">
                    {detail}
                  </span>
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {showForm && (
        <section className="rounded-xl border border-[#e1e7f2] bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-black text-[#17120a]">
              {editingNoticeId ? "Edit Event Notice" : `Create Notice for ${eventTitle}`}
            </h3>
          </div>
          <form onSubmit={saveNotice} className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm font-black text-[#40516b]">
                Title
              </span>
              <input
                required
                value={form.title}
                onChange={(e) =>
                  setForm((current) => ({ ...current, title: e.target.value }))
                }
                className="h-12 w-full rounded-xl border border-[#dbe5f4] px-4 text-[#17120a] outline-none focus:border-purple-300"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-black text-[#40516b]">
                Message
              </span>
              <textarea
                required
                value={form.message}
                onChange={(e) =>
                  setForm((current) => ({ ...current, message: e.target.value }))
                }
                className="min-h-32 w-full rounded-xl border border-[#dbe5f4] px-4 py-3 text-[#17120a] outline-none focus:border-purple-300"
              />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label>
                <span className="mb-1 block text-sm font-black text-[#40516b]">
                  Notice Type
                </span>
                <select
                  value={form.type}
                  onChange={(e) =>
                    setForm((current) => ({ ...current, type: e.target.value }))
                  }
                  className="h-12 w-full rounded-xl border border-[#dbe5f4] px-4 text-[#17120a] outline-none focus:border-purple-300"
                >
                  {NOTICE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {label(type)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="mb-1 block text-sm font-black text-[#40516b]">
                  Save As
                </span>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm((current) => ({ ...current, status: e.target.value }))
                  }
                  className="h-12 w-full rounded-xl border border-[#dbe5f4] px-4 text-[#17120a] outline-none focus:border-purple-300"
                >
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Publish Notice</option>
                </select>
              </label>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="inline-flex min-h-11 items-center rounded-xl border border-[#dbe5f4] bg-white px-5 text-sm font-black text-[#0a2f66] transition hover:bg-[#f8fbff]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-purple-700 px-5 text-sm font-black text-white transition hover:bg-purple-800 disabled:opacity-60"
              >
                <FaSave />
                {submitting ? "Saving..." : "Save Notice"}
              </button>
            </div>
          </form>
        </section>
      )}

      {selectedNotice && (
        <section className="rounded-xl border border-[#e1e7f2] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h3 className="text-xl font-black text-[#17120a]">
                {selectedNotice.title}
              </h3>
              <p className="mt-2 text-sm text-[#52657d]">
                {label(selectedNotice.type)} - Public event notice -{" "}
                {formatDate(selectedNotice.publishedAt)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedNotice(null)}
              className="rounded-xl border border-[#dbe5f4] bg-white px-4 py-2 text-sm font-black text-[#0a2f66] hover:bg-[#f8fbff]"
            >
              Close
            </button>
          </div>
          <p className="mt-5 whitespace-pre-wrap text-[#27344a]">
            {selectedNotice.message}
          </p>
        </section>
      )}

      <section className="overflow-hidden rounded-xl border border-[#e1e7f2] bg-white shadow-sm">
        <div className="grid gap-3 border-b border-[#e1e7f2] p-4 lg:grid-cols-[minmax(220px,1fr)_150px_150px_150px_auto]">
          <div className="flex h-11 items-center gap-3 rounded-xl border border-[#dbe5f4] bg-white px-4">
            <FaSearch className="text-[#75869b]" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search notices..."
              className="min-w-0 flex-1 bg-transparent text-sm font-bold text-[#17120a] outline-none placeholder:text-[#75869b]"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            className="h-11 rounded-xl border border-[#dbe5f4] bg-white px-3 text-sm font-black text-[#0a2f66] outline-none"
          >
            <option value="">All Types</option>
            {typeOptions.map((type) => (
              <option key={type} value={String(type).toUpperCase()}>
                {label(type)}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="h-11 rounded-xl border border-[#dbe5f4] bg-white px-3 text-sm font-black text-[#0a2f66] outline-none"
          >
            <option value="">All Status</option>
            <option value="PUBLISHED">Published</option>
            <option value="DRAFT">Draft</option>
          </select>
          <select
            value={visibilityFilter}
            onChange={(event) => setVisibilityFilter(event.target.value)}
            className="h-11 rounded-xl border border-[#dbe5f4] bg-white px-3 text-sm font-black text-[#0a2f66] outline-none"
          >
            <option value="">All Visibility</option>
            <option value="PUBLIC">Public</option>
          </select>
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setTypeFilter("");
              setStatusFilter("");
              setVisibilityFilter("");
              setActiveView("ALL");
            }}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#dbe5f4] bg-white px-4 text-sm font-black text-[#0a2f66] transition hover:bg-[#f8fbff]"
          >
            <FaFilter />
            Clear
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e1e7f2] px-4">
          <div className="flex flex-wrap">
            {[
              ["ALL", "All"],
              ["PUBLISHED", "Published"],
              ["DRAFT", "Drafts"],
              ["SCHEDULED", "Scheduled"],
            ].map(([id, title]) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveView(id)}
                className={`relative min-h-11 px-4 text-xs font-black transition ${
                  activeView === id
                    ? "text-purple-700 after:absolute after:bottom-0 after:left-0 after:h-[3px] after:w-full after:rounded-full after:bg-purple-700"
                    : "text-[#52657d] hover:text-purple-700"
                }`}
              >
                {title}
              </button>
            ))}
          </div>
          <span className="text-xs font-bold text-[#52657d]">Sort by: Newest</span>
        </div>

        <div>
          {loading ? (
            <p className="p-8 text-center text-sm font-bold text-[#52657d]">
              Loading notices...
            </p>
          ) : filteredNotices.length === 0 ? (
            <p className="p-8 text-center text-sm font-bold text-[#52657d]">
              No notices match this view yet.
            </p>
          ) : (
            <div className="divide-y divide-[#e1e7f2]">
              {filteredNotices.map((notice) => (
                <article
                  key={notice._id}
                  className="grid gap-4 px-4 py-4 transition hover:bg-[#f8fbff] lg:grid-cols-[1fr_230px]"
                >
                  <div className="flex gap-4">
                    <span
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl ${noticeIconClass(
                        notice.type
                      )}`}
                    >
                      <FaBell />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-black uppercase text-purple-700">
                          {label(notice.type)}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${statusClass(
                            notice.status
                          )}`}
                        >
                          {notice.status === "PUBLISHED" ? "Published" : "Draft"}
                        </span>
                      </div>
                      <h3 className="mt-2 text-base font-black text-[#17120a]">
                        {notice.title}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-sm text-[#52657d]">
                        {notice.message}
                      </p>
                      <p className="mt-2 text-xs font-bold text-[#75869b]">
                        {formatDate(notice.publishedAt || notice.createdAt)} - Public
                      </p>
                    </div>
                  </div>
                  <div className="relative flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedNotice(notice)}
                      className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-[#dbe5f4] bg-white px-3 text-xs font-black text-[#0a2f66] hover:bg-[#f8fbff]"
                    >
                      <FaEye />
                      Preview
                    </button>
                    {!readOnly && (
                    <button
                      type="button"
                      onClick={() => openEdit(notice)}
                      className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-[#dbe5f4] bg-white px-3 text-xs font-black text-[#0a2f66] hover:bg-[#f8fbff]"
                    >
                      <FaEdit />
                      Edit
                    </button>
                    )}
                    {!readOnly && (
                    <button
                      type="button"
                      onClick={() =>
                        setOpenMenuId((current) =>
                          current === notice._id ? "" : notice._id
                        )
                      }
                      className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-[#dbe5f4] bg-white px-3 text-xs font-black text-[#0a2f66] hover:bg-[#f8fbff]"
                    >
                      <FaEllipsisH />
                      More
                    </button>
                    )}
                    {!readOnly && openMenuId === notice._id && (
                      <div className="absolute right-0 top-10 z-10 w-44 rounded-xl border border-[#e1e7f2] bg-white p-2 shadow-[0_16px_36px_rgba(10,47,102,0.16)]">
                        <button
                          type="button"
                          onClick={() => {
                            setOpenMenuId("");
                            setDeleteTarget(notice);
                          }}
                          className="flex min-h-9 w-full items-center gap-2 rounded-lg px-3 text-left text-xs font-black text-rose-700 hover:bg-rose-50"
                        >
                          <FaTrash />
                          Archive notice
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Archive this event notice?"
        message={
          deleteTarget
            ? `"${deleteTarget.title}" will no longer be shown on the event notice stream.`
            : ""
        }
        confirmLabel="Archive notice"
        tone="danger"
        onClose={() => setDeleteTarget(null)}
        onConfirm={deleteNotice}
      />
    </div>
  );
}
