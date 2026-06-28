"use client";

import { FaFilter, FaSearch } from "react-icons/fa";

function formatOption(value) {
  return String(value || "").replaceAll("_", " ");
}

export default function EventFilterBar({
  tabs,
  activeFilter,
  onFilterChange,
  search,
  onSearchChange,
  typeFilter,
  onTypeChange,
  typeOptions = [],
  gradeFilter,
  onGradeChange,
  gradeOptions = [],
  visibilityFilter,
  onVisibilityChange,
  showFilters,
  onToggleFilters,
  onClear,
  accent = "blue",
  getNotificationCount,
  onSurfaceSeen,
}) {
  const activeText = accent === "purple" ? "text-purple-700" : "text-[#0a2f66]";
  const activeLine =
    accent === "purple" ? "after:bg-purple-700" : "after:bg-[#0a2f66]";
  const activeCount =
    accent === "purple"
      ? "bg-purple-100 text-purple-700"
      : "bg-blue-100 text-[#0a2f66]";
  const focusBorder =
    accent === "purple" ? "focus:border-purple-300" : "focus:border-[#b9c9eb]";

  return (
    <div className="border-b border-[#e1e7f2]">
      <div className="flex flex-wrap gap-0 px-4">
        {tabs.map(({ key, label, icon: Icon, count, surface }) => {
          const showDot =
            Boolean(surface) &&
            Number(getNotificationCount?.(surface) || 0) > 0 &&
            activeFilter !== key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                onFilterChange(key);
                if (surface) onSurfaceSeen?.(surface);
              }}
              className={`relative inline-flex min-h-14 items-center gap-2 px-5 text-sm font-black transition ${
                activeFilter === key
                  ? `${activeText} after:absolute after:bottom-0 after:left-0 after:h-[3px] after:w-full after:rounded-full ${activeLine}`
                  : "text-[#24314d] hover:bg-[#f8fbff]"
              }`}
            >
              <span className="relative inline-flex">
                <Icon />
                {showDot && (
                  <span className="absolute -right-1.5 -top-1.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
                )}
              </span>
              {label}
              {count > 0 && (
                <span
                  className={`ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-black ${
                    activeFilter === key
                      ? activeCount
                      : "bg-[#eef2f8] text-[#52657d]"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div
        className={`grid gap-3 border-t border-[#e1e7f2] p-4 ${
          onVisibilityChange
            ? "lg:grid-cols-[minmax(240px,1fr)_150px_150px_150px_auto_auto]"
            : "lg:grid-cols-[minmax(240px,1fr)_180px_180px_auto_auto]"
        }`}
      >
        <div className="relative">
          <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-[#75869b]" />
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search events..."
            className={`h-12 w-full rounded-xl border border-[#dbe5f4] bg-[#f8fbff] pl-11 pr-4 text-sm font-semibold outline-none transition ${focusBorder}`}
          />
        </div>
        <select
          value={typeFilter}
          onChange={(event) => onTypeChange(event.target.value)}
          className={`h-12 rounded-xl border border-[#dbe5f4] bg-white px-4 text-sm font-black text-[#24314d] outline-none ${focusBorder} ${
            showFilters ? "" : "hidden"
          }`}
        >
          <option value="">All Types</option>
          {typeOptions.map((type) => (
            <option key={type} value={type}>
              {formatOption(type)}
            </option>
          ))}
        </select>
        <select
          value={gradeFilter}
          onChange={(event) => onGradeChange(event.target.value)}
          className={`h-12 rounded-xl border border-[#dbe5f4] bg-white px-4 text-sm font-black text-[#24314d] outline-none ${focusBorder} ${
            showFilters ? "" : "hidden"
          }`}
        >
          <option value="">All Grades</option>
          {gradeOptions.map((grade) => (
            <option key={grade} value={grade}>
              {grade}
            </option>
          ))}
        </select>
        {onVisibilityChange && (
          <select
            value={visibilityFilter}
            onChange={(event) => onVisibilityChange(event.target.value)}
            className={`h-12 rounded-xl border border-[#dbe5f4] bg-white px-4 text-sm font-black text-[#24314d] outline-none ${focusBorder} ${
              showFilters ? "" : "hidden"
            }`}
          >
            <option value="">All Visibility</option>
            <option value="INVITED">School Visible</option>
            <option value="PUBLIC">Public</option>
            <option value="PRIVATE">Private</option>
          </select>
        )}
        <button
          type="button"
          onClick={onClear}
          className="inline-flex h-12 items-center justify-center rounded-xl border border-[#dbe5f4] bg-white px-4 text-sm font-black text-[#0a2f66] hover:bg-[#f8fbff]"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={onToggleFilters}
          aria-expanded={showFilters}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-[#dbe5f4] bg-[#f8fbff] px-4 text-sm font-black text-[#0a2f66] hover:bg-white"
        >
          <FaFilter />
          Filters
        </button>
      </div>
    </div>
  );
}
