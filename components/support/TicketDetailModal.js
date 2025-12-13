"use client";

import { useState } from "react";
import {
  FaCheckCircle,
  FaClock,
  FaHourglassStart,
  FaChevronDown,
  FaChevronUp,
  FaTimes,
  FaSpinner,
  FaReply,
} from "react-icons/fa";

export default function TicketDetailModal({ ticket, isOpen, onClose, onReplyAdded }) {
  const [expandedReply, setExpandedReply] = useState(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showResolveDialog, setShowResolveDialog] = useState(false);
  const [resolutionMessage, setResolutionMessage] = useState("");

  if (!isOpen || !ticket) return null;

  const statusConfig = {
    pending: {
      icon: FaHourglassStart,
      color: "text-yellow-400 bg-yellow-500/10",
      label: "Pending",
    },
    "in-progress": {
      icon: FaClock,
      color: "text-blue-400 bg-blue-500/10",
      label: "In Progress",
    },
    resolved: {
      icon: FaCheckCircle,
      color: "text-emerald-400 bg-emerald-500/10",
      label: "Resolved",
    },
  };

  const config = statusConfig[ticket.status] || statusConfig.pending;
  const StatusIcon = config.icon;

  const handleReply = async (e) => {
    e.preventDefault();
    setError("");

    if (!replyMessage.trim()) {
      setError("Message cannot be empty");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/support-tickets/${ticket._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reply",
          message: replyMessage,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setReplyMessage("");
        onReplyAdded();
        alert("Reply sent successfully!");
      } else {
        setError(data.message || "Failed to send reply");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveTicket = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/support-tickets/${ticket._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reply",
          message: resolutionMessage.trim(),
          status: "resolved",
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setShowResolveDialog(false);
        setResolutionMessage("");
        onReplyAdded();
        alert("Ticket resolved successfully!");
      } else {
        setError(data.message || "Failed to resolve ticket");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: "bg-green-500/10 text-green-400",
      medium: "bg-yellow-500/10 text-yellow-400",
      high: "bg-red-500/10 text-red-400",
    };
    return colors[priority] || colors.medium;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-slate-900 border-b border-slate-700 p-6 flex justify-between items-start">
          <div className="flex-1">
            <h3 className="text-2xl font-bold text-white mb-2">{ticket.title}</h3>
            <p className="text-slate-400 text-sm">Ticket ID: {ticket._id}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-2xl"
          >
            <FaTimes />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status & Meta */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
              <div className="text-slate-400 text-sm mb-1">Status</div>
              <div className={`flex items-center gap-2 ${config.color} px-2 py-1 rounded w-fit`}>
                <StatusIcon /> {config.label}
              </div>
            </div>

            <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
              <div className="text-slate-400 text-sm mb-1">Priority</div>
              <div
                className={`text-sm px-2 py-1 rounded w-fit ${getPriorityColor(
                  ticket.priority
                )}`}
              >
                {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
              </div>
            </div>

            <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
              <div className="text-slate-400 text-sm mb-1">Created</div>
              <div className="text-white text-sm">
                {new Date(ticket.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <h4 className="text-white font-semibold mb-2">Description</h4>
            <div className="bg-slate-800/30 p-4 rounded-lg border border-slate-700 text-slate-300 whitespace-pre-wrap">
              {ticket.description}
            </div>
          </div>

          {/* Replies */}
          <div>
            <h4 className="text-white font-semibold mb-3">
              Replies ({ticket.replies?.length || 0})
            </h4>
            <div className="space-y-3">
              {ticket.replies && ticket.replies.length > 0 ? (
                ticket.replies.map((reply, index) => (
                  <div
                    key={index}
                    className="bg-slate-800/50 p-4 rounded-lg border border-slate-700"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="text-white font-semibold">
                          {reply.authorName || "Admin"}
                        </div>
                        <div className="text-slate-400 text-xs">
                          {reply.authorRole === "SUPER_ADMIN"
                            ? "Super Admin"
                            : "School Admin"}{" "}
                          •{" "}
                          {new Date(reply.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-slate-300 whitespace-pre-wrap">
                      {reply.message}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-slate-400 text-sm">No replies yet</p>
              )}
            </div>
          </div>

          {/* Reply Form */}
          {ticket.status !== "resolved" && (
            <div>
              <h4 className="text-white font-semibold mb-2">Add Reply</h4>
              <form onSubmit={handleReply} className="space-y-3">
                {error && (
                  <div className="bg-red-900/30 border border-red-700 text-red-100 p-3 rounded text-sm">
                    {error}
                  </div>
                )}
                <textarea
                  placeholder="Type your message..."
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-800 text-white p-3 rounded border border-slate-700 focus:border-emerald-500 outline-none transition resize-none"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white px-4 py-2 rounded font-medium transition flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <FaSpinner className="animate-spin" /> Sending...
                    </>
                  ) : (
                    <>
                      <FaReply /> Send Reply
                    </>
                  )}
                </button>

                {ticket.status !== "resolved" && (
                  <button
                    type="button"
                    onClick={() => setShowResolveDialog(true)}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded font-medium transition flex items-center justify-center gap-2"
                  >
                    <FaCheckCircle /> Resolve Ticket
                  </button>
                )}
              </form>
            </div>
          )}
        </div>

        {/* Resolve Dialog */}
        {showResolveDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-md p-6">
              <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                <FaCheckCircle className="text-emerald-400" /> Resolve Ticket
              </h3>

              <p className="text-slate-400 text-sm mb-4">
                Are you sure you want to resolve this ticket? You can add a final note.
              </p>

              {error && (
                <div className="bg-red-900/30 border border-red-700 text-red-100 p-3 rounded mb-3 text-sm">
                  {error}
                </div>
              )}

              <textarea
                placeholder="Final note (optional)..."
                value={resolutionMessage}
                onChange={(e) => setResolutionMessage(e.target.value)}
                rows={3}
                className="w-full bg-slate-800 text-white p-3 rounded border border-slate-700 focus:border-blue-500 outline-none transition resize-none mb-4"
              />

              <div className="flex gap-2">
                <button
                  onClick={() => setShowResolveDialog(false)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded font-medium transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResolveTicket}
                  disabled={loading}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white px-4 py-2 rounded font-medium transition flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <FaSpinner className="animate-spin" /> Resolving...
                    </>
                  ) : (
                    <>
                      <FaCheckCircle /> Confirm Resolve
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
