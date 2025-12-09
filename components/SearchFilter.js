import { FaSearch, FaTimes } from "react-icons/fa";

/**
 * SearchFilter Component
 * Provides search and filter functionality for lists
 *
 * Props:
 * - placeholder: Search input placeholder
 * - value: Current search value
 * - onChange: Callback when search changes
 * - onClear: Callback to clear search
 * - resultsCount: Number of results found
 */
export default function SearchFilter({
  placeholder = "Search...",
  value,
  onChange,
  onClear,
  resultsCount,
}) {
  return (
    <div className="mb-6 flex gap-3 items-center bg-slate-800/50 p-4 rounded-lg border border-slate-700">
      <FaSearch className="text-slate-500" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 bg-slate-700 text-white p-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 border border-slate-600"
      />
      {value && (
        <button
          onClick={onClear}
          className="text-slate-400 hover:text-white transition"
          title="Clear search"
        >
          <FaTimes />
        </button>
      )}
      {resultsCount !== undefined && (
        <span className="text-slate-400 text-sm whitespace-nowrap">
          {resultsCount} result{resultsCount !== 1 ? "s" : ""}
        </span>
      )}
    </div>
  );
}
