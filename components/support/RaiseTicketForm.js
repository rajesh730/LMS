"use client";

import { useState } from "react";
import {
  FaPlus,
  FaTimes,
  FaExclamationCircle,
  FaSpinner,
} from "react-icons/fa";

export default function RaiseTicketForm({ onTicketCreated }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium",
  });
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.title.trim() || !formData.description.trim()) {
      setError("Title and description are required");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/support-tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        setFormData({
          title: "",
          description: "",
          priority: "medium",
        });
        setIsOpen(false);
        onTicketCreated();
        alert("Ticket raised successfully!");
      } else {
        setError(data.message || "Failed to create ticket");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-medium transition flex items-center gap-2"
      >
        <FaPlus /> Raise New Ticket
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-700 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-white">Raise Support Ticket</h3>
          <button
            onClick={() => setIsOpen(false)}
            className="text-slate-400 hover:text-white"
          >
            <FaTimes />
          </button>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-700 text-red-100 p-3 rounded-lg text-sm mb-4 flex items-start gap-2">
            <FaExclamationCircle className="mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-slate-400 text-sm mb-1">
              Title/Subject *
            </label>
            <input
              type="text"
              placeholder="Brief title of your issue"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className="w-full bg-slate-800 text-white p-2 rounded border border-slate-700 focus:border-emerald-500 outline-none transition"
              required
            />
          </div>

          <div>
            <label className="block text-slate-400 text-sm mb-1">
              Description *
            </label>
            <textarea
              placeholder="Detailed description of your issue"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={4}
              className="w-full bg-slate-800 text-white p-2 rounded border border-slate-700 focus:border-emerald-500 outline-none transition resize-none"
              required
            />
          </div>

          <div>
            <label className="block text-slate-400 text-sm mb-1">
              Priority
            </label>
            <select
              value={formData.priority}
              onChange={(e) =>
                setFormData({ ...formData, priority: e.target.value })
              }
              className="w-full bg-slate-800 text-white p-2 rounded border border-slate-700 focus:border-emerald-500 outline-none transition"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-400 px-4 py-2 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white px-4 py-2 rounded font-medium transition flex items-center gap-2"
            >
              {loading ? (
                <>
                  <FaSpinner className="animate-spin" /> Creating...
                </>
              ) : (
                "Create Ticket"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
