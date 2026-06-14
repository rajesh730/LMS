import { useEffect } from "react";
import { FaTimes } from "react-icons/fa";

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  panelClassName = "",
  bodyClassName = "",
  headerClassName = "",
  titleClassName = "",
}) {
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="pravyo-modal-overlay items-start overflow-y-auto sm:items-center">
      <div className={`my-8 flex w-full max-w-4xl max-h-[90vh] flex-col rounded-[var(--card-radius)] border border-[var(--brand-border)] bg-white shadow-[0_20px_48px_rgba(16,20,47,0.16)] ${panelClassName}`}>
        <div className={`sticky top-0 z-10 flex items-center justify-between rounded-t-[var(--card-radius)] border-b border-[var(--brand-border)] bg-white p-5 ${headerClassName}`}>
          <h2 className={`pravyo-heading text-lg ${titleClassName}`}>{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[var(--brand-muted)] transition hover:bg-[var(--brand-primary-soft)] hover:text-[var(--brand-ink)]"
            aria-label="Close dialog"
          >
            <FaTimes size={18} />
          </button>
        </div>

        <div className={`overflow-y-auto p-5 ${bodyClassName}`}>{children}</div>
      </div>
    </div>
  );
}
