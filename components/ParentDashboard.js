"use client";

import { useCallback, useEffect, useState } from "react";
import { FaCalendarCheck, FaCommentDots, FaStar, FaTrophy } from "react-icons/fa";

export default function ParentDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [communications, setCommunications] = useState([]);

  const fetchCommunications = useCallback(async () => {
    try {
      const res = await fetch("/api/student/communication");
      const data = await res.json();
      if (data.success) {
        setCommunications(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch communications", error);
    }
  }, []);

  useEffect(() => {
    const loadCommunications = async () => {
      await fetchCommunications();
    };
    loadCommunications();
  }, [fetchCommunications]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
              <FaCalendarCheck className="text-emerald-400 text-xl" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Event Participation</p>
              <h3 className="text-2xl font-bold text-white">Active</h3>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <FaStar className="text-blue-400 text-xl" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Talent Profile</p>
              <h3 className="text-2xl font-bold text-white">Growing</h3>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
              <FaTrophy className="text-purple-400 text-xl" />
            </div>
            <div>
              <p className="text-slate-400 text-sm">Messages & Updates</p>
              <h3 className="text-2xl font-bold text-white">{communications.length}</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="flex border-b border-slate-800">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === "overview"
                ? "bg-slate-800 text-white border-b-2 border-purple-500"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("communication")}
            className={`px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === "communication"
                ? "bg-slate-800 text-white border-b-2 border-purple-500"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            }`}
          >
            Communication
          </button>
        </div>

        <div className="p-6">
          {activeTab === "overview" && (
            <div className="text-center py-12 text-slate-400">
              <p>Talent participation, event highlights, and school activity insights will appear here.</p>
            </div>
          )}

          {activeTab === "communication" && (
            <CommunicationPanel communications={communications} refresh={fetchCommunications} />
          )}
        </div>
      </div>
    </div>
  );
}

function CommunicationPanel({ communications, refresh }) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    type: "ABSENT_NOTE",
    subject: "",
    message: "",
    absentDate: new Date().toISOString().split("T")[0],
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/student/communication", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setIsFormOpen(false);
        setFormData({
          type: "ABSENT_NOTE",
          subject: "",
          message: "",
          absentDate: new Date().toISOString().split("T")[0],
        });
        refresh();
      }
    } catch (error) {
      console.error("Error sending message", error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-white">Message History</h3>
        <button
          onClick={() => setIsFormOpen(!isFormOpen)}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
        >
          {isFormOpen ? "Cancel" : "New Message"}
        </button>
      </div>

      {isFormOpen && (
        <form onSubmit={handleSubmit} className="bg-slate-800/50 p-6 rounded-xl mb-8 border border-slate-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
              >
                <option value="ABSENT_NOTE">Participation Update</option>
                <option value="FEEDBACK">Feedback / Suggestion</option>
                <option value="COMPLAINT">Complaint</option>
              </select>
            </div>
            {formData.type === "ABSENT_NOTE" && (
              <div>
                <label className="block text-sm text-slate-400 mb-1">Relevant Event Date</label>
                <input
                  type="date"
                  value={formData.absentDate}
                  onChange={(e) => setFormData({ ...formData, absentDate: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>
            )}
          </div>

          <div className="mb-4">
            <label className="block text-sm text-slate-400 mb-1">Title</label>
            <input
              type="text"
              required
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
              placeholder="Brief title..."
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm text-slate-400 mb-1">Message</label>
            <textarea
              required
              rows={4}
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
              placeholder="Write your message here..."
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {submitting ? "Sending..." : "Send Message"}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {communications.length === 0 ? (
          <p className="text-slate-500 text-center py-8">No messages yet.</p>
        ) : (
          communications.map((comm) => (
            <div key={comm._id} className="bg-slate-800/30 border border-slate-800 p-4 rounded-xl">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                    comm.type === "ABSENT_NOTE" ? "bg-red-500/20 text-red-400" : "bg-blue-500/20 text-blue-400"
                  }`}>
                    {comm.type.replace("_", " ")}
                  </span>
                  <h4 className="text-white font-medium mt-2">{comm.subject}</h4>
                </div>
                <span className="text-xs text-slate-500">
                  {new Date(comm.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="text-slate-400 text-sm mb-3">{comm.message}</p>

              {comm.adminReply && (
                <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-3 mb-3 ml-4">
                  <div className="text-xs text-purple-400 font-semibold mb-1">School Reply:</div>
                  <p className="text-slate-300 text-sm">{comm.adminReply}</p>
                </div>
              )}

              <div className="flex items-center gap-2 text-xs">
                <span className={`px-2 py-0.5 rounded-full border ${
                  comm.status === "PENDING"
                    ? "border-yellow-500/30 text-yellow-500"
                    : comm.status === "ACKNOWLEDGED"
                    ? "border-blue-500/30 text-blue-500"
                    : "border-green-500/30 text-green-500"
                }`}>
                  {comm.status}
                </span>
                {comm.repliedBy && (
                  <span className="text-slate-500">Replied by School Admin</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
