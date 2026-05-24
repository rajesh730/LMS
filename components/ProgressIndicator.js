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
      <div className="w-full bg-[#eaf2ff] rounded-full h-2 mb-6">
        <div
          className="bg-[#0a2f66] h-2 rounded-full transition-all duration-500 ease-out"
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
                  ? "bg-[#0a2f66] border-[#0a2f66] text-white"
                  : index === currentStep
                  ? "bg-[#0a2f66] border-[#0a2f66] text-white"
                  : isClickable
                  ? "bg-white border-[#c7d3e4] text-[#52657d] group-hover:border-[#2f7fdb]"
                  : "bg-[#f8fbff] border-[#d7e5f7] text-[#75869b]"
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
                ${isClickable ? "text-[#0a2f66]" : "text-[#75869b]"}
              `}
                >
                  {label}
                </div>
                <div className="text-xs text-[#52657d] mt-1">
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
