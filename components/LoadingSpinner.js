/**
 * LoadingSpinner Component
 * Modern conic "comet" ring spinner that uses the Pravyo brand palette.
 *
 * Props:
 * - text: Optional loading text shown beneath the spinner
 * - size: Size of spinner (sm, md, lg)
 * - className: Extra classes for the wrapper
 */
export default function LoadingSpinner({
  text = "Loading...",
  size = "md",
  className = "",
}) {
  const dims = {
    sm: { box: 22, ring: 2.5 },
    md: { box: 40, ring: 3.5 },
    lg: { box: 60, ring: 5 },
  };
  const { box, ring } = dims[size] || dims.md;

  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 ${className}`}
      role="status"
      aria-live="polite"
    >
      <span
        className="pravyo-spinner"
        style={{ width: box, height: box, "--pravyo-ring": `${ring}px` }}
        aria-hidden="true"
      />
      {text ? (
        <p className="text-sm font-medium text-[var(--brand-muted)]">{text}</p>
      ) : (
        <span className="sr-only">Loading</span>
      )}
    </div>
  );
}
