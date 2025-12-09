import { useState } from "react";
import { FaLock, FaLockOpen, FaTrash } from "react-icons/fa";
import ConfirmationModal from "@/components/ConfirmationModal";
import { useNotification } from "@/components/NotificationSystem";

/**
 * StudentStatusManager Component
 * Manage student status (ACTIVE, SUSPENDED, INACTIVE)
 *
 * Props:
 * - studentId: ID of student
 * - currentStatus: Current status
 * - onStatusChanged: Callback after status change
 */
export default function StudentStatusManager({
  studentId,
  currentStatus,
  onStatusChanged,
}) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [action, setAction] = useState(null);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const { success, error: showError } = useNotification();

  const handleStatusChange = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/students/${studentId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          reason: reason || null,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        success(`Student ${action.toLowerCase()}d successfully`);
        onStatusChanged?.();
        setShowConfirm(false);
        setAction(null);
        setReason("");
      } else {
        showError(data.message || "Failed to change status");
      }
    } catch (err) {
      console.error("Error changing student status:", err);
      showError("Failed to change student status");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      ACTIVE: "bg-emerald-500/10 text-emerald-400",
      SUSPENDED: "bg-yellow-500/10 text-yellow-400",
      INACTIVE: "bg-red-500/10 text-red-400",
    };
    return badges[status] || badges.ACTIVE;
  };

  const getActionLabel = (action) => {
    const labels = {
      SUSPEND: "Suspend Student",
      ACTIVATE: "Activate Student",
      DEACTIVATE: "Deactivate Student",
    };
    return labels[action] || action;
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Status Badge */}
        <span
          className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(
            currentStatus
          )}`}
        >
          {currentStatus}
        </span>

        {/* Action Buttons */}
        {currentStatus === "ACTIVE" && (
          <button
            onClick={() => {
              setAction("SUSPEND");
              setShowConfirm(true);
            }}
            className="p-1 text-yellow-400 hover:text-yellow-300 bg-yellow-500/10 hover:bg-yellow-500/20 rounded transition"
            title="Suspend student"
          >
            <FaLock className="text-sm" />
          </button>
        )}

        {currentStatus === "SUSPENDED" && (
          <>
            <button
              onClick={() => {
                setAction("ACTIVATE");
                setShowConfirm(true);
              }}
              className="p-1 text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 rounded transition"
              title="Activate student"
            >
              <FaLockOpen className="text-sm" />
            </button>
            <button
              onClick={() => {
                setAction("DEACTIVATE");
                setShowConfirm(true);
              }}
              className="p-1 text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded transition"
              title="Deactivate student"
            >
              <FaTrash className="text-sm" />
            </button>
          </>
        )}

        {currentStatus === "INACTIVE" && (
          <button
            onClick={() => {
              setAction("ACTIVATE");
              setShowConfirm(true);
            }}
            className="p-1 text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 rounded transition text-sm"
            title="Reactivate student"
          >
            Reactivate
          </button>
        )}
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirm}
        title={getActionLabel(action)}
        message={`Are you sure you want to ${action?.toLowerCase()} this student?`}
        confirmText={action}
        confirmVariant={
          action === "SUSPEND"
            ? "warning"
            : action === "DEACTIVATE"
            ? "danger"
            : "success"
        }
        onConfirm={handleStatusChange}
        onCancel={() => {
          setShowConfirm(false);
          setAction(null);
          setReason("");
        }}
        isLoading={loading}
      >
        {(action === "SUSPEND" || action === "DEACTIVATE") && (
          <div className="mb-4 mt-2">
            <label className="block text-slate-300 text-sm mb-2">
              Reason (optional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason for suspension/deactivation..."
              className="w-full bg-slate-700 text-white p-2 rounded text-sm resize-none"
              rows="3"
            />
          </div>
        )}
      </ConfirmationModal>
    </>
  );
}
