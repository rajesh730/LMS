"use client";

import { FaCheck } from "react-icons/fa";

export default function ProgressIndicator({
  currentStep,
  totalSteps,
  stepLabels,
  onStepClick,
  completedSteps = [],
}) {
  return (
    <div className="mb-8">
      {/* Progress bar */}
      <div className="w-full bg-slate-700 rounded-full h-2 mb-6">
        <div
          className="bg-emerald-500 h-2 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
        />
      </div>

      {/* Step indicators */}
      <div className="flex justify-between items-center">
        {stepLabels.map((label, index) => {
          const isClickable =
            index <= currentStep || completedSteps.includes(index - 1);
          return (
            <div
              key={index}
              className={`flex flex-col items-center group ${
                isClickable ? "cursor-pointer" : "cursor-not-allowed opacity-60"
              }`}
              onClick={() => onStepClick && isClickable && onStepClick(index)}
            >
              <div
                className={`
              flex items-center justify-center w-10 h-10 rounded-full border-2 mb-2 transition-all duration-300
              ${
                completedSteps.includes(index)
                  ? "bg-emerald-500 border-emerald-500 text-white"
                  : index === currentStep
                  ? "bg-emerald-600 border-emerald-600 text-white"
                  : isClickable
                  ? "bg-slate-700 border-slate-600 text-slate-400 group-hover:border-emerald-500"
                  : "bg-slate-800 border-slate-700 text-slate-500"
              }
            `}
              >
                {completedSteps.includes(index) ? (
                  <FaCheck className="h-4 w-4" />
                ) : (
                  <span className="text-sm font-semibold">{index + 1}</span>
                )}
              </div>

              <div className="text-center max-w-24">
                <div
                  className={`
                text-xs font-medium leading-tight
                ${isClickable ? "text-white" : "text-slate-500"}
              `}
                >
                  {label}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {completedSteps.includes(index)
                    ? "Completed"
                    : index === currentStep
                    ? "Current"
                    : "Pending"}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
