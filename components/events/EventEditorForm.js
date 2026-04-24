"use client";

import { useEffect, useState } from "react";

function buildInitialFormData(initialData, ownerMode) {
  const defaultScope = ownerMode === "school" ? "SCHOOL" : "PLATFORM";
  const defaultVisibility = ownerMode === "school" ? "INVITED" : "PUBLIC";

  return {
    title: initialData?.title || "",
    description: initialData?.description || "",
    date: initialData?.date
      ? new Date(initialData.date).toISOString().split("T")[0]
      : "",
    targetGroup: initialData?.targetGroup?._id || initialData?.targetGroup || "",
    registrationDeadline: initialData?.registrationDeadline
      ? new Date(initialData.registrationDeadline).toISOString().split("T")[0]
      : "",
    maxParticipants: initialData?.maxParticipants || "",
    maxParticipantsPerSchool: initialData?.maxParticipantsPerSchool || "",
    eligibleGrades: initialData?.eligibleGrades || [],
    eventScope: initialData?.eventScope || defaultScope,
    eventType: initialData?.eventType || "COMPETITION",
    visibility: initialData?.visibility || defaultVisibility,
    registrationMode: initialData?.registrationMode || "THROUGH_SCHOOL",
    featuredOnLanding: Boolean(initialData?.featuredOnLanding),
    publicHighlightsEnabled:
      initialData?.publicHighlightsEnabled === undefined
        ? true
        : Boolean(initialData?.publicHighlightsEnabled),
    partnerBrandingEnabled: Boolean(initialData?.partnerBrandingEnabled),
    sourceProposal:
      initialData?.sourceProposal?._id || initialData?.sourceProposal || "",
    partners: (initialData?.partners || []).map((partner) => ({
      organizer: partner?.organizer?._id || partner?.organizer || "",
      role: partner?.role || "ORGANIZER_PARTNER",
      displayName:
        partner?.displayName || partner?.organizer?.organizationName || "",
      logoUrl: partner?.logoUrl || partner?.organizer?.logoUrl || "",
      website: partner?.website || partner?.organizer?.website || "",
      isPrimary: Boolean(partner?.isPrimary),
    })),
    assignedMentors: (initialData?.assignedMentors || []).map((mentor) =>
      mentor?._id || mentor
    ),
  };
}

export default function EventEditorForm({
  groups = [],
  teachers = [],
  partners = [],
  proposals = [],
  onEventCreated,
  initialData = null,
  onCancel,
  ownerMode = "platform",
  allowScopeSelection = null,
  showFeaturedOnLanding = null,
}) {
  const isEditing = Boolean(initialData);
  const resolvedOwnerMode = isEditing
    ? initialData?.eventScope === "SCHOOL"
      ? "school"
      : "platform"
    : ownerMode;
  const canChooseScope = allowScopeSelection ?? isEditing;
  const canFeatureOnLanding =
    showFeaturedOnLanding ?? resolvedOwnerMode === "platform";
  const defaultScope = resolvedOwnerMode === "school" ? "SCHOOL" : "PLATFORM";
  const targetGroupLabel =
    resolvedOwnerMode === "school" ? "Own school only" : "Global (All Schools)";

  const [formData, setFormData] = useState(() =>
    buildInitialFormData(initialData, resolvedOwnerMode)
  );
  const [status, setStatus] = useState("");

  const schoolGrades = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];
  const eventTypes = [
    "COMPETITION",
    "SHOWCASE",
    "AUDITION",
    "WORKSHOP",
    "CLUB_ACTIVITY",
    "EXHIBITION",
    "FESTIVAL",
    "OTHER",
  ];
  const partnerRoles = [
    "ORGANIZER_PARTNER",
    "CHALLENGE_PARTNER",
    "SPONSOR",
    "VENUE_PARTNER",
    "MENTOR_PARTNER",
    "MEDIA_PARTNER",
    "PRESENTED_BY",
    "OTHER",
  ];

  const [partnerDraft, setPartnerDraft] = useState({
    organizer: "",
    role: "ORGANIZER_PARTNER",
    isPrimary: false,
  });

  useEffect(() => {
    setFormData(buildInitialFormData(initialData, resolvedOwnerMode));
  }, [initialData, resolvedOwnerMode]);

  const getGradeLabel = (grade) => `Grade ${grade}`;

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

  const handleMentorToggle = (mentorId) => {
    setFormData((prev) => {
      const nextMentors = prev.assignedMentors.includes(mentorId)
        ? prev.assignedMentors.filter((id) => id !== mentorId)
        : [...prev.assignedMentors, mentorId];

      return { ...prev, assignedMentors: nextMentors };
    });
  };

  const handleAddPartner = () => {
    const selectedPartner = partners.find(
      (partner) => partner._id === partnerDraft.organizer
    );

    if (!selectedPartner) return;

    setFormData((prev) => {
      const withoutDuplicate = prev.partners.filter(
        (partner) => partner.organizer !== selectedPartner._id
      );
      const nextPartner = {
        organizer: selectedPartner._id,
        role: partnerDraft.role,
        displayName: selectedPartner.organizationName,
        logoUrl: selectedPartner.logoUrl || "",
        website: selectedPartner.website || "",
        isPrimary: partnerDraft.isPrimary || withoutDuplicate.length === 0,
      };

      const nextPartners = [...withoutDuplicate, nextPartner].map(
        (partner, index) => ({
          ...partner,
          isPrimary: nextPartner.isPrimary
            ? partner.organizer === nextPartner.organizer
            : index === 0,
        })
      );

      return {
        ...prev,
        partners: nextPartners,
        partnerBrandingEnabled: true,
      };
    });

    setPartnerDraft({
      organizer: "",
      role: "ORGANIZER_PARTNER",
      isPrimary: false,
    });
  };

  const handleRemovePartner = (organizerId) => {
    setFormData((prev) => {
      const nextPartners = prev.partners
        .filter((partner) => partner.organizer !== organizerId)
        .map((partner, index) => ({ ...partner, isPrimary: index === 0 }));

      return {
        ...prev,
        partners: nextPartners,
        partnerBrandingEnabled:
          nextPartners.length > 0 ? prev.partnerBrandingEnabled : false,
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("sending");

    try {
      const url = initialData ? `/api/events/${initialData._id}` : "/api/events";
      const method = initialData ? "PUT" : "POST";

      const payload = {
        ...formData,
        eventScope: canChooseScope ? formData.eventScope : defaultScope,
        featuredOnLanding: canFeatureOnLanding
          ? formData.featuredOnLanding
          : false,
        targetGroup: formData.targetGroup || null,
        registrationDeadline: formData.registrationDeadline || null,
        maxParticipants: formData.maxParticipants
          ? parseInt(formData.maxParticipants, 10)
          : null,
        maxParticipantsPerSchool: formData.maxParticipantsPerSchool
          ? parseInt(formData.maxParticipantsPerSchool, 10)
          : null,
        assignedMentors: formData.assignedMentors || [],
        sourceProposal: formData.sourceProposal || null,
        partnerBrandingEnabled:
          resolvedOwnerMode === "platform" &&
          formData.partnerBrandingEnabled &&
          formData.partners.length > 0,
        partners: resolvedOwnerMode === "platform" ? formData.partners : [],
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
        setStatus("error");
      }
    } catch (error) {
      console.error("Failed to save event", error);
      setStatus("error");
    }
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
                ? "Create events for your school or target a network your school belongs to."
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
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid md:grid-cols-4 gap-4">
          <div>
            <label className="block text-slate-300 mb-1 text-sm">
              Event Scope
            </label>
            <select
              value={formData.eventScope}
              onChange={(e) =>
                setFormData({ ...formData, eventScope: e.target.value })
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
          <div>
            <label className="block text-slate-300 mb-1 text-sm">
              Event Type
            </label>
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
          </div>
          <div>
            <label className="block text-slate-300 mb-1 text-sm">
              Visibility
            </label>
            <select
              value={formData.visibility}
              onChange={(e) =>
                setFormData({ ...formData, visibility: e.target.value })
              }
              className="w-full bg-slate-800 text-white rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="PUBLIC">Public</option>
              <option value="INVITED">Invited</option>
              <option value="PRIVATE">Private</option>
            </select>
          </div>
          <div>
            <label className="block text-slate-300 mb-1 text-sm">
              Registration Mode
            </label>
            <select
              value={formData.registrationMode}
              onChange={(e) =>
                setFormData({ ...formData, registrationMode: e.target.value })
              }
              className="w-full bg-slate-800 text-white rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="THROUGH_SCHOOL">Through school</option>
              <option value="DIRECT">Direct participant registration</option>
            </select>
          </div>
        </div>

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
              <option value="">{targetGroupLabel}</option>
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

        <div className={`grid gap-4 ${canFeatureOnLanding ? "md:grid-cols-2" : ""}`}>
          {canFeatureOnLanding && (
            <label className="flex items-center gap-3 p-3 rounded border border-slate-800 bg-slate-800/50">
              <input
                type="checkbox"
                checked={formData.featuredOnLanding}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    featuredOnLanding: e.target.checked,
                  })
                }
                className="rounded border-slate-600 bg-slate-700 text-blue-600"
              />
              <span className="text-sm text-slate-200">
                Feature this event on the public landing page
              </span>
            </label>
          )}
          <label className="flex items-center gap-3 p-3 rounded border border-slate-800 bg-slate-800/50">
            <input
              type="checkbox"
              checked={formData.publicHighlightsEnabled}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  publicHighlightsEnabled: e.target.checked,
                })
              }
              className="rounded border-slate-600 bg-slate-700 text-blue-600"
            />
            <span className="text-sm text-slate-200">
              Allow results and highlights to appear publicly
            </span>
          </label>
        </div>

        {resolvedOwnerMode === "platform" && (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4 space-y-4">
            <div>
              <h3 className="text-white font-semibold">Partner Branding</h3>
              <p className="text-xs text-slate-500 mt-1">
                Use this for approved company, academy, or sponsor-backed events.
              </p>
            </div>

            {proposals.length > 0 && (
              <div>
                <label className="block text-slate-300 mb-1 text-sm">
                  Source Proposal
                </label>
                <select
                  value={formData.sourceProposal}
                  onChange={(e) =>
                    setFormData({ ...formData, sourceProposal: e.target.value })
                  }
                  className="w-full bg-slate-800 text-white rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">No proposal linked</option>
                  {proposals.map((proposal) => (
                    <option key={proposal._id} value={proposal._id}>
                      {proposal.eventTitle} - {proposal.organizationName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <label className="flex items-center gap-3 p-3 rounded border border-slate-800 bg-slate-800/50">
              <input
                type="checkbox"
                checked={formData.partnerBrandingEnabled}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    partnerBrandingEnabled: e.target.checked,
                  })
                }
                disabled={formData.partners.length === 0}
                className="rounded border-slate-600 bg-slate-700 text-blue-600 disabled:opacity-50"
              />
              <span className="text-sm text-slate-200">
                Show partner branding on public event and partner portfolio pages
              </span>
            </label>

            <div className="grid md:grid-cols-[1fr_220px_auto] gap-3">
              <select
                value={partnerDraft.organizer}
                onChange={(e) =>
                  setPartnerDraft({ ...partnerDraft, organizer: e.target.value })
                }
                className="bg-slate-800 text-white rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select approved partner</option>
                {partners.map((partner) => (
                  <option key={partner._id} value={partner._id}>
                    {partner.organizationName}
                  </option>
                ))}
              </select>
              <select
                value={partnerDraft.role}
                onChange={(e) =>
                  setPartnerDraft({ ...partnerDraft, role: e.target.value })
                }
                className="bg-slate-800 text-white rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {partnerRoles.map((role) => (
                  <option key={role} value={role}>
                    {role.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAddPartner}
                disabled={!partnerDraft.organizer}
                className="bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded px-4 py-2"
              >
                Add Partner
              </button>
            </div>

            {formData.partners.length > 0 && (
              <div className="grid md:grid-cols-2 gap-2">
                {formData.partners.map((partner) => (
                  <div
                    key={partner.organizer || partner.displayName}
                    className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 flex items-start justify-between gap-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {partner.displayName || "Partner"}
                      </p>
                      <p className="text-xs text-slate-400">
                        {partner.role.replaceAll("_", " ")}
                        {partner.isPrimary ? " - Primary" : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemovePartner(partner.organizer)}
                      className="text-xs text-red-300 hover:text-red-200"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {resolvedOwnerMode === "school" && teachers.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-slate-300 text-sm">
                Assigned Mentors
              </label>
              <span className="text-xs text-slate-500">
                {formData.assignedMentors.length} selected
              </span>
            </div>
            <div className="grid md:grid-cols-2 gap-2 bg-slate-800 p-3 rounded border border-slate-700 max-h-48 overflow-y-auto">
              {teachers.map((teacher) => (
                <label
                  key={teacher._id}
                  className="flex items-start gap-2 cursor-pointer hover:bg-slate-700/50 p-2 rounded transition"
                >
                  <input
                    type="checkbox"
                    checked={formData.assignedMentors.includes(teacher._id)}
                    onChange={() => handleMentorToggle(teacher._id)}
                    className="rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500 mt-1"
                  />
                  <span className="text-sm text-slate-200">
                    <span className="block font-medium">{teacher.name}</span>
                    <span className="text-xs text-slate-400">
                      {teacher.subject || "General mentor"}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="block text-slate-300 mb-2 text-sm">
            Target Audience (Select Eligible Grades/Years)
          </label>
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
              : "Create Event"}
          </button>

          {status === "success" && (
            <span className="text-emerald-400 text-sm">
              Event {initialData ? "updated" : "created"} successfully!
            </span>
          )}
          {status === "error" && (
            <span className="text-red-400 text-sm">Failed to save event.</span>
          )}
        </div>
      </form>
    </div>
  );
}
