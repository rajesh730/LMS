import LoadingSpinner from "@/components/LoadingSpinner";

export default function LoadingState({
  title = "Loading workspace",
  message = "Preparing the latest information for this screen.",
  className = "",
}) {
  return (
    <div
      className={`flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/70 px-6 py-10 text-center ${className}`}
    >
      <LoadingSpinner text="" size="md" />
      <h3 className="mt-5 text-lg font-bold text-white">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">
        {message}
      </p>
    </div>
  );
}
