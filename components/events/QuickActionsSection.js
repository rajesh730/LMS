"use client";

import { FaEdit, FaTrash } from "react-icons/fa";
import { useState } from "react";

export default function QuickActionsSection({ event }) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const actions = [
    {
      icon: FaEdit,
      label: "Edit Event",
      color: "blue",
      onClick: () => {
        // Navigate to edit page
        window.location.href = `/admin/events/${event.id}/edit`;
      },
    },
    {
      icon: FaTrash,
      label: "Delete Event",
      color: "red",
      onClick: () => setShowDeleteConfirm(true),
    },
  ];

  const colorClasses = {
    blue: "bg-blue-100 text-blue-600 hover:bg-blue-200",
    yellow: "bg-yellow-100 text-yellow-600 hover:bg-yellow-200",
    purple: "bg-purple-100 text-purple-600 hover:bg-purple-200",
    green: "bg-green-100 text-green-600 hover:bg-green-200",
    red: "bg-red-100 text-red-600 hover:bg-red-200",
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900 mb-4">Quick Actions</h2>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {actions.map((action, idx) => {
          const Icon = action.icon;
          return (
            <button
              key={idx}
              onClick={action.onClick}
              className={`p-4 rounded-lg font-semibold flex flex-col items-center gap-2 transition-all ${
                colorClasses[action.color]
              }`}
            >
              <Icon size={24} />
              <span className="text-sm text-center">{action.label}</span>
            </button>
          );
        })}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full">
            <h3 className="text-xl font-bold text-red-600 mb-2">
              Delete Event?
            </h3>
            <p className="text-slate-600 mb-6">
              This action cannot be undone. All participation requests will be
              deleted.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 bg-slate-300 hover:bg-slate-400 text-slate-900 rounded-lg font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  // TODO: Implement delete event functionality
                }}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold"
              >
                Delete Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
