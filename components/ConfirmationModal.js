import { useEffect } from "react";
import { FaExclamationTriangle, FaTimes } from "react-icons/fa";

/**
 * ConfirmationModal Component
 * Modal dialog for confirming destructive actions
 *
 * Props:
 * - isOpen: Whether modal is visible
 * - title: Modal title
 * - message: Confirmation message
 * - confirmText: Confirm button text (default: "Confirm")
 * - confirmVariant: Button color variant (danger, warning, success)
 * - cancelText: Cancel button text (default: "Cancel")
 * - onConfirm: Callback when confirmed
 * - onCancel: Callback when cancelled
 * - isLoading: Show loading state during submission
 */
export default function ConfirmationModal({
  isOpen,
  title = "Confirm this action",
  message = "Please confirm before we continue.",
  confirmText = "Confirm",
  confirmVariant = "danger",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  isLoading = false,
}) {
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape" && !isLoading) onCancel?.();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onCancel, isLoading]);

  if (!isOpen) return null;

  const buttonClasses = {
    danger: "bg-red-600 hover:bg-red-500",
    warning: "bg-[#0a2f66] hover:bg-[#123f82]",
    success: "bg-[#0a2f66] hover:bg-[#123f82]",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="pratyo-card w-full max-w-md rounded-2xl p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-shrink-0">
            <FaExclamationTriangle className="text-[#0a2f66] text-2xl" />
          </div>
          <h3 className="text-xl font-black text-[#17120a]">{title}</h3>
        </div>

        {/* Message */}
        <p className="mb-6 text-sm leading-6 text-[#52657d]">{message}</p>

        {/* Buttons */}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="min-h-11 rounded-xl border border-[#d7cdbb] bg-white/70 px-4 py-2 font-semibold text-[#27344a] transition hover:bg-[#eaf2ff] disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`${buttonClasses[confirmVariant]} min-h-11 rounded-xl px-4 py-2 font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60`}
          >
            {isLoading ? "Working..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
