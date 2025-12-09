"use client";

import { FaExclamationTriangle, FaCheckCircle, FaUsers } from "react-icons/fa";

/**
 * Reusable component for displaying enrollment capacity with visual indicators
 * Used in event cards, modals, and admin dashboards
 */
export default function CapacityIndicator({
  enrolled,
  maxCapacity,
  showPercentage = true,
  size = "md", // sm | md | lg
  status = null, // Override calculated status
}) {
  if (!maxCapacity) {
    return (
      <div
        className={`flex items-center gap-2 ${
          size === "sm" ? "text-xs" : "text-sm"
        }`}
      >
        <FaUsers className="text-gray-400" />
        <span className="text-gray-600">Unlimited</span>
      </div>
    );
  }

  const percentage = Math.round((enrolled / maxCapacity) * 100);
  const calculatedStatus =
    status ||
    (percentage >= 100
      ? "full"
      : percentage >= 80
      ? "near-capacity"
      : "available");

  const getBarColor = () => {
    if (calculatedStatus === "full") return "bg-red-500";
    if (calculatedStatus === "near-capacity") return "bg-yellow-500";
    return "bg-green-500";
  };

  const getStatusBadgeColor = () => {
    if (calculatedStatus === "full") return "bg-red-100 text-red-700";
    if (calculatedStatus === "near-capacity")
      return "bg-yellow-100 text-yellow-700";
    return "bg-green-100 text-green-700";
  };

  const getStatusLabel = () => {
    if (calculatedStatus === "full") return "FULL";
    if (calculatedStatus === "near-capacity") return "Filling Up";
    return "Available";
  };

  const sizeClasses = {
    sm: {
      container: "gap-2",
      badge: "px-2 py-1 text-xs",
      bar: "h-1.5",
      text: "text-xs",
    },
    md: {
      container: "gap-3",
      badge: "px-3 py-1.5 text-sm",
      bar: "h-2",
      text: "text-sm",
    },
    lg: {
      container: "gap-4",
      badge: "px-4 py-2 text-base",
      bar: "h-3",
      text: "text-base",
    },
  };

  const classes = sizeClasses[size];

  return (
    <div className={`flex flex-col ${classes.container}`}>
      <div className="flex items-center justify-between">
        <span className={`font-semibold text-gray-900 ${classes.text}`}>
          {enrolled} / {maxCapacity}
        </span>
        <span
          className={`font-medium rounded-full ${getStatusBadgeColor()} ${
            classes.badge
          }`}
        >
          {getStatusLabel()}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`${getBarColor()} transition-all duration-300 rounded-full`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        ></div>
      </div>

      {/* Percentage Text */}
      {showPercentage && (
        <div className={`flex items-center justify-between ${classes.text}`}>
          <span className="text-gray-600">{percentage}% Enrolled</span>
          {calculatedStatus === "full" && (
            <span className="flex items-center gap-1 text-red-600">
              <FaExclamationTriangle size={12} /> Cannot join
            </span>
          )}
          {calculatedStatus === "near-capacity" && (
            <span className="flex items-center gap-1 text-yellow-600">
              <FaExclamationTriangle size={12} /> Limited spots
            </span>
          )}
          {calculatedStatus === "available" && (
            <span className="flex items-center gap-1 text-green-600">
              <FaCheckCircle size={12} /> Available
            </span>
          )}
        </div>
      )}
    </div>
  );
}
