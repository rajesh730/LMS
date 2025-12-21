"use client";

import { useState } from "react";

export default function SendEventForm({
  groups = [],
  onEventCreated,
  initialData = null,
  onCancel,
}) {
  const [formData, setFormData] = useState({
    title: initialData?.title || "",
    description: initialData?.description || "",
    date: initialData?.date
      ? new Date(initialData.date).toISOString().split("T")[0]
      : "",
    targetGroup:
      initialData?.targetGroup?._id || initialData?.targetGroup || "",
    registrationDeadline: initialData?.registrationDeadline
      ? new Date(initialData.registrationDeadline).toISOString().split("T")[0]
      : "",
    maxParticipants: initialData?.maxParticipants || "",
    maxParticipantsPerSchool: initialData?.maxParticipantsPerSchool || "",
    eligibleGrades: initialData?.eligibleGrades || [],
  });
  const [status, setStatus] = useState("");

  const schoolGrades = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];

  // Helper function to display friendly grade labels
  const getGradeLabel = (grade) => {
    return `Grade ${grade}`;
  };

  const handleGradeChange = (grade) => {
    setFormData((prev) => {
      const grades = prev.eligibleGrades.includes(grade)
        ? prev.eligibleGrades.filter((g) => g !== grade)
        : [...prev.eligibleGrades, grade];
      return { ...prev, eligibleGrades: grades };
    });
  };

  const toggleGroup = (groupGrades) => {
    setFormData((prev) => {
      const allSelected = groupGrades.every((g) =>
        prev.eligibleGrades.includes(g)
      );
      let newGrades;
      if (allSelected) {
        // Deselect all in group
        newGrades = prev.eligibleGrades.filter((g) => !groupGrades.includes(g));
      } else {
        // Select all in group (merge unique)
        newGrades = [...new Set([...prev.eligibleGrades, ...groupGrades])];
      }
      return { ...prev, eligibleGrades: newGrades };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("sending");

    try {
      const url = initialData
        ? `/api/events/${initialData._id}`
        : "/api/events";
      const method = initialData ? "PUT" : "POST";

      const res = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          targetGroup: formData.targetGroup || null,
          registrationDeadline: formData.registrationDeadline || null,
          maxParticipants: formData.maxParticipants
            ? parseInt(formData.maxParticipants)
            : null,
          maxParticipantsPerSchool: formData.maxParticipantsPerSchool
            ? parseInt(formData.maxParticipantsPerSchool)
            : null,
        }),
      });

      if (res.ok) {
        setStatus("success");
        if (!initialData) {
          setFormData({
            title: "",
            description: "",
            date: "",
            targetGroup: "",
            registrationDeadline: "",
            maxParticipants: "",
            maxParticipantsPerSchool: "",
            eligibleGrades: [],
          });
        }
        if (onEventCreated) onEventCreated();
        setTimeout(() => setStatus(""), 3000);
      } else {
        setStatus("error");
      }
    } catch (error) {
      setStatus("error");
    }
  };

  return (
    <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-white">
          {initialData ? "Edit Event" : "Send New Event"}
        </h2>
        {initialData && onCancel && (
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-white text-sm underline"
          >
            Cancel Edit
          </button>
        )}
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-slate-300 mb-1 text-sm">
              Event Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className="w-full bg-slate-800 text-white rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-slate-300 mb-1 text-sm">
              Event Date *
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) =>
                setFormData({ ...formData, date: e.target.value })
              }
              className="w-full bg-slate-800 text-white rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-slate-300 mb-1 text-sm">
              Target Group
            </label>
            <select
              value={formData.targetGroup}
              onChange={(e) =>
                setFormData({ ...formData, targetGroup: e.target.value })
              }
              className="w-full bg-slate-800 text-white rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Global (All Schools)</option>
              {groups.map((group) => (
                <option key={group._id} value={group._id}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-slate-300 mb-1 text-sm">
              Reg. Deadline (optional)
            </label>
            <input
              type="date"
              value={formData.registrationDeadline}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  registrationDeadline: e.target.value,
                })
              }
              className="w-full bg-slate-800 text-white rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-slate-300 mb-1 text-sm">
              Total Max Participants
            </label>
            <input
              type="number"
              value={formData.maxParticipants}
              onChange={(e) =>
                setFormData({ ...formData, maxParticipants: e.target.value })
              }
              className="w-full bg-slate-800 text-white rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Unlimited"
              min="1"
            />
          </div>
          <div>
            <label className="block text-slate-300 mb-1 text-sm">
              Max Per School
            </label>
            <input
              type="number"
              value={formData.maxParticipantsPerSchool}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  maxParticipantsPerSchool: e.target.value,
                })
              }
              className="w-full bg-slate-800 text-white rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Unlimited"
              min="1"
            />
          </div>
        </div>

        <div>
          <label className="block text-slate-300 mb-2 text-sm">
            Target Audience (Select Eligible Grades/Years)
          </label>

          {/* School Level (1-10) */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">
                School Level (Grade 1-10)
              </span>
              <button
                type="button"
                onClick={() => toggleGroup(schoolGrades)}
                className="text-xs text-blue-400 hover:text-blue-300 transition"
              >
                {schoolGrades.every((g) => formData.eligibleGrades.includes(g))
                  ? "Deselect All"
                  : "Select All"}
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 bg-slate-800 p-3 rounded border border-slate-700">
              {schoolGrades.map((grade) => (
                <label
                  key={grade}
                  className="flex items-center gap-2 cursor-pointer hover:bg-slate-700/50 p-1 rounded transition select-none"
                >
                  <input
                    type="checkbox"
                    checked={formData.eligibleGrades.includes(grade)}
                    onChange={() => handleGradeChange(grade)}
                    className="rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-white text-sm">
                    {getGradeLabel(grade)}
                  </span>
                </label>
              ))}
            </div>
          </div>




        </div>

        <div>
          <label className="block text-slate-300 mb-1 text-sm">
            Description *
          </label>
          <textarea
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            className="w-full bg-slate-800 text-white rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 h-24"
            required
          />
        </div>

        <div className="flex items-center justify-between">
          <button
            type="submit"
            disabled={status === "sending"}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded transition disabled:opacity-50"
          >
            {status === "sending"
              ? initialData
                ? "Updating..."
                : "Sending..."
              : initialData
              ? "Update Event"
              : "Send Event"}
          </button>

          {status === "success" && (
            <span className="text-emerald-400 text-sm">
              Event {initialData ? "updated" : "sent"} successfully!
            </span>
          )}
          {status === "error" && (
            <span className="text-red-400 text-sm">Failed to send event.</span>
          )}
        </div>
      </form>
    </div>
  );
}
