"use client";

import { useState, useEffect } from "react";
import RaiseTicketForm from "./RaiseTicketForm";
import TicketDetailModal from "./TicketDetailModal";
import {
  FaCheckCircle,
  FaClock,
  FaHourglassStart,
  FaSearch,
  FaSpinner,
} from "react-icons/fa";

export default function SupportTicketManager() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showResolved, setShowResolved] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/support-tickets");
      if (res.ok) {
        const data = await res.json();
        setTickets(data.data?.tickets || []);
      }
    } catch (error) {
      console.error("Error fetching tickets:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleTicketCreated = () => {
    fetchTickets();
  };

  const handleReplyAdded = () => {
    setSelectedTicket(null);
    setIsDetailOpen(false);
    fetchTickets();
  };

  const filteredTickets = tickets.filter((ticket) => {
    // Hide resolved tickets unless showResolved is enabled
    if (ticket.status === "resolved" && !showResolved) {
      return false;
    }

    const matchesStatus =
      filterStatus === "all" || ticket.status === filterStatus;
    const matchesSearch =
      ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket._id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

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

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Support Tickets</h2>
          <p className="text-slate-400">
            Manage your support requests and track responses
          </p>
        </div>
        <RaiseTicketForm onTicketCreated={handleTicketCreated} />
      </div>

      {/* Filters */}
      <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-400 text-sm mb-2">
              Search Tickets
            </label>
            <div className="relative">
              <FaSearch className="absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                placeholder="Search by title or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800 text-white pl-10 pr-4 py-2 rounded border border-slate-700 focus:border-emerald-500 outline-none transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 text-sm mb-2">
              Filter by Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full bg-slate-800 text-white p-2 rounded border border-slate-700 focus:border-emerald-500 outline-none transition"
            >
              <option value="all">All Tickets</option>
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="showResolved"
              checked={showResolved}
              onChange={(e) => setShowResolved(e.target.checked)}
              className="w-4 h-4 rounded cursor-pointer"
            />
            <label htmlFor="showResolved" className="text-slate-400 text-sm cursor-pointer">
              Show Resolved Tickets
            </label>
          </div>
        </div>
      </div>

      {/* Tickets List */}
      {loading ? (
        <div className="bg-slate-900/50 p-8 rounded-2xl border border-slate-800 text-center">
          <FaSpinner className="animate-spin text-2xl text-emerald-400 mx-auto mb-2" />
          <p className="text-slate-400">Loading tickets...</p>
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="bg-slate-900/50 p-8 rounded-2xl border border-slate-800 text-center">
          <p className="text-slate-400">
            {tickets.length === 0
              ? "No tickets created yet. Raise one to get support!"
              : "No tickets match your filters."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTickets.map((ticket) => {
            const config = statusConfig[ticket.status];
            const StatusIcon = config.icon;

            return (
              <div
                key={ticket._id}
                onClick={() => {
                  setSelectedTicket(ticket);
                  setIsDetailOpen(true);
                }}
                className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 hover:border-emerald-500/30 transition cursor-pointer group"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-white group-hover:text-emerald-400 transition">
                        {ticket.title}
                      </h3>
                      <span className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded">
                        #{ticket._id.slice(-6).toUpperCase()}
                      </span>
                    </div>
                    <p className="text-slate-400 text-sm line-clamp-2">
                      {ticket.description}
                    </p>
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <span
                        className={`text-xs px-2 py-1 rounded capitalize ${
                          {
                            low: "bg-green-500/10 text-green-400",
                            medium: "bg-yellow-500/10 text-yellow-400",
                            high: "bg-red-500/10 text-red-400",
                          }[ticket.priority]
                        }`}
                      >
                        {ticket.priority} priority
                      </span>
                      <span className="text-xs text-slate-500">
                        {new Date(ticket.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div
                      className={`flex items-center gap-2 px-3 py-1 rounded-full ${config.color}`}
                    >
                      <StatusIcon /> {config.label}
                    </div>
                    {ticket.replies && ticket.replies.length > 0 && (
                      <div className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-1 rounded">
                        {ticket.replies.length} reply
                        {ticket.replies.length > 1 ? "ies" : ""}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      <TicketDetailModal
        ticket={selectedTicket}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedTicket(null);
        }}
        onReplyAdded={handleReplyAdded}
      />
    </div>
  );
}
