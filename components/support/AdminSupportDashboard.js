"use client";

import { useState, useEffect } from "react";
import {
  FaCheckCircle,
  FaClock,
  FaHourglassStart,
  FaSearch,
  FaSpinner,
  FaFilter,
  FaTimes,
  FaReply,
  FaExclamationCircle,
  FaBook,
} from "react-icons/fa";

export default function AdminSupportDashboard() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [replyMessage, setReplyMessage] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [replyLoading, setReplyLoading] = useState(false);
  const [error, setError] = useState("");
  const [showResolveDialog, setShowResolveDialog] = useState(false);
  const [resolutionMessage, setResolutionMessage] = useState("");
  const [showFaqDialog, setShowFaqDialog] = useState(false);
  const [faqTitle, setFaqTitle] = useState("");
  const [faqContent, setFaqContent] = useState("");
  const [showResolved, setShowResolved] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, [filterStatus]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const url =
        filterStatus === "all"
          ? "/api/support-tickets"
          : `/api/support-tickets?status=${filterStatus}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setTickets(data.data?.tickets || []);
      }
    } catch (err) {
      console.error("Error fetching tickets:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTicket = async (ticketId) => {
    try {
      console.log("Fetching ticket:", ticketId);
      const res = await fetch(`/api/support-tickets/${ticketId}`);
      
      console.log("Response status:", res.status);
      console.log("Response ok:", res.ok);
      console.log("Response headers:", {
        contentType: res.headers.get("content-type"),
        contentLength: res.headers.get("content-length"),
      });
      
      const text = await res.text();
      console.log("Raw response text:", text);
      
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error("Failed to parse JSON:", e);
        setError("Invalid response from server");
        return;
      }
      
      console.log("Parsed data:", data);
      
      if (res.ok) {
        console.log("Ticket loaded successfully:", data.data?.ticket);
        setSelectedTicket(data.data?.ticket);
        setNewStatus(data.data?.ticket?.status);
        setReplyMessage("");
        setInternalNote("");
        setError("");
      } else {
        setError(data.message || `Server error: ${res.status}`);
        console.error("Error response:", data);
      }
    } catch (err) {
      setError("Failed to load ticket details: " + err.message);
      console.error("Error fetching ticket:", err);
    }
  };

  const handleReply = async () => {
    if (!replyMessage.trim() && !internalNote.trim() && !newStatus) {
      setError("Please add a reply, internal note, or change status");
      return;
    }

    setReplyLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/support-tickets/${selectedTicket._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reply",
          message: replyMessage,
          status: newStatus,
          internalNote: internalNote,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setReplyMessage("");
        setInternalNote("");
        setSelectedTicket(data.data?.ticket);
        setNewStatus(data.data?.ticket?.status);
        fetchTickets();
        alert("Ticket updated successfully!");
      } else {
        setError(data.message || "Failed to update ticket");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setReplyLoading(false);
    }
  };

  const handleResolveTicket = async () => {
    if (!selectedTicket) return;

    setReplyLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/support-tickets/${selectedTicket._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reply",
          message: resolutionMessage.trim(),
          status: "resolved",
          sendNotification: true,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setShowResolveDialog(false);
        setResolutionMessage("");
        setSelectedTicket(data.data?.ticket);
        setNewStatus("resolved");
        fetchTickets();
        alert("Ticket resolved and school has been notified!");
      } else {
        setError(data.message || "Failed to resolve ticket");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setReplyLoading(false);
    }
  };

  const handleCreateFaq = async () => {
    if (!faqTitle.trim() || !faqContent.trim()) {
      setError("FAQ title and content are required");
      return;
    }

    try {
      const res = await fetch("/api/faqs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: faqTitle,
          content: faqContent,
          relatedTicket: selectedTicket._id,
          category: "Support",
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setShowFaqDialog(false);
        setFaqTitle("");
        setFaqContent("");
        alert("FAQ article created successfully!");
      } else {
        setError(data.message || "Failed to create FAQ");
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const statusConfig = {
    pending: {
      Icon: FaHourglassStart,
      color: "text-yellow-400 bg-yellow-500/10",
      label: "Pending",
    },
    "in-progress": {
      Icon: FaClock,
      color: "text-blue-400 bg-blue-500/10",
      label: "In Progress",
    },
    resolved: {
      Icon: FaCheckCircle,
      color: "text-emerald-400 bg-emerald-500/10",
      label: "Resolved",
    },
  };

  const filteredTickets = tickets.filter((ticket) => {
    // Hide resolved tickets unless showResolved is enabled
    if (ticket.status === "resolved" && !showResolved) {
      return false;
    }

    // Filter by status
    if (filterStatus !== "all" && ticket.status !== filterStatus) {
      return false;
    }

    // Search filter
    return (
      ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket._id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.schoolName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const getPriorityColor = (priority) => {
    const colors = {
      low: "bg-green-500/10 text-green-400",
      medium: "bg-yellow-500/10 text-yellow-400",
      high: "bg-red-500/10 text-red-400",
    };
    return colors[priority] || colors.medium;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Tickets List */}
      <div className="lg:col-span-1 space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-4">Support Tickets</h2>

          {/* Search & Filter */}
          <div className="space-y-3 mb-4">
            <div className="relative">
              <FaSearch className="absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                placeholder="Search tickets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800 text-white pl-10 pr-4 py-2 rounded border border-slate-700 focus:border-emerald-500 outline-none transition"
              />
            </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full bg-slate-800 text-white p-2 rounded border border-slate-700 focus:border-emerald-500 outline-none transition"
            >
              <option value="all">All Tickets</option>
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
            </select>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="showResolvedAdmin"
                checked={showResolved}
                onChange={(e) => setShowResolved(e.target.checked)}
                className="w-4 h-4 rounded cursor-pointer"
              />
              <label htmlFor="showResolvedAdmin" className="text-slate-400 text-sm cursor-pointer">
                Show Resolved Tickets
              </label>
            </div>
          </div>
        </div>

        {/* Tickets Count */}
        <div className="bg-slate-800/50 p-3 rounded border border-slate-700 text-sm text-slate-400">
          {filteredTickets.length} ticket{filteredTickets.length !== 1 ? "s" : ""}{" "}
          found
        </div>

        {/* Tickets List */}
        <div className="space-y-2 max-h-[calc(100vh-400px)] overflow-y-auto">
          {loading ? (
            <div className="text-center py-8">
              <FaSpinner className="animate-spin text-2xl text-emerald-400 mx-auto mb-2" />
              <p className="text-slate-400">Loading tickets...</p>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              No tickets found
            </div>
          ) : (
            filteredTickets.map((ticket) => {
              const config = statusConfig[ticket.status];
              const StatusIcon = config.Icon;

              return (
                <div
                  key={ticket._id}
                  onClick={() => handleSelectTicket(ticket._id)}
                  className={`p-3 rounded-lg border transition cursor-pointer ${
                    selectedTicket?._id === ticket._id
                      ? "bg-emerald-500/20 border-emerald-500"
                      : "bg-slate-800/50 border-slate-700 hover:border-emerald-500/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1">
                      <h4 className="text-white font-semibold text-sm line-clamp-1">
                        {ticket.title}
                      </h4>
                      <p className="text-slate-400 text-xs">
                        {ticket.schoolName}
                      </p>
                    </div>
                    <StatusIcon className={`flex-shrink-0 text-xs ${config.color}`} />
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span
                      className={`px-2 py-0.5 rounded capitalize ${getPriorityColor(
                        ticket.priority
                      )}`}
                    >
                      {ticket.priority}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Ticket Details */}
      <div className="lg:col-span-2">
        {selectedTicket ? (
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-6">
            {/* Header */}
            <div>
              <h3 className="text-2xl font-bold text-white mb-2">
                {selectedTicket.title}
              </h3>
              <p className="text-slate-400">
                Ticket ID: {selectedTicket._id}
              </p>
              <p className="text-slate-400 text-sm">
                School: {selectedTicket.schoolName}
              </p>
            </div>

            {/* Meta */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="bg-slate-800/50 p-3 rounded border border-slate-700">
                <div className="text-slate-400 text-xs mb-1">Status</div>
                <div className={`flex items-center gap-1 ${statusConfig[selectedTicket.status].color} text-xs px-2 py-1 rounded w-fit`}>
                  {(() => {
                    const Icon = statusConfig[selectedTicket.status].Icon;
                    return <Icon />;
                  })()}
                  {statusConfig[selectedTicket.status].label}
                </div>
              </div>

              <div className="bg-slate-800/50 p-3 rounded border border-slate-700">
                <div className="text-slate-400 text-xs mb-1">Priority</div>
                <div
                  className={`text-xs px-2 py-1 rounded w-fit capitalize ${getPriorityColor(
                    selectedTicket.priority
                  )}`}
                >
                  {selectedTicket.priority}
                </div>
              </div>

              <div className="bg-slate-800/50 p-3 rounded border border-slate-700">
                <div className="text-slate-400 text-xs mb-1">Created</div>
                <div className="text-white text-xs">
                  {new Date(selectedTicket.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <h4 className="text-white font-semibold mb-2">Description</h4>
              <div className="bg-slate-800/30 p-3 rounded border border-slate-700 text-slate-300 text-sm whitespace-pre-wrap">
                {selectedTicket.description}
              </div>
            </div>

            {/* Replies */}
            <div>
              <h4 className="text-white font-semibold mb-2">
                Replies ({selectedTicket.replies?.length || 0})
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {selectedTicket.replies && selectedTicket.replies.length > 0 ? (
                  selectedTicket.replies.map((reply, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-800/50 p-3 rounded border border-slate-700"
                    >
                      <div className="flex justify-between items-start mb-1">
                        <div className="text-sm font-semibold text-white">
                          {reply.authorName}
                        </div>
                        <div className="text-xs text-slate-500">
                          {new Date(reply.createdAt).toLocaleString()}
                        </div>
                      </div>
                      <div className="text-xs text-slate-400 mb-1">
                        {reply.authorRole === "SUPER_ADMIN"
                          ? "Super Admin"
                          : "School Admin"}
                      </div>
                      <p className="text-slate-300 text-sm">
                        {reply.message}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400 text-sm">No replies yet</p>
                )}
              </div>
            </div>

            {/* Internal Notes */}
            {selectedTicket.internalNotes && selectedTicket.internalNotes.length > 0 && (
              <div>
                <h4 className="text-white font-semibold mb-2">Internal Notes</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {selectedTicket.internalNotes.map((note, idx) => (
                    <div
                      key={idx}
                      className="bg-purple-900/20 p-3 rounded border border-purple-700/30"
                    >
                      <div className="flex justify-between items-start mb-1">
                        <div className="text-sm font-semibold text-purple-400">
                          {note.authorName}
                        </div>
                        <div className="text-xs text-purple-400/60">
                          {new Date(note.createdAt).toLocaleString()}
                        </div>
                      </div>
                      <p className="text-purple-300 text-sm">{note.note}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Panel */}
            <div className="border-t border-slate-700 pt-6">
              <h4 className="text-white font-semibold mb-3">Actions</h4>

              {error && (
                <div className="bg-red-900/30 border border-red-700 text-red-100 p-3 rounded mb-3 text-sm flex items-start gap-2">
                  <FaExclamationCircle className="mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-3">
                {/* Status Update */}
                <div>
                  <label className="block text-slate-400 text-sm mb-1">
                    Update Status
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full bg-slate-800 text-white p-2 rounded border border-slate-700 focus:border-emerald-500 outline-none transition text-sm"
                  >
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>

                {/* Reply Message */}
                <div>
                  <label className="block text-slate-400 text-sm mb-1">
                    Reply to School
                  </label>
                  <textarea
                    placeholder="Type your response to the school..."
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    rows={3}
                    className="w-full bg-slate-800 text-white p-2 rounded border border-slate-700 focus:border-emerald-500 outline-none transition resize-none text-sm"
                  />
                </div>

                {/* Internal Note */}
                <div>
                  <label className="block text-slate-400 text-sm mb-1">
                    Internal Note (Admin Only)
                  </label>
                  <textarea
                    placeholder="Add internal notes for other admins..."
                    value={internalNote}
                    onChange={(e) => setInternalNote(e.target.value)}
                    rows={2}
                    className="w-full bg-purple-900/20 text-white p-2 rounded border border-purple-700/30 focus:border-purple-500 outline-none transition resize-none text-sm"
                  />
                </div>

                {/* Submit Button */}
                <div className="flex gap-2">
                  <button
                    onClick={handleReply}
                    disabled={replyLoading}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white px-4 py-2 rounded font-medium transition flex items-center justify-center gap-2"
                  >
                    {replyLoading ? (
                      <>
                        <FaSpinner className="animate-spin" /> Updating...
                      </>
                    ) : (
                      <>
                        <FaReply /> Update
                      </>
                    )}
                  </button>

                  {selectedTicket.status !== "resolved" && (
                    <button
                      onClick={() => setShowResolveDialog(true)}
                      className="flex-1 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded font-medium transition flex items-center justify-center gap-2"
                    >
                      <FaCheckCircle /> Resolve
                    </button>
                  )}
                </div>

                {selectedTicket.status === "resolved" && (
                  <button
                    onClick={() => setShowFaqDialog(true)}
                    className="w-full bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded font-medium transition flex items-center justify-center gap-2"
                  >
                    <FaBook /> Create FAQ from this ticket
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 text-center">
            <FaFilter className="text-4xl text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">Select a ticket to view details</p>
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
              Are you sure you want to resolve this ticket? You can add a final message to send to the school.
            </p>

            {error && (
              <div className="bg-red-900/30 border border-red-700 text-red-100 p-3 rounded mb-3 text-sm flex items-start gap-2">
                <FaExclamationCircle className="mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <textarea
              placeholder="Final message to send to school (optional)..."
              value={resolutionMessage}
              onChange={(e) => setResolutionMessage(e.target.value)}
              rows={3}
              className="w-full bg-slate-800 text-white p-3 rounded border border-slate-700 focus:border-emerald-500 outline-none transition resize-none mb-4"
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
                disabled={replyLoading}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white px-4 py-2 rounded font-medium transition flex items-center justify-center gap-2"
              >
                {replyLoading ? (
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

      {/* FAQ Dialog */}
      {showFaqDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
              <FaBook className="text-purple-400" /> Create FAQ Article
            </h3>

            <p className="text-slate-400 text-sm mb-4">
              Create a knowledge base article from this resolved ticket to help other schools.
            </p>

            {error && (
              <div className="bg-red-900/30 border border-red-700 text-red-100 p-3 rounded mb-3 text-sm flex items-start gap-2">
                <FaExclamationCircle className="mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-slate-400 text-sm mb-1">Article Title</label>
                <input
                  type="text"
                  placeholder="e.g., How to fix event creation issues"
                  value={faqTitle}
                  onChange={(e) => setFaqTitle(e.target.value)}
                  className="w-full bg-slate-800 text-white p-2 rounded border border-slate-700 focus:border-purple-500 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-slate-400 text-sm mb-1">Article Content</label>
                <textarea
                  placeholder="Detailed solution and steps..."
                  value={faqContent}
                  onChange={(e) => setFaqContent(e.target.value)}
                  rows={4}
                  className="w-full bg-slate-800 text-white p-2 rounded border border-slate-700 focus:border-purple-500 outline-none transition resize-none"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowFaqDialog(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFaq}
                className="flex-1 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded font-medium transition flex items-center justify-center gap-2"
              >
                <FaBook /> Create FAQ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
