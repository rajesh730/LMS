"use client";

import { useState, useEffect, memo, useCallback } from "react";
import {
  FaPhone,
  FaUser,
  FaSchool,
  FaSearch,
  FaTimes,
  FaCheck,
  FaUsers,
} from "react-icons/fa";
import { useSession } from "next-auth/react";
import { gradeListContains, normalizeGradeValue } from "@/lib/schoolGrades";
import { isDatePast } from "@/lib/eventUiStatus";
import { isTeamEventLike } from "@/lib/eventParticipationFormat";

function normalizeSchoolTeamBaseName(schoolName = "") {
  const cleaned = String(schoolName || "")
    .replace(/\bschool\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || "School";
}

function buildDefaultTeamName(schoolName = "", index = 0) {
  const base = `Team ${normalizeSchoolTeamBaseName(schoolName)}`.trim();
  return index > 0 ? `${base} ${index + 1}` : base;
}

function validateTeamDraft(team, { minTeamSize = 0, maxTeamSize = 0 } = {}) {
  const issues = [];
  const memberCount = Array.isArray(team?.studentIds) ? team.studentIds.length : 0;
  const teamName = String(team?.teamName || "").trim();
  const captainStudentId = String(team?.captainStudentId || "").trim();

  if (!teamName) issues.push("Missing team name");
  if (memberCount === 0) issues.push("No members selected");
  if (minTeamSize && memberCount < minTeamSize) {
    issues.push(`Needs at least ${minTeamSize} members`);
  }
  if (maxTeamSize && memberCount > maxTeamSize) {
    issues.push(`Allows at most ${maxTeamSize} members`);
  }
  if (!captainStudentId) {
    issues.push("Captain not selected");
  } else if (!team?.studentIds?.includes(captainStudentId)) {
    issues.push("Captain must be a selected member");
  }

  return {
    isValid: issues.length === 0,
    issues,
    memberCount,
  };
}

const EventParticipationForm = memo(function EventParticipationForm({
  event,
  onSuccess,
  isEditing = false,
}) {
  const { data: session } = useSession();
  const [formData, setFormData] = useState({
    contactPerson: "",
    phone: "",
    notes: "",
    teamName: "",
    captainStudentId: "",
    selectedStudents: [],
    teams: [
      {
        teamName: "",
        captainStudentId: "",
        studentIds: [],
      },
    ],
  });

  const [students, setStudents] = useState([]);
  const [gradeFilter, setGradeFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [grades, setGrades] = useState([]);
  const [activeTeamIndex, setActiveTeamIndex] = useState(0);
  const [savedParticipation, setSavedParticipation] = useState(null);

  const [interestedStudents, setInterestedStudents] = useState([]);
  const [interestedFilter, setInterestedFilter] = useState("all"); // all, pending, approved, rejected
  const registrationDeadline = event.registrationDeadline || event.deadline;
  const isTeamEvent = isTeamEventLike(event);
  const minTeamSize = Number(event.minTeamSize || 0) || 0;
  const maxTeamSize = Number(event.maxTeamSize || 0) || 0;
  const schoolDisplayName =
    session?.user?.schoolName || session?.user?.name || "";
  const lifecycleStatus = String(event.lifecycleStatus || "ACTIVE").toUpperCase();
  const isRegistrationClosed = Boolean(
    registrationDeadline && isDatePast(registrationDeadline, { endOfDay: true })
  );
  const isEventLocked =
    lifecycleStatus === "COMPLETED" ||
    lifecycleStatus === "ARCHIVED" ||
    isRegistrationClosed;
  const lockReason =
    lifecycleStatus === "ARCHIVED"
      ? "This event is archived. Registration changes are locked."
      : lifecycleStatus === "COMPLETED"
      ? "This event is completed. Teams are locked; use rounds/results for final work."
      : isRegistrationClosed
      ? "Registration deadline has passed. Team changes are locked."
      : "";

  const loadSchoolParticipationDetails = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${event._id}/participate`);
      if (res.ok) {
        const json = await res.json();
        const data = json.data || json;
        const requests = Array.isArray(data.requests) ? data.requests : [];
        const participation = data.participation || null;

        setInterestedStudents(requests);
        setSavedParticipation(participation?.myParticipation || null);

        setFormData((prev) => ({
          ...prev,
          selectedStudents: Array.isArray(participation?.myParticipation?.studentIds)
            ? participation.myParticipation.studentIds
            : prev.selectedStudents,
          teamName: participation?.myParticipation?.teamName || prev.teamName,
          captainStudentId:
            String(participation?.myParticipation?.captainStudent || "") ||
            prev.captainStudentId,
          contactPerson:
            participation?.myParticipation?.contactPerson ||
            data.contactInfo?.contactPerson ||
            prev.contactPerson,
          phone:
            participation?.myParticipation?.contactPhone ||
            data.contactInfo?.contactPhone ||
            prev.phone,
          notes:
            participation?.myParticipation?.notes ||
            data.contactInfo?.notes ||
            prev.notes,
          teams:
            Array.isArray(participation?.myParticipation?.teams) &&
            participation.myParticipation.teams.length > 0
              ? participation.myParticipation.teams.map((team) => ({
                  teamName: team.teamName || "",
                  captainStudentId: String(team.captainStudent || ""),
                  studentIds: Array.isArray(team.memberIds) ? team.memberIds : [],
                }))
              : isTeamEvent
              ? [
                  {
                    teamName: buildDefaultTeamName(schoolDisplayName, 0),
                    captainStudentId: "",
                    studentIds: [],
                  },
                ]
              : prev.teams,
        }));
      } else {
        setInterestedStudents([]);
        setSavedParticipation(null);
      }
    } catch (error) {
      console.error("Error loading school participation details:", error);
      setInterestedStudents([]);
      setSavedParticipation(null);
    }
  }, [event._id, isTeamEvent, schoolDisplayName]);

  const loadGrades = useCallback(async () => {
    try {
      const res = await fetch("/api/school/grade-structure", {
        cache: "no-store",
      });
      if (res.ok) {
        const json = await res.json();
        let fetchedGrades = json.grades || json.data?.grades || [];

        // Filter grades if event has restrictions
        if (event.eligibleGrades && event.eligibleGrades.length > 0) {
          fetchedGrades = fetchedGrades.filter((g) => {
            const gradeVal = g._id || g;
            return gradeListContains(event.eligibleGrades, gradeVal);
          });
        }

        setGrades(fetchedGrades);
      } else {
        setGrades([]);
      }
    } catch (error) {
      console.error("Error loading grades:", error);
      setGrades([]);
    }
  }, [event.eligibleGrades]);

  const loadStudents = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/students?page=1&limit=500");
      if (res.ok) {
        const data = await res.json();
        setStudents(Array.isArray(data.students) ? data.students : []);
      } else {
        setStudents([]);
      }
    } catch (error) {
      console.error("Error loading students:", error);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStudents();
    loadGrades();
  }, [loadGrades, loadStudents]);

  useEffect(() => {
    if (session?.user?.role === "SCHOOL_ADMIN") {
      loadSchoolParticipationDetails();
    }
  }, [loadSchoolParticipationDetails, session?.user?.role]);

  useEffect(() => {
    if (!isTeamEvent || !schoolDisplayName) return;
    setFormData((prev) => {
      if (!Array.isArray(prev.teams) || prev.teams.length === 0) {
        return {
          ...prev,
          teams: [
            {
              teamName: buildDefaultTeamName(schoolDisplayName, 0),
              captainStudentId: "",
              studentIds: [],
            },
          ],
        };
      }

      const nextTeams = prev.teams.map((team, index) => {
        if (String(team.teamName || "").trim()) return team;
        return {
          ...team,
          teamName: buildDefaultTeamName(schoolDisplayName, index),
        };
      });

      return { ...prev, teams: nextTeams };
    });
  }, [isTeamEvent, schoolDisplayName]);

  const participationMap = new Map(
    interestedStudents
      .filter((r) => r.student?._id)
      .map((r) => [r.student._id, r])
  );

  const hasExistingParticipation = interestedStudents.some((request) =>
    ["PENDING", "APPROVED", "ENROLLED", "REJECTED"].includes(request.status)
  );

  const filteredStudents = students
    .filter((student) => {
      const request = participationMap.get(student._id);

      const matchesSearch = student.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

      const sGrade =
        student.grade &&
        (student.grade.name || student.grade._id || student.grade);

      // Check eligibility
      const isEligible =
        !event.eligibleGrades ||
        event.eligibleGrades.length === 0 ||
        gradeListContains(event.eligibleGrades, sGrade);

      if (!isEligible) return false;

      const matchesGrade =
        gradeFilter === "all" ||
        normalizeGradeValue(sGrade) === normalizeGradeValue(gradeFilter);

      const matchesStatus =
        interestedFilter === "all" ||
        (interestedFilter === "UNREGISTERED" && !request) ||
        (interestedFilter === "REGISTERED" &&
          request &&
          ["PENDING", "APPROVED"].includes(request.status)) ||
        (request && request.status === interestedFilter);

      return matchesSearch && matchesGrade && matchesStatus;
    })
    .sort((a, b) => {
      // Sort selected students to the top
      const aSelected = formData.selectedStudents.includes(String(a._id));
      const bSelected = formData.selectedStudents.includes(String(b._id));
      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;
      return 0;
    });

  const visibleSelectedCount = filteredStudents.filter((student) =>
    formData.selectedStudents.includes(String(student._id))
  ).length;

  const activeTeam = formData.teams[activeTeamIndex] || {
    teamName: "",
    captainStudentId: "",
    studentIds: [],
  };
  const otherTeamStudentIds = new Set(
    (formData.teams || [])
      .filter((_, index) => index !== activeTeamIndex)
      .flatMap((team) => team.studentIds || [])
      .map((id) => String(id))
  );
  const totalSelectedTeamMembers = (formData.teams || []).reduce(
    (total, team) => total + (team.studentIds?.length || 0),
    0
  );
  const draftedTeams = isTeamEvent
    ? (formData.teams || []).filter(
        (team) =>
          String(team.teamName || "").trim() ||
          String(team.captainStudentId || "").trim() ||
          (team.studentIds || []).length > 0
      )
    : [];
  const teamValidationSummaries = draftedTeams.map((team) =>
    validateTeamDraft(team, { minTeamSize, maxTeamSize })
  );
  const validTeamCount = teamValidationSummaries.filter(
    (summary) => summary.isValid
  ).length;
  const invalidTeamCount = teamValidationSummaries.length - validTeamCount;
  const teamLimit = Number(event.maxParticipantsPerSchool || 0) || 0;
  const totalTeamCapacity = Number(event.maxParticipants || 0) || 0;
  const savedTeamCount = Number(savedParticipation?.teamCount || 0) || 0;
  const savedMemberCount = Number(savedParticipation?.studentCount || 0) || 0;
  const registeredAt = savedParticipation?.registeredAt
    ? new Date(savedParticipation.registeredAt)
    : null;
  const registrationStateLabel = isEventLocked
    ? "Locked"
    : hasExistingParticipation
    ? "Submitted"
    : draftedTeams.length > 0 || formData.selectedStudents.length > 0
    ? "Draft"
    : "Not started";
  const registrationStateTone = isEventLocked
    ? "border-amber-500/30 bg-amber-500/10 text-amber-100"
    : hasExistingParticipation
    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
    : draftedTeams.length > 0 || formData.selectedStudents.length > 0
    ? "border-blue-500/30 bg-blue-500/10 text-blue-100"
    : "border-slate-700 bg-slate-900/70 text-slate-200";
  const canSubmitTeamRegistration =
    !isEventLocked &&
    isTeamEvent &&
    draftedTeams.length > 0 &&
    invalidTeamCount === 0 &&
    draftedTeams.length === validTeamCount;

  const handleStudentToggle = (studentId) => {
    if (isEventLocked) return;
    if (isTeamEvent) {
      if (otherTeamStudentIds.has(String(studentId))) return;
      setFormData((prev) => ({
        ...prev,
        teams: prev.teams.map((team, index) => {
          if (index !== activeTeamIndex) return team;
          const isRemoving = team.studentIds.includes(studentId);
          const nextStudentIds = isRemoving
            ? team.studentIds.filter((id) => id !== studentId)
            : [...team.studentIds, studentId];
          return {
            ...team,
            studentIds: nextStudentIds,
            captainStudentId:
              isRemoving && team.captainStudentId === studentId
                ? ""
                : team.captainStudentId,
          };
        }),
      }));
      return;
    }
    setFormData((prev) => {
      const isRemoving = prev.selectedStudents.includes(studentId);
      const nextSelectedStudents = isRemoving
        ? prev.selectedStudents.filter((id) => id !== studentId)
        : [...prev.selectedStudents, studentId];

      return {
        ...prev,
        selectedStudents: nextSelectedStudents,
        captainStudentId:
          isRemoving && prev.captainStudentId === studentId
            ? ""
            : prev.captainStudentId,
      };
    });
  };

  const handleSelectAll = (checked) => {
    if (isEventLocked) return;
    if (isTeamEvent) {
      const allowedVisibleStudents = filteredStudents
        .map((student) => String(student._id))
        .filter((id) => !otherTeamStudentIds.has(id));
      setFormData((prev) => ({
        ...prev,
        teams: prev.teams.map((team, index) => {
          if (index !== activeTeamIndex) return team;
          return {
            ...team,
            studentIds: checked
              ? [...new Set([...(team.studentIds || []), ...allowedVisibleStudents])]
              : (team.studentIds || []).filter(
                  (id) => !allowedVisibleStudents.includes(String(id))
                ),
          };
        }),
      }));
      return;
    }
    if (checked) {
      setFormData((prev) => ({
        ...prev,
        selectedStudents: [
          ...new Set([
            ...prev.selectedStudents,
            ...filteredStudents.map((s) => String(s._id)),
          ]),
        ],
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        selectedStudents: prev.selectedStudents.filter(
          (id) => !filteredStudents.some((student) => String(student._id) === id)
        ),
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isEventLocked) {
      alert(lockReason || "Registration changes are locked for this event.");
      return;
    }
    if (!formData.contactPerson.trim()) {
      alert("Please enter contact person name");
      return;
    }
    if (!formData.phone.trim()) {
      alert("Please enter phone number");
      return;
    }
    if (!isTeamEvent && formData.selectedStudents.length === 0) {
      alert("Please select at least one student");
      return;
    }
    if (isTeamEvent) {
      const teams = (formData.teams || []).filter(
        (team) => team.teamName.trim() || team.studentIds.length > 0
      );
      if (teams.length === 0) {
        alert("Please create at least one team");
        return;
      }

      const seenStudents = new Set();
      for (const team of teams) {
        if (!team.teamName.trim()) {
          alert("Each team must have a team name");
          return;
        }
        if (!team.captainStudentId) {
          alert(`Please select a captain for ${team.teamName}`);
          return;
        }
        if (!team.studentIds.includes(team.captainStudentId)) {
          alert(`Captain for ${team.teamName} must be one of its selected members`);
          return;
        }
        if (team.studentIds.length === 0) {
          alert(`Please select at least one member for ${team.teamName}`);
          return;
        }
        if (minTeamSize && team.studentIds.length < minTeamSize) {
          alert(`${team.teamName} requires at least ${minTeamSize} members.`);
          return;
        }
        if (maxTeamSize && team.studentIds.length > maxTeamSize) {
          alert(`${team.teamName} allows at most ${maxTeamSize} members.`);
          return;
        }
        for (const studentId of team.studentIds) {
          if (seenStudents.has(studentId)) {
            alert("A student cannot be added to more than one team.");
            return;
          }
          seenStudents.add(studentId);
        }
      }
    }

    try {
      setSubmitting(true);
      const method =
        session?.user?.role === "SCHOOL_ADMIN" && hasExistingParticipation
          ? "PUT"
          : "POST";
      const res = await fetch(`/api/events/${event._id}/participate`, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactPerson: formData.contactPerson,
          phone: formData.phone,
          notes: formData.notes,
          teamName: formData.teamName,
          captainStudentId: formData.captainStudentId,
          studentIds: formData.selectedStudents,
          teams: isTeamEvent
            ? formData.teams.map((team) => ({
                teamName: team.teamName,
                captainStudentId: team.captainStudentId,
                studentIds: team.studentIds,
                contactPerson: formData.contactPerson,
                phone: formData.phone,
                notes: formData.notes,
              }))
            : undefined,
        }),
      });

      if (res.ok) {
        alert(
          isEditing
            ? "Participation updated successfully!"
            : isTeamEvent
            ? "Team registered successfully!"
            : "Participation request submitted successfully!"
        );
        onSuccess?.();
      } else {
        const data = await res.json();
        alert(data.message || "Error submitting participation request");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error submitting request");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="text-3xl font-bold text-white mb-8">
        {session?.user?.role === "STUDENT"
          ? "Join Event:"
          : isEditing
          ? "Update Participation:"
          : "Register Students:"}{" "}
        <span className="text-emerald-400">{event.title}</span>
      </h2>

      {session?.user?.role === "SCHOOL_ADMIN" && isTeamEvent && (
        <div className="mb-6 rounded-2xl border border-slate-700 bg-slate-900/70 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">
                Team Registration Summary
              </h3>
              <p className="mt-1 text-sm text-slate-400">
                Check team validity before submission and track what is already saved for this event.
              </p>
            </div>
            <div className={`rounded-full border px-4 py-2 text-sm font-semibold ${registrationStateTone}`}>
              {registrationStateLabel}
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3">
              <div className="text-xs uppercase tracking-wide text-slate-500">
                Allowed Teams
              </div>
              <div className="mt-1 text-2xl font-bold text-white">
                {teamLimit || "Unlimited"}
              </div>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3">
              <div className="text-xs uppercase tracking-wide text-slate-500">
                Drafted Teams
              </div>
              <div className="mt-1 text-2xl font-bold text-white">
                {draftedTeams.length}
              </div>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3">
              <div className="text-xs uppercase tracking-wide text-slate-500">
                Valid Teams
              </div>
              <div className="mt-1 text-2xl font-bold text-emerald-300">
                {validTeamCount}
              </div>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3">
              <div className="text-xs uppercase tracking-wide text-slate-500">
                Saved Registration
              </div>
              <div className="mt-1 text-lg font-bold text-white">
                {savedTeamCount > 0 ? `${savedTeamCount} teams` : "None yet"}
              </div>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3">
              <div className="text-xs uppercase tracking-wide text-slate-500">
                Team Size Rule
              </div>
              <div className="mt-1 text-sm font-semibold text-white">
                {minTeamSize || "No minimum"} to {maxTeamSize || "No maximum"}
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-3 xl:grid-cols-[1.2fr_1fr]">
            <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-white">
                  Submission readiness
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    canSubmitTeamRegistration
                      ? "bg-emerald-500/15 text-emerald-200 border border-emerald-500/30"
                      : "bg-amber-500/15 text-amber-200 border border-amber-500/30"
                  }`}
                >
                  {canSubmitTeamRegistration
                    ? "Ready to submit"
                    : isEventLocked
                    ? "Registration locked"
                    : invalidTeamCount > 0
                    ? `${invalidTeamCount} team${invalidTeamCount === 1 ? "" : "s"} need fixes`
                    : "Build at least one valid team"}
                </span>
              </div>
              <div className="mt-2 text-sm text-slate-400">
                {teamLimit
                  ? `This school can submit up to ${teamLimit} team${teamLimit === 1 ? "" : "s"} for this event.`
                  : "This event does not set a school team limit."}
                {totalTeamCapacity
                  ? ` Event capacity is ${totalTeamCapacity} total team entries.`
                  : " Event capacity is open unless the organizer closes registration."}
              </div>
              {registeredAt && (
                <div className="mt-2 text-xs text-slate-500">
                  Last saved registration: {registeredAt.toLocaleDateString()}{" "}
                  {registeredAt.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              )}
              {savedTeamCount > 0 && (
                <div className="mt-2 text-xs text-slate-500">
                  Saved roster: {savedTeamCount} team{savedTeamCount === 1 ? "" : "s"} / {savedMemberCount} members
                </div>
              )}
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4">
              <div className="text-sm font-semibold text-white">Active team checks</div>
              <div className="mt-3 space-y-2">
                {draftedTeams.length === 0 ? (
                  <div className="text-sm text-slate-500">
                    No teams drafted yet. Add a team and select members to begin.
                  </div>
                ) : (
                  draftedTeams.map((team, index) => {
                    const summary = teamValidationSummaries[index];
                    return (
                      <div
                        key={`${team.teamName || "team"}-summary-${index}`}
                        className="rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-semibold text-white">
                            {team.teamName || `Team ${index + 1}`}
                          </div>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                              summary.isValid
                                ? "bg-emerald-500/15 text-emerald-200 border border-emerald-500/30"
                                : "bg-red-500/15 text-red-200 border border-red-500/30"
                            }`}
                          >
                            {summary.isValid ? "Valid" : "Needs fixes"}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-slate-400">
                          {summary.memberCount} members
                          {team.captainStudentId ? " • Captain selected" : " • Captain missing"}
                        </div>
                        {!summary.isValid && (
                          <div className="mt-2 text-xs text-red-200">
                            {summary.issues.join(" • ")}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {isEventLocked && (
        <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          {lockReason}
        </div>
      )}

      {/* 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* LEFT COLUMN: Contact Details */}
        <div>
          <div className="mb-8">
            <h3 className="text-lg font-bold text-emerald-400 mb-6 flex items-center gap-2">
              <FaUser className="text-xl" /> Contact Details
            </h3>

            {isTeamEvent && (
              <div className="mb-6 rounded-xl border border-blue-500/20 bg-blue-500/10 p-4">
                <h4 className="text-sm font-semibold uppercase tracking-wide text-blue-200">
                  Team Setup
                </h4>
              <div className="mt-4 grid gap-4">
                  <div>
                    <label className="block text-slate-300 font-medium mb-2">
                      Team Name *
                    </label>
                    <input
                      type="text"
                      placeholder="Enter team name"
                      value={activeTeam.teamName}
                      disabled={isEventLocked}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          teams: prev.teams.map((team, index) =>
                            index === activeTeamIndex
                              ? { ...team, teamName: e.target.value }
                              : team
                          ),
                        }))
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-3">
                      <div className="text-xs uppercase tracking-wide text-slate-500">
                        Team Size Rule
                      </div>
                        <div className="mt-1 text-sm text-white">
                        {minTeamSize || "No minimum"} to {maxTeamSize || "No maximum"} members
                      </div>
                    </div>
                    <div className="rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-3">
                      <div className="text-xs uppercase tracking-wide text-slate-500">
                        Captain
                      </div>
                      <select
                        value={activeTeam.captainStudentId}
                        disabled={isEventLocked || activeTeam.studentIds.length === 0}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            teams: prev.teams.map((team, index) =>
                              index === activeTeamIndex
                                ? { ...team, captainStudentId: e.target.value }
                                : team
                            ),
                          }))
                        }
                        className="mt-2 w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <option value="">Select captain</option>
                        {activeTeam.studentIds.map((studentId) => {
                          const student = students.find(
                            (candidate) => String(candidate._id) === String(studentId)
                          );
                          return (
                            <option key={studentId} value={studentId}>
                              {student?.name || "Selected student"}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
                      Teams
                    </h4>
                    <button
                      type="button"
                      disabled={isEventLocked}
                      onClick={() => {
                        setFormData((prev) => ({
                          ...prev,
                          teams: [
                            ...prev.teams,
                            {
                              teamName: buildDefaultTeamName(
                                schoolDisplayName,
                                prev.teams.length
                              ),
                              captainStudentId: "",
                              studentIds: [],
                            },
                          ],
                        }));
                        setActiveTeamIndex((formData.teams || []).length);
                      }}
                      className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Add Team
                    </button>
                  </div>
                  <div className="space-y-2">
                    {(formData.teams || []).map((team, index) => (
                      <div
                        key={`${team.teamName || "team"}-${index}`}
                        className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
                          index === activeTeamIndex
                            ? "border-emerald-500/40 bg-emerald-500/10"
                            : "border-slate-700 bg-slate-950/60"
                        }`}
                    >
                        <button
                          type="button"
                          onClick={() => setActiveTeamIndex(index)}
                          className="flex-1 text-left"
                        >
                          <div className="text-sm font-semibold text-white">
                            {team.teamName || `Team ${index + 1}`}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                            <span>{team.studentIds.length} members</span>
                            {(() => {
                              const summary = validateTeamDraft(team, {
                                minTeamSize,
                                maxTeamSize,
                              });
                              return (
                                <span
                                  className={`rounded-full px-2.5 py-0.5 font-bold ${
                                    summary.isValid
                                      ? "border border-emerald-500/30 bg-emerald-500/15 text-emerald-200"
                                      : "border border-red-500/30 bg-red-500/15 text-red-200"
                                  }`}
                                >
                                  {summary.isValid ? "Valid" : "Needs fixes"}
                                </span>
                              );
                            })()}
                          </div>
                        </button>
                        {(formData.teams || []).length > 1 && (
                          <button
                            type="button"
                            disabled={isEventLocked}
                            onClick={() => {
                              setFormData((prev) => ({
                                ...prev,
                                teams: prev.teams.filter((_, current) => current !== index),
                              }));
                              setActiveTeamIndex((prev) =>
                                prev > 0 && prev >= index ? prev - 1 : 0
                              );
                            }}
                            className="ml-3 rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1 text-xs font-semibold text-red-200 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Contact Person */}
            <div className="mb-6">
              <label className="block text-slate-300 font-medium mb-2">
                Contact Person *
              </label>
              <input
                type="text"
                placeholder="Enter name of contact person"
                value={formData.contactPerson}
                disabled={isEventLocked}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    contactPerson: e.target.value,
                  }))
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition disabled:cursor-not-allowed disabled:opacity-60"
              />
              <p className="text-slate-500 text-xs mt-1">
                Name of the person coordinating the participation
              </p>
            </div>

            {/* Phone */}
            <div className="mb-6">
              <label className="block text-slate-300 font-medium mb-2 flex items-center gap-2">
                <FaPhone className="text-emerald-400" /> Contact Phone *
              </label>
              <input
                type="tel"
                placeholder="Enter contact phone number"
                value={formData.phone}
                disabled={isEventLocked}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, phone: e.target.value }))
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition disabled:cursor-not-allowed disabled:opacity-60"
              />
              <p className="text-slate-500 text-xs mt-1">
                Phone number for event coordination
              </p>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-slate-300 font-medium mb-2">
                Notes (Optional)
              </label>
              <textarea
                placeholder="Any questions, special requirements, or additional notes..."
                value={formData.notes}
                disabled={isEventLocked}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, notes: e.target.value }))
                }
                rows="4"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition resize-none disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Student Management */}
        <div>
          <h3 className="text-lg font-bold text-emerald-400 mb-2 flex items-center gap-2">
            <FaUsers className="text-xl" /> {isTeamEvent ? "Team Members" : "Student Management"}
          </h3>
          <p className="text-slate-400 text-sm mb-6">
            {isTeamEvent
              ? "Build the school team by selecting roster members."
              : "Manage participation for your students."}
            {formData.selectedStudents.length > 0 && (
              <span className="text-emerald-400 ml-2 font-bold">
                ({formData.selectedStudents.length} selected)
              </span>
            )}
            {isTeamEvent && (
              <span className="text-slate-500 ml-2">
                ({totalSelectedTeamMembers} members across {formData.teams.length} teams)
              </span>
            )}
          </p>

          <div className="mb-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
              <div className="text-xs uppercase tracking-wide text-emerald-200/80">
                {isTeamEvent ? "Roster Size" : "Selected Team"}
              </div>
              <div className="mt-1 text-2xl font-bold text-white">
                {isTeamEvent ? activeTeam.studentIds.length : formData.selectedStudents.length}
              </div>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-800/70 px-4 py-3">
              <div className="text-xs uppercase tracking-wide text-slate-400">
                Visible Selected
              </div>
              <div className="mt-1 text-2xl font-bold text-white">
                {visibleSelectedCount}
              </div>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-800/70 px-4 py-3">
                <div className="text-xs uppercase tracking-wide text-slate-400">
                Eligible Students
                </div>
              <div className="mt-1 text-2xl font-bold text-white">
                {filteredStudents.length}
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="mb-6 space-y-3">
            {/* Status Filter Tabs */}
            <div className="flex flex-wrap gap-2">
              {[
                { id: "all", label: "All" },
                { id: "UNREGISTERED", label: "Unregistered" },
                { id: "REGISTERED", label: "Registered" },
                { id: "REJECTED", label: "Rejected" },
              ].map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setInterestedFilter(filter.id)}
                  className={`px-3 py-1 text-sm rounded-lg font-medium transition-colors ${
                    interestedFilter === filter.id
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            {/* Search & Class Filter */}
            <div className="flex gap-3">
              <div className="flex-1 flex items-center gap-2 bg-slate-900 rounded-lg px-3 py-2 border border-slate-700">
                <FaSearch className="text-slate-500" />
                <input
                  type="text"
                  placeholder="Search student..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent outline-none text-white placeholder-slate-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="text-slate-500 hover:text-slate-300"
                  >
                    <FaTimes />
                  </button>
                )}
              </div>
              <select
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white"
              >
                <option value="all">All Grades</option>
                {Array.isArray(grades) &&
                  grades.map((grade) => {
                    const val = grade._id || grade;
                    const label = grade.name || grade;
                    return (
                      <option key={val} value={val}>
                        {label}
                      </option>
                    );
                  })}
              </select>
            </div>
          </div>

          {/* Unified List */}
          <div className="bg-slate-900/50 rounded-lg border border-slate-700 overflow-hidden">
            {loading ? (
              <div className="p-6 text-center text-slate-400">
                Loading students...
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="p-6 text-center text-slate-400">
                <p className="font-semibold text-slate-300">
                  No eligible students match these filters.
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Clear search, change grade/status filters, or check this event&apos;s eligible grades.
                </p>
              </div>
            ) : (
              <div className="max-h-[500px] overflow-y-auto">
                {/* Select Visible */}
                <div className="flex items-center gap-3 p-4 bg-slate-800/50 border-b border-slate-700">
                  <input
                    type="checkbox"
                    disabled={isEventLocked}
                    checked={
                      filteredStudents.length > 0 &&
                      filteredStudents
                        .filter(
                          (student) => !isTeamEvent || !otherTeamStudentIds.has(String(student._id))
                        )
                        .every((student) =>
                          (isTeamEvent ? activeTeam.studentIds : formData.selectedStudents).includes(
                            String(student._id)
                          )
                        )
                    }
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="w-5 h-5 rounded cursor-pointer accent-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <span className="text-white font-medium flex-1">
                    {isTeamEvent ? "Add All Visible To Active Team" : "Select All Visible"}
                  </span>
                  {(isTeamEvent ? activeTeam.studentIds.length : formData.selectedStudents.length) >
                    0 && (
                    <span className="text-xs bg-emerald-900/50 text-emerald-200 px-3 py-1 rounded-full">
                      {isTeamEvent
                        ? activeTeam.studentIds.length
                        : formData.selectedStudents.length} selected
                    </span>
                  )}
                </div>

                {/* Students List */}
                <div className="divide-y divide-slate-700">
                  {Array.isArray(filteredStudents) &&
                    filteredStudents.map((student) => {
                      const request = participationMap.get(student._id);
                      const isSelected = isTeamEvent
                        ? activeTeam.studentIds.includes(String(student._id))
                        : formData.selectedStudents.includes(String(student._id));
                      const isAssignedElsewhere =
                        isTeamEvent && otherTeamStudentIds.has(String(student._id));
                      const assignedTeamName = isAssignedElsewhere
                        ? (formData.teams || []).find((team, index) =>
                            index !== activeTeamIndex &&
                            (team.studentIds || []).includes(String(student._id))
                          )?.teamName || "another team"
                        : "";
                      const requestStatus = request?.status;

                      return (
                        <div
                          key={student._id}
                          className={`flex items-center gap-3 p-4 transition-colors ${
                            isSelected
                              ? "cursor-pointer border-l-2 border-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/15"
                              : isAssignedElsewhere
                              ? "cursor-not-allowed bg-slate-900/70 opacity-70"
                              : "cursor-pointer hover:bg-slate-800/50"
                          }`}
                          onClick={() =>
                            !isAssignedElsewhere && handleStudentToggle(String(student._id))
                          }
                        >
                          <input
                            disabled={isEventLocked || isAssignedElsewhere}
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleStudentToggle(String(student._id))}
                            className="w-5 h-5 rounded cursor-pointer accent-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                            onClick={(e) => e.stopPropagation()}
                          />

                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="text-white font-medium">
                                {student.name}
                              </div>
                              {isSelected && (
                                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-emerald-200">
                                  {isTeamEvent
                                    ? activeTeam.captainStudentId === String(student._id)
                                      ? "Captain"
                                      : "Team Member"
                                    : "Selected"}
                                </span>
                              )}
                              {isAssignedElsewhere && (
                                <span className="rounded-full border border-slate-600 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-300">
                                  In {assignedTeamName}
                                </span>
                              )}
                            </div>
                            <div className="text-slate-400 text-sm flex items-center gap-2">
                              <FaSchool className="text-xs" />
                              {student.grade}
                              {student.rollNumber
                                ? ` - Roll ${student.rollNumber}`
                                : ""}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center justify-end gap-2">
                            {requestStatus === "PENDING" && (
                              <span className="rounded-full border border-yellow-700 bg-yellow-900/40 px-3 py-1 text-xs font-bold text-yellow-200">
                                Pending
                              </span>
                            )}
                            {requestStatus === "APPROVED" && (
                              <span className="inline-flex items-center gap-1 rounded-full border border-green-700 bg-green-900/40 px-3 py-1 text-xs font-bold text-green-200">
                                <FaCheck className="text-[10px]" />
                                Approved
                              </span>
                            )}
                            {requestStatus === "REJECTED" && (
                              <span className="inline-flex items-center gap-1 rounded-full border border-red-700 bg-red-900/40 px-3 py-1 text-xs font-bold text-red-200">
                                <FaTimes className="text-[10px]" />
                                Rejected
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-8 flex gap-4 justify-end">
        <button
          type="button"
          disabled={isEventLocked}
          onClick={() => {
            setFormData({
              contactPerson: "",
              phone: "",
              notes: "",
              teamName: "",
              captainStudentId: "",
              selectedStudents: [],
              teams: [
                {
                  teamName: isTeamEvent
                    ? buildDefaultTeamName(schoolDisplayName, 0)
                    : "",
                  captainStudentId: "",
                  studentIds: [],
                },
              ],
            });
            setActiveTeamIndex(0);
          }}
          className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        >
          Clear
        </button>
        <button
          type="submit"
          disabled={
            submitting ||
            (isTeamEvent
              ? totalSelectedTeamMembers === 0 || !canSubmitTeamRegistration
              : formData.selectedStudents.length === 0) ||
            isEventLocked
          }
          className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg font-bold transition-colors flex items-center gap-2"
        >
          <FaCheck />{" "}
          {session?.user?.role === "STUDENT"
            ? "Confirm Participation"
            : isEditing
            ? isTeamEvent
              ? "Update Teams"
              : "Update Participants"
            : isTeamEvent
            ? "Submit Teams"
            : "Submit Students"}{" "}
          ({isTeamEvent ? totalSelectedTeamMembers : formData.selectedStudents.length})
        </button>
      </div>
    </form>
  );
});

export default EventParticipationForm;
