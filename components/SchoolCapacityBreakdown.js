"use client";

import { useState } from "react";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";
import CapacityIndicator from "./CapacityIndicator";

/**
 * Component for displaying per-school capacity breakdown in event modals/details
 */
export default function SchoolCapacityBreakdown({
  schoolCapacity = [],
  maxPerSchool,
}) {
  const [expanded, setExpanded] = useState(false);

  if (!schoolCapacity || schoolCapacity.length === 0) {
    return (
      <p className="text-gray-600 text-sm">No schools participating yet</p>
    );
  }

  // Show top 3 schools by default, show all when expanded
  const visibleSchools = expanded ? schoolCapacity : schoolCapacity.slice(0, 3);
  const hiddenCount = schoolCapacity.length - 3;

  return (
    <div className="space-y-3">
      <h4 className="font-semibold text-gray-900 text-sm">
        Per-School Breakdown:
      </h4>

      <div className="space-y-3">
        {visibleSchools.map((school, idx) => (
          <div
            key={`${school.schoolId}-${idx}`}
            className="p-3 bg-gray-50 border border-gray-200 rounded-lg"
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-medium text-gray-900 text-sm">
                  {school.schoolName}
                </p>
                <p className="text-xs text-gray-500">
                  {school.enrolled} / {maxPerSchool || "Unlimited"} students
                </p>
              </div>
              {/* Status Badge */}
              <span
                className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ml-2 ${
                  school.status === "full"
                    ? "bg-red-100 text-red-700"
                    : school.status === "near-capacity"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-green-100 text-green-700"
                }`}
              >
                {school.status === "full"
                  ? "FULL"
                  : school.status === "near-capacity"
                  ? "Filling Up"
                  : "Available"}
              </span>
            </div>

            {maxPerSchool && (
              <div className="w-full bg-gray-300 rounded-full overflow-hidden h-1.5">
                <div
                  className={`h-full transition-all duration-300 ${
                    school.status === "full"
                      ? "bg-red-500"
                      : school.status === "near-capacity"
                      ? "bg-yellow-500"
                      : "bg-green-500"
                  }`}
                  style={{
                    width: `${Math.min(
                      (school.enrolled / maxPerSchool) * 100,
                      100
                    )}%`,
                  }}
                ></div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Show More Button */}
      {schoolCapacity.length > 3 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full py-2 px-3 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {expanded ? (
            <>
              <FaChevronUp size={12} /> Show Less
            </>
          ) : (
            <>
              <FaChevronDown size={12} /> Show {hiddenCount} More School
              {hiddenCount !== 1 ? "s" : ""}
            </>
          )}
        </button>
      )}
    </div>
  );
}
