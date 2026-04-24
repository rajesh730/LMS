"use client";

import { useState, useEffect } from "react";
import {
  FaEnvelope,
  FaCheckCircle,
  FaReply,
  FaFilter,
  FaExclamationCircle,
  FaSpinner,
} from "react-icons/fa";
import Modal from "@/components/Modal";

export default function ParentCommunicationManager() {
  const [communications, setCommunications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ type: "ALL", status: "ALL" });

  // Reply Modal State
  const [selectedComm, setSelectedComm] = useState(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchCommunications();
  }, [filter]);

  const fetchCommunications = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.type !== "ALL") params.append("type", filter.type);
      if (filter.status !== "ALL") params.append("status", filter.status);

      const res = await fetch(`/api/school/communication?${params}`);
      const data = await res.json();
      if (data.success) {
        setCommunications(data.data);
      }
    } catch (error) {
      console.error("Error fetching communications:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async (e) => {
    e.preventDefault();
    if (!selectedComm || !replyMessage.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/school/communication", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedComm._id,
          adminReply: replyMessage,
          status: "RESOLVED",
        }),
      });

      if (res.ok) {
        // Update local state
        setCommunications((prev) =>
          prev.map((c) =>
            c._id === selectedComm._id
              ? { ...c, status: "RESOLVED", adminReply: replyMessage }
              : c,
          ),
        );
        setSelectedComm(null);
        setReplyMessage("");
      }
    } catch (error) {
      console.error("Error sending reply:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      const res = await fetch("/api/school/communication", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });

      if (res.ok) {
        setCommunications((prev) =>
          prev.map((c) => (c._id === id ? { ...c, status: newStatus } : c)),
        );
      }
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "PENDING":
        return "text-yellow-400 bg-yellow-400/10";
      case "ACKNOWLEDGED":
        return "text-blue-400 bg-blue-400/10";
      case "RESOLVED":
        return "text-emerald-400 bg-emerald-400/10";
      default:
        return "text-slate-400 bg-slate-400/10";
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case "ABSENT_NOTE":
        return <FaExclamationCircle className="text-orange-400" />;
      case "FEEDBACK":
        return <FaEnvelope className="text-blue-400" />;
      default:
        return <FaEnvelope className="text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2 text-slate-400">
          <FaFilter />
          <span className="text-sm font-medium">Filters:</span>
        </div>

        <select
          value={filter.type}
          onChange={(e) => setFilter({ ...filter, type: e.target.value })}
          className="bg-slate-800 text-white text-sm rounded-lg px-3 py-2 border border-slate-700 focus:border-blue-500 outline-none"
        >
          <option value="ALL">All Types</option>
          <option value="ABSENT_NOTE">Absent Notes</option>
          <option value="FEEDBACK">Feedback</option>
          <option value="COMPLAINT">Complaints</option>
        </select>

        <select
          value={filter.status}
          onChange={(e) => setFilter({ ...filter, status: e.target.value })}
          className="bg-slate-800 text-white text-sm rounded-lg px-3 py-2 border border-slate-700 focus:border-blue-500 outline-none"
        >
          <option value="ALL">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="ACKNOWLEDGED">Acknowledged</option>
          <option value="RESOLVED">Resolved</option>
        </select>
      </div>

      {/* List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12 text-slate-500">
            Loading communications...
          </div>
        ) : communications.length === 0 ? (
          <div className="text-center py-12 text-slate-500 bg-slate-900/30 rounded-xl border border-slate-800">
            No communications found matching your filters.
          </div>
        ) : (
          communications.map((comm) => (
            <div
              key={comm._id}
              className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors"
            >
              <div className="flex justify-between items-start gap-4 mb-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1 p-2 bg-slate-800 rounded-lg">
                    {getTypeIcon(comm.type)}
                  </div>
                  <div>
                    <h4 className="text-white font-semibold text-lg">
                      {comm.subject}
                    </h4>
                    <div className="flex items-center gap-2 text-sm text-slate-400 mt-1">
                      <span>{comm.student?.name}</span>
                      <span>•</span>
                      <span>{comm.student?.grade}</span>
                      <span>•</span>
                      <span>
                        {new Date(comm.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {comm.type === "ABSENT_NOTE" && comm.absentDate && (
                      <div className="text-orange-400 text-sm mt-1 font-medium">
                        Absent Date:{" "}
                        {new Date(comm.absentDate).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>

                <div
                  className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(comm.status)}`}
                >
                  {comm.status.replace("_", " ")}
                </div>
              </div>

              <div className="bg-slate-800/50 rounded-lg p-4 text-slate-300 text-sm mb-4 whitespace-pre-wrap">
                {comm.message}
              </div>

              {comm.adminReply && (
                <div className="bg-blue-900/20 border border-blue-900/50 rounded-lg p-4 mb-4 ml-8">
                  <div className="text-xs text-blue-400 font-semibold mb-1">
                    School Reply:
                  </div>
                  <div className="text-slate-300 text-sm">
                    {comm.adminReply}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2 border-t border-slate-800/50">
                {comm.status === "PENDING" && (
                  <button
                    onClick={() => handleStatusChange(comm._id, "ACKNOWLEDGED")}
                    className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-2"
                  >
                    <FaCheckCircle /> Mark Acknowledged
                  </button>
                )}

                <button
                  onClick={() => {
                    setSelectedComm(comm);
                    setReplyMessage(comm.adminReply || "");
                  }}
                  className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  <FaReply /> {comm.adminReply ? "Edit Reply" : "Reply"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Reply Modal */}
      <Modal
        isOpen={!!selectedComm}
        onClose={() => setSelectedComm(null)}
        title={`Reply to ${selectedComm?.student?.name}`}
      >
        <form onSubmit={handleReply} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">
              Original Message
            </label>
            <div className="bg-slate-900 p-3 rounded text-slate-300 text-sm max-h-32 overflow-y-auto">
              {selectedComm?.message}
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">
              Your Reply
            </label>
            <textarea
              value={replyMessage}
              onChange={(e) => setReplyMessage(e.target.value)}
              className="w-full h-32 bg-slate-800 border border-slate-700 rounded p-3 text-white focus:border-blue-500 outline-none resize-none"
              placeholder="Type your response here..."
              required
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setSelectedComm(null)}
              className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting && <FaSpinner className="animate-spin" />}
              Send Reply
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
