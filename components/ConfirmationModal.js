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
  title = "Confirm Action",
  message = "Are you sure?",
  confirmText = "Confirm",
  confirmVariant = "danger",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  isLoading = false,
}) {
  if (!isOpen) return null;

  const buttonClasses = {
    danger: "bg-red-600 hover:bg-red-500",
    warning: "bg-yellow-600 hover:bg-yellow-500",
    success: "bg-emerald-600 hover:bg-emerald-500",
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-700 w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-shrink-0">
            <FaExclamationTriangle className="text-yellow-500 text-2xl" />
          </div>
          <h3 className="text-xl font-bold text-white">{title}</h3>
        </div>

        {/* Message */}
        <p className="text-slate-300 mb-6">{message}</p>

        {/* Buttons */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`${buttonClasses[confirmVariant]} text-white px-4 py-2 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isLoading ? "..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
