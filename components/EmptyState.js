import { FaSearch } from "react-icons/fa";

export default function EmptyState({
  title = "No data found",
  description = "There are no items to display at the moment.",
  icon: Icon = FaSearch,
  action,
}) {
  return (
    <div className="pratyo-card flex flex-col items-center justify-center rounded-2xl border-dashed px-6 py-12 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-[#eaf2ff] text-[#0a2f66]">
        <Icon className="text-2xl" />
      </div>
      <h3 className="text-xl font-black text-[#17120a]">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-[#52657d]">
        {description}
      </p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
