import { FaSearch } from "react-icons/fa";

export default function EmptyState({
    title = "No Data Found",
    description = "There are no items to display at the moment.",
    icon: Icon = FaSearch,
    action
}) {
    return (
        <div className="flex flex-col items-center justify-center py-12 text-center bg-slate-800/30 rounded-xl border border-dashed border-slate-700">
            <div className="bg-slate-800 p-4 rounded-full mb-4">
                <Icon className="text-slate-500 text-3xl" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
            <p className="text-slate-400 max-w-sm mb-6">{description}</p>
            {action}
        </div>
    );
}
