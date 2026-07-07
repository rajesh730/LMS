// Reusable loading spinner. Inherits the current text color (via `border-current`
// through the .pravyo-spinner class), so it automatically matches whatever button
// or surface it sits on — white on a navy button, navy on a white one.
export default function Spinner({ className = "" }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`pravyo-spinner ${className}`}
    />
  );
}
