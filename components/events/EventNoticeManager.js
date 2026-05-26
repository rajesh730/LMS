"use client";

import { useCallback, useEffect, useState } from "react";
import { FaBell, FaEdit, FaEye, FaPlus, FaSave, FaTrash } from "react-icons/fa";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

const EMPTY_FORM = {
  title: "",
  message: "",
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
  return String(value || "").replaceAll("_", " ");
}

export default function EventNoticeManager({ eventId, eventTitle = "Event" }) {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingNoticeId, setEditingNoticeId] = useState("");
  const [selectedNotice, setSelectedNotice] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState(null);

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
      setStatusMessage(data.message || "Notice deleted.");
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
    <div className="space-y-4">
      <div className="rounded-lg border border-[#d7cdbb] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="flex items-center gap-3 text-xl font-bold text-[#17120a]">
              <FaBell className="text-red-600" />
              Event Notices
            </h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#52657d]">
              Publish one event-level notice stream that appears on the public event page and the matching school dashboard event card.
            </p>
          </div>
          <button
            type="button"
            onClick={showForm ? () => setShowForm(false) : openCreate}
            className="event-manage-tab-active inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-500"
          >
            <FaPlus />
            {showForm ? "Close" : "Create Notice"}
          </button>
        </div>

        {statusMessage && (
          <div className="mt-4 rounded-lg border border-[#d7cdbb] bg-[#f8fbff] px-4 py-3 text-sm text-[#52657d]">
            {statusMessage}
          </div>
        )}
      </div>

      {showForm && (
        <div className="rounded-lg border border-[#d7cdbb] bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h4 className="text-lg font-bold text-[#17120a]">
              {editingNoticeId ? "Edit Event Notice" : `Create Notice for ${eventTitle}`}
            </h4>
          </div>
          <form onSubmit={saveNotice} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="md:col-span-2">
                <div className="mb-1 text-sm font-medium text-[#40516b]">Title</div>
                <input
                  required
                  value={form.title}
                  onChange={(e) =>
                    setForm((current) => ({ ...current, title: e.target.value }))
                  }
                  className="w-full rounded-lg border border-[#d7cdbb] px-3 py-2.5 text-[#17120a] outline-none focus:border-red-400"
                />
              </label>
              <label className="md:col-span-2">
                <div className="mb-1 text-sm font-medium text-[#40516b]">Message</div>
                <textarea
                  required
                  value={form.message}
                  onChange={(e) =>
                    setForm((current) => ({ ...current, message: e.target.value }))
                  }
                  className="min-h-36 w-full rounded-lg border border-[#d7cdbb] px-3 py-2.5 text-[#17120a] outline-none focus:border-red-400"
                />
              </label>
              <label>
                <div className="mb-1 text-sm font-medium text-[#40516b]">Save As</div>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm((current) => ({ ...current, status: e.target.value }))
                  }
                  className="w-full rounded-lg border border-[#d7cdbb] px-3 py-2.5 text-[#17120a] outline-none focus:border-red-400"
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
                className="rounded-lg border border-[#d7cdbb] bg-white px-4 py-2.5 text-sm font-semibold text-[#40516b] hover:bg-[#f8fbff]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="event-manage-tab-active inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-60"
              >
                <FaSave />
                {submitting ? "Saving..." : "Save Notice"}
              </button>
            </div>
          </form>
        </div>
      )}

      {selectedNotice && (
        <div className="rounded-lg border border-[#d7cdbb] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h4 className="text-xl font-bold text-[#17120a]">{selectedNotice.title}</h4>
              <p className="mt-2 text-sm text-[#52657d]">
                {label(selectedNotice.type)} - Public event notice - {formatDate(selectedNotice.publishedAt)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedNotice(null)}
              className="rounded-lg border border-[#d7cdbb] bg-white px-4 py-2 text-sm font-semibold text-[#40516b] hover:bg-[#f8fbff]"
            >
              Close
            </button>
          </div>
          <p className="mt-5 whitespace-pre-wrap text-[#27344a]">{selectedNotice.message}</p>
        </div>
      )}

      <div className="rounded-lg border border-[#d7cdbb] bg-white p-5 shadow-sm">
        <h4 className="text-lg font-bold text-[#17120a]">All Event Notices ({notices.length})</h4>
        {loading ? (
          <p className="mt-4 text-sm text-[#52657d]">Loading notices...</p>
        ) : notices.length === 0 ? (
          <p className="mt-4 text-sm text-[#52657d]">
            No event notices yet. Publish one notice here instead of using round-wise notices.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {notices.map((notice) => (
              <div
                key={notice._id}
                className="rounded-lg border border-[#d7cdbb] bg-[#f8fbff] p-4"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h5 className="text-base font-semibold text-[#17120a]">{notice.title}</h5>
                      <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                        {label(notice.type)}
                      </span>
                      <span className="rounded-full border border-[#d7cdbb] bg-white px-2.5 py-1 text-xs font-semibold text-[#40516b]">
                        {notice.status === "PUBLISHED" ? "Published" : "Draft"}
                      </span>
                      <span className="rounded-full border border-[#d7cdbb] bg-white px-2.5 py-1 text-xs font-semibold text-[#40516b]">
                        Public
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-3 text-sm text-[#52657d]">{notice.message}</p>
                    <p className="mt-2 text-xs text-[#52657d]">
                      {formatDate(notice.publishedAt || notice.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedNotice(notice)}
                      className="rounded-lg border border-[#d7cdbb] bg-white p-2 text-[#40516b] hover:bg-[#f8fbff]"
                      title="View notice"
                    >
                      <FaEye />
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(notice)}
                      className="rounded-lg border border-[#d7cdbb] bg-white p-2 text-[#40516b] hover:bg-[#f8fbff]"
                      title="Edit notice"
                    >
                      <FaEdit />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(notice)}
                      className="rounded-lg bg-rose-100 p-2 text-rose-700 hover:bg-rose-200"
                      title="Delete notice"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
