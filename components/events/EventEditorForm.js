"use client";

import { useEffect, useMemo, useState } from "react";
import { buildGradeLabels, normalizeGradeValue } from "@/lib/schoolGrades";
import { validateEventCapacity } from "@/lib/eventCapacity";

function getTodayInputValue() {
  const today = new Date();
  today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
  return today.toISOString().split("T")[0];
}

function buildInitialFormData(initialData, ownerMode) {
  const defaultScope = ownerMode === "school" ? "SCHOOL" : "PLATFORM";
  const resolvedParticipationFormat =
    initialData?.participationFormat === "TEAM" ||
    initialData?.minTeamSize ||
    initialData?.maxTeamSize
      ? "TEAM"
      : "INDIVIDUAL";

  return {
    title: initialData?.title || "",
    description: initialData?.description || "",
    date: initialData?.date
      ? new Date(initialData.date).toISOString().split("T")[0]
      : "",
    registrationDeadline: initialData?.registrationDeadline
      ? new Date(initialData.registrationDeadline).toISOString().split("T")[0]
      : "",
    maxParticipants: initialData?.maxParticipants || "",
    maxParticipantsPerSchool:
      ownerMode === "school" ? "" : initialData?.maxParticipantsPerSchool || "",
    participationFormat: resolvedParticipationFormat,
    minTeamSize: initialData?.minTeamSize || "",
    maxTeamSize: initialData?.maxTeamSize || "",
    eligibleGrades: (initialData?.eligibleGrades || [])
      .map(normalizeGradeValue)
      .filter(Boolean),
    eventScope: initialData?.eventScope || defaultScope,
    eventType:
      ownerMode === "school" ? "COMPETITION" : initialData?.eventType || "COMPETITION",
    visibility: "PUBLIC",
    registrationMode:
      resolvedParticipationFormat === "TEAM"
        ? "THROUGH_SCHOOL"
        : initialData?.registrationMode || "THROUGH_SCHOOL",
    featuredOnLanding: false,
    publicHighlightsEnabled: true,
    assignedMentors:
      ownerMode === "school"
        ? []
        : (initialData?.assignedMentors || []).map((mentor) => mentor?._id || mentor),
  };
}

export default function EventEditorForm({
  onEventCreated,
  initialData = null,
  onCancel,
  ownerMode = "platform",
  allowScopeSelection = null,
}) {
  const isEditing = Boolean(initialData);
  const resolvedOwnerMode = isEditing
    ? initialData?.eventScope === "SCHOOL"
      ? "school"
      : "platform"
    : ownerMode;
  const canChooseScope = allowScopeSelection ?? isEditing;
  const defaultScope = resolvedOwnerMode === "school" ? "SCHOOL" : "PLATFORM";
  const isSchoolOwnedFlow = resolvedOwnerMode === "school";

  const [formData, setFormData] = useState(() =>
    buildInitialFormData(initialData, resolvedOwnerMode)
  );
  const [status, setStatus] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [schoolGrades, setSchoolGrades] = useState(() =>
    resolvedOwnerMode === "school" ? [] : buildGradeLabels()
  );
  const [activeStep, setActiveStep] = useState("basic");

  const eventTypes = [
    "COMPETITION",
    "SHOWCASE",
    "AUDITION",
    "WORKSHOP",
    "EXHIBITION",
    "FESTIVAL",
    "OTHER",
  ];
  useEffect(() => {
    setFormData(buildInitialFormData(initialData, resolvedOwnerMode));
  }, [initialData, resolvedOwnerMode]);

  useEffect(() => {
    let isActive = true;

    const loadGrades = async () => {
      if (resolvedOwnerMode !== "school") {
        setSchoolGrades(buildGradeLabels());
        return;
      }

      try {
        const res = await fetch("/api/school/grade-structure", {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Failed to load school grades");

        const data = await res.json();
        const grades = (data.grades || data.data?.grades || [])
          .map((grade) => normalizeGradeValue(grade.name || grade._id || grade))
          .filter(Boolean);

        if (isActive) {
          setSchoolGrades(grades.length > 0 ? grades : buildGradeLabels());
        }
      } catch (error) {
        if (isActive) {
          setSchoolGrades(buildGradeLabels());
        }
      }
    };

    loadGrades();

    return () => {
      isActive = false;
    };
  }, [resolvedOwnerMode]);

  useEffect(() => {
    if (resolvedOwnerMode !== "school" || schoolGrades.length === 0) return;

    setFormData((prev) => ({
      ...prev,
      eligibleGrades: prev.eligibleGrades.filter((grade) =>
        schoolGrades.includes(normalizeGradeValue(grade))
      ),
    }));
  }, [resolvedOwnerMode, schoolGrades]);

  const getGradeRangeLabel = () => {
    const gradeNumbers = schoolGrades
      .map((grade) => Number.parseInt(String(grade).match(/\d+/)?.[0], 10))
      .filter(Number.isFinite);

    if (gradeNumbers.length === 0) return "School Level";

    return `School Level (Grade ${Math.min(...gradeNumbers)}-${Math.max(
      ...gradeNumbers
    )})`;
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
      const nextGrades = allSelected
        ? prev.eligibleGrades.filter((g) => !groupGrades.includes(g))
        : [...new Set([...prev.eligibleGrades, ...groupGrades])];

      return { ...prev, eligibleGrades: nextGrades };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("sending");
    setErrorMessage("");

    try {
      if (
        !formData.title.trim() ||
        !formData.date ||
        !formData.description.trim()
      ) {
        setErrorMessage("Event title, event date, and description are required.");
        setStatus("error");
        setActiveStep("basic");
        return;
      }

      const capacityValidation = validateEventCapacity({
        maxParticipants: formData.maxParticipants,
        maxParticipantsPerSchool: formData.maxParticipantsPerSchool,
      });

      if (capacityValidation.message) {
        setErrorMessage(capacityValidation.message);
        setStatus("error");
        return;
      }

      const url = initialData ? `/api/events/${initialData._id}` : "/api/events";
      const method = initialData ? "PUT" : "POST";

      const resolvedPayloadScope = canChooseScope ? formData.eventScope : defaultScope;
      const resolvedRegistrationMode =
        formData.participationFormat === "TEAM"
          ? "THROUGH_SCHOOL"
          : resolvedPayloadScope !== "SCHOOL"
          ? "THROUGH_SCHOOL"
          : formData.registrationMode === "DIRECT"
          ? "DIRECT"
          : "THROUGH_SCHOOL";

      const payload = {
        ...formData,
        eventScope: resolvedPayloadScope,
        eventType: isSchoolOwnedFlow ? "COMPETITION" : formData.eventType,
        visibility: "PUBLIC",
        registrationMode: resolvedRegistrationMode,
        featuredOnLanding: false,
        publicHighlightsEnabled: true,
        registrationDeadline: formData.registrationDeadline || null,
        maxParticipants: capacityValidation.totalStudentCapacity,
        maxParticipantsPerSchool: isSchoolOwnedFlow
          ? null
          : capacityValidation.maxStudentsPerSchool,
        minTeamSize:
          formData.participationFormat === "TEAM" && formData.minTeamSize !== ""
            ? Number(formData.minTeamSize)
            : null,
        maxTeamSize:
          formData.participationFormat === "TEAM" && formData.maxTeamSize !== ""
            ? Number(formData.maxTeamSize)
            : null,
        assignedMentors: isSchoolOwnedFlow ? [] : formData.assignedMentors || [],
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setStatus("success");
        if (!initialData) {
          setFormData(buildInitialFormData(null, resolvedOwnerMode));
        }
        onEventCreated?.();
        setTimeout(() => setStatus(""), 3000);
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorMessage(data.message || "Failed to save event.");
        setStatus("error");
      }
    } catch (error) {
      console.error("Failed to save event", error);
      setErrorMessage("Failed to save event.");
      setStatus("error");
    }
  };

  const steps = useMemo(
    () => [
      { id: "basic", label: "Basic Details" },
      { id: "audience", label: "Student Audience" },
      { id: "registration", label: "Registration Setup" },
      { id: "review", label: "Review & Create" },
    ],
    []
  );
  const activeStepIndex = steps.findIndex((step) => step.id === activeStep);
  useEffect(() => {
    if (!steps.some((step) => step.id === activeStep)) {
      setActiveStep("basic");
    }
  }, [activeStep, steps]);
  const goToNextStep = () => {
    const nextStep = steps[Math.min(activeStepIndex + 1, steps.length - 1)];
    setActiveStep(nextStep.id);
  };
  const goToPreviousStep = () => {
    const previousStep = steps[Math.max(activeStepIndex - 1, 0)];
    setActiveStep(previousStep.id);
  };
  const selectedGradesLabel =
    formData.eligibleGrades.length > 0
      ? formData.eligibleGrades.join(", ")
      : "All grades can be registered";
  const stepGuidance = {
    basic: isSchoolOwnedFlow
      ? "Keep this simple: title, date, description, and whether students join individually or in groups."
      : "Set the public-facing basics for the platform event before deciding audience and limits.",
    audience: isSchoolOwnedFlow
      ? "Choose which grades can be registered. Every student in the school can still see the event."
      : "Choose which grades can be registered for this platform event. Visibility stays available after school approval.",
    registration: isSchoolOwnedFlow
      ? "Teachers register students. Set only the deadline, total capacity, and team size if needed."
      : "Schools register on behalf of students. Set total capacity and optional per-school limits.",
    review: "Confirm the summary. After creation, manage registration, notices, rounds, results, and certificates from the event page.",
  };

  return (
    <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-semibold text-white">
            {initialData
              ? "Edit Event"
              : resolvedOwnerMode === "school"
              ? "Create School Event"
              : "Create Platform Event"}
          </h2>
          {!initialData && (
            <p className="text-sm text-slate-400 mt-1">
              {resolvedOwnerMode === "school"
                ? "Create internal events for your students. All school students can see them; registration rules control who can join."
                : "Create flagship platform events for the wider network."}
            </p>
          )}
        </div>
        {initialData && onCancel && (
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-white text-sm underline"
          >
            Cancel Edit
          </button>
        )}
      </div>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-2">
          <div className="grid gap-2 md:grid-cols-5">
            {steps.map((step, index) => (
              <button
                key={step.id}
                type="button"
                onClick={() => setActiveStep(step.id)}
                className={`rounded-xl px-3 py-3 text-left text-sm transition ${
                  activeStep === step.id
                    ? "bg-blue-600 text-white"
                    : index < activeStepIndex
                    ? "bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                <span className="block text-xs opacity-75">Step {index + 1}</span>
                <span className="font-semibold">{step.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 px-4 py-3 text-sm text-blue-100">
          {stepGuidance[activeStep]}
        </div>

        {activeStep === "basic" && (
          <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
            <div>
              <h3 className="text-lg font-semibold text-white">Basic Details</h3>
              <p className="mt-1 text-sm text-slate-400">
                {isSchoolOwnedFlow
                  ? "Name the event and set the core details for your students."
                  : "Name the event, choose the type, and set the main public details."}
              </p>
            </div>

            <div className={`grid gap-4 ${isSchoolOwnedFlow ? "md:grid-cols-3" : "md:grid-cols-4"}`}>
              <div className="md:col-span-2">
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
                  min={getTodayInputValue()}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      date: e.target.value,
                      registrationDeadline:
                        prev.registrationDeadline &&
                        e.target.value &&
                        prev.registrationDeadline > e.target.value
                          ? e.target.value
                          : prev.registrationDeadline,
                    }))
                  }
                  className="w-full bg-slate-800 text-white rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              {!isSchoolOwnedFlow && (
              <div>
                <label className="block text-slate-300 mb-1 text-sm">
                  Event Type
                </label>
                {
                  <select
                    value={formData.eventType}
                    onChange={(e) =>
                      setFormData({ ...formData, eventType: e.target.value })
                    }
                    className="w-full bg-slate-800 text-white rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {eventTypes.map((type) => (
                      <option key={type} value={type}>
                        {type.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                }
              </div>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {!isSchoolOwnedFlow && (
              <div>
                <label className="block text-slate-300 mb-1 text-sm">
                  Event Scope
                </label>
                <select
                  value={formData.eventScope}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      eventScope: e.target.value,
                      registrationMode:
                        e.target.value === "SCHOOL"
                          ? prev.registrationMode
                          : "THROUGH_SCHOOL",
                    }))
                  }
                  disabled={!canChooseScope}
                  className="w-full bg-slate-800 text-white rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-70"
                >
                  <option value="PLATFORM">Platform event</option>
                  {(canChooseScope || resolvedOwnerMode === "school") && (
                    <option value="SCHOOL">School event</option>
                  )}
                </select>
                {!canChooseScope && (
                  <p className="text-xs text-slate-500 mt-1">
                    {resolvedOwnerMode === "school"
                      ? "Events from this workspace are owned by your school."
                      : "New events from this workspace are platform-owned flagship events."}
                  </p>
                )}
              </div>
              )}
              <div>
                <label className="block text-slate-300 mb-1 text-sm">
                Participant Type
                </label>
                <select
                  value={formData.participationFormat}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      participationFormat: e.target.value,
                      registrationMode:
                        e.target.value === "TEAM"
                          ? "THROUGH_SCHOOL"
                          : prev.registrationMode,
                      minTeamSize:
                        e.target.value === "TEAM" ? prev.minTeamSize : "",
                      maxTeamSize:
                        e.target.value === "TEAM" ? prev.maxTeamSize : "",
                    }))
                  }
                  className="w-full bg-slate-800 text-white rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="INDIVIDUAL">Individual students</option>
                  <option value="TEAM">Group / team</option>
                </select>
                <p className="mt-1 text-xs text-slate-500">
                  Choose group/team for football, quiz teams, group dance, debate teams, and other roster-based events.
                </p>
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
                className="w-full bg-slate-800 text-white rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 h-28"
                required
              />
            </div>
          </section>
        )}

        {activeStep === "audience" && (
          <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
            <div>
              <h3 className="text-lg font-semibold text-white">Registration Eligibility</h3>
              <p className="mt-1 text-sm text-slate-400">
                Choose who can be registered for this event. This does not limit who can see the event or receive event updates.
              </p>
            </div>

            <div>
              <label className="block text-slate-300 mb-2 text-sm">
                Registration Grades
              </label>
              <div className="mb-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">
                    {getGradeRangeLabel()}
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
                  {schoolGrades.length === 0 ? (
                    <p className="col-span-full text-sm text-slate-400">
                      Loading grades...
                    </p>
                  ) : (
                    schoolGrades.map((grade) => (
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
                        <span className="text-white text-sm">{grade}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {activeStep === "registration" && (
          <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
            <div>
              <h3 className="text-lg font-semibold text-white">
                Registration Setup
              </h3>
              <p className="mt-1 text-sm text-slate-400">
                Set the deadline, capacity, and school-managed registration rules.
              </p>
            </div>

            <div className={`grid gap-4 ${isSchoolOwnedFlow ? "md:grid-cols-3" : "md:grid-cols-4"}`}>
          <div>
            <label className="block text-slate-300 mb-1 text-sm">
              Registration Method
            </label>
            <div className="w-full rounded border border-slate-700 bg-slate-800 p-3 text-white">
              <div className="font-medium">
                {formData.registrationMode === "DIRECT"
                  ? "Students can enroll themselves"
                  : "School registers students"}
              </div>
              <label className="mt-3 flex cursor-pointer items-start gap-2 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={formData.registrationMode === "DIRECT"}
                  disabled={
                    formData.participationFormat === "TEAM" ||
                    formData.eventScope !== "SCHOOL"
                  }
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      registrationMode: e.target.checked
                        ? "DIRECT"
                        : "THROUGH_SCHOOL",
                    }))
                  }
                  className="mt-0.5 rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                />
                <span>Let eligible students register themselves</span>
              </label>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {formData.eventScope !== "SCHOOL"
                ? "Platform events stay school-managed so schools control their official participant lists."
                : formData.participationFormat === "TEAM"
                ? "Team events are school-managed so the school controls the final group list."
                : formData.registrationMode === "DIRECT"
                ? "Eligible students will see Enroll in their dashboard. The school can still edit the participant list."
                : "Teachers or school admins collect names and register students from the school dashboard."}
            </p>
          </div>
          <div>
            <label className="block text-slate-300 mb-1 text-sm">
              Registration Deadline (optional)
            </label>
            <input
              type="date"
              value={formData.registrationDeadline}
              min={getTodayInputValue()}
              max={formData.date || undefined}
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
              {formData.participationFormat === "TEAM"
                ? "Total Team Capacity"
                : "Total Student Capacity"}
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
            <p className="mt-1 text-xs text-slate-500">
              {formData.participationFormat === "TEAM"
                ? isSchoolOwnedFlow
                  ? "Maximum teams from your school that can take part in this event."
                  : "Maximum teams allowed across the full event."
                : isSchoolOwnedFlow
                ? "Maximum students from your school who can take part in this event."
                : "Maximum students allowed across all schools."}
            </p>
          </div>
          {!isSchoolOwnedFlow && (
          <div>
            <label className="block text-slate-300 mb-1 text-sm">
              {formData.participationFormat === "TEAM"
                ? "Max Teams Per School"
                : "Max Students Per School"}
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
              max={formData.maxParticipants || undefined}
            />
            <p className="mt-1 text-xs text-slate-500">
              {formData.participationFormat === "TEAM"
                ? "Maximum number of team entries a school can submit."
                : "Maximum students one school can register."}
            </p>
            {formData.maxParticipants &&
              formData.maxParticipantsPerSchool &&
                Number(formData.maxParticipantsPerSchool) >
                Number(formData.maxParticipants) && (
              <p className="mt-1 text-xs text-red-400">
                Max students per school cannot exceed total student capacity.
              </p>
            )}
          </div>
          )}
            </div>
            {formData.participationFormat === "TEAM" && (
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-slate-300 mb-1 text-sm">
                    Minimum Members Per Team
                  </label>
                  <input
                    type="number"
                    value={formData.minTeamSize}
                    onChange={(e) =>
                      setFormData({ ...formData, minTeamSize: e.target.value })
                    }
                    className="w-full bg-slate-800 text-white rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Optional"
                    min="1"
                    max={formData.maxTeamSize || undefined}
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 text-sm">
                    Maximum Members Per Team
                  </label>
                  <input
                    type="number"
                    value={formData.maxTeamSize}
                    onChange={(e) =>
                      setFormData({ ...formData, maxTeamSize: e.target.value })
                    }
                    className="w-full bg-slate-800 text-white rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Optional"
                    min={formData.minTeamSize || 1}
                    max={formData.maxParticipants || undefined}
                  />
                </div>
              </div>
            )}
          </section>
        )}

        {activeStep === "review" && (
          <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
            <div>
              <h3 className="text-lg font-semibold text-white">
                Review & Create
              </h3>
              <p className="mt-1 text-sm text-slate-400">
                Confirm the important settings before saving this event.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {[ 
                ["Title", formData.title || "Missing"],
                ["Date", formData.date || "Missing"],
                ...(!isSchoolOwnedFlow
                  ? [
                      ["Scope", formData.eventScope.replaceAll("_", " ")],
                      ["Type", formData.eventType.replaceAll("_", " ")],
                    ]
                  : []),
                [
                      "Participant Type",
                      formData.participationFormat === "TEAM"
                    ? "Group / team"
                    : "Individual students",
                ],
                ["Visibility", "Public"],
                ["Registration Method", "School registers students"],
                ["Deadline", formData.registrationDeadline || "No deadline"],
                ["Registration Grades", selectedGradesLabel],
                [
                  "Capacity",
                  formData.maxParticipants
                    ? `${
                        formData.maxParticipants
                      } total ${
                        formData.participationFormat === "TEAM" ? "teams" : "students"
                      }`
                    : "Unlimited total capacity",
                ],
                ...(!isSchoolOwnedFlow
                  ? [[
                      "Per School Limit",
                      formData.maxParticipantsPerSchool
                        ? `${
                            formData.maxParticipantsPerSchool
                          } ${formData.participationFormat === "TEAM" ? "teams" : "students"}`
                        : "Unlimited per school",
                    ]]
                  : []),
                [
                  "Team Size",
                  formData.participationFormat === "TEAM"
                    ? `${
                        formData.minTeamSize || "No minimum"
                      } to ${formData.maxTeamSize || "No maximum"} members per team`
                    : "Not applicable",
                ],
              ].map(([name, value]) => (
                <div
                  key={name}
                  className="rounded-xl border border-slate-800 bg-slate-900/70 p-3"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {name}
                  </p>
                  <p className="mt-1 text-sm text-white">{value}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="flex flex-col gap-3 border-t border-slate-800 pt-4 md:flex-row md:items-center md:justify-between">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={goToPreviousStep}
              disabled={activeStepIndex === 0}
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Back
            </button>
            {activeStep !== "review" ? (
              <button
                type="button"
                onClick={goToNextStep}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
              >
                Continue
              </button>
            ) : (
              <button
                type="submit"
                disabled={status === "sending"}
                className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-blue-500 disabled:opacity-50"
              >
                {status === "sending"
                  ? initialData
                    ? "Updating..."
                    : "Creating..."
                  : initialData
                  ? "Update Event"
                  : "Create Event"}
              </button>
            )}
          </div>

          {status === "success" && (
            <span className="text-emerald-400 text-sm">
              Event {initialData ? "updated" : "created"} successfully!
            </span>
          )}
          {status === "error" && (
            <span className="text-red-400 text-sm">
              {errorMessage || "Failed to save event."}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
