/**
 * LoadingSpinner Component
 * Displays a spinning loader with optional text
 *
 * Props:
 * - text: Optional loading text to display
 * - size: Size of spinner (sm, md, lg)
 */
export default function LoadingSpinner({ text = "Loading...", size = "md" }) {
  const sizeClasses = {
    sm: "w-6 h-6 border-2",
    md: "w-10 h-10 border-3",
    lg: "w-16 h-16 border-4",
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div
        className={`${sizeClasses[size]} border-slate-600 border-t-blue-500 rounded-full animate-spin`}
      />
      {text && <p className="text-slate-400 text-sm">{text}</p>}
    </div>
  );
}
