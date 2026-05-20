import { FaSearch } from "react-icons/fa";

export default function EmptyState({
  title = "No data found",
  description = "There are no items to display at the moment.",
  icon: Icon = FaSearch,
  action,
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-900/60 px-6 py-12 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-slate-800 text-slate-500">
        <Icon className="text-2xl" />
      </div>
      <h3 className="text-xl font-bold text-white">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">
        {description}
      </p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
