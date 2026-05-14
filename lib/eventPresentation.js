function isEndOfDayPast(value) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  date.setHours(23, 59, 59, 999);
  return date < new Date();
}

export function buildEventPresentationState(event = {}, options = {}) {
  const lifecycleStatus = String(event.lifecycleStatus || "ACTIVE").toUpperCase();
  const participationStatus = String(
    options.participationStatus || event.participationStatus || ""
  ).toUpperCase();
  const studentCount =
    Number(options.studentCount ?? event.studentCount ?? 0) || 0;
  const registrationLocked =
    ["COMPLETED", "ARCHIVED"].includes(lifecycleStatus) ||
    isEndOfDayPast(event.registrationDeadline || event.deadline);
  const finalOutcomeReady =
    Boolean(event.resultsPublished) ||
    ["COMPLETED", "ARCHIVED"].includes(lifecycleStatus);
  const isPublicResultAvailable =
    Boolean(event.resultsPublished) &&
    Boolean(event.publicResultsEnabled) &&
    event.visibility === "PUBLIC";
  const hasSchoolParticipation =
    studentCount > 0 || ["APPROVED", "ENROLLED"].includes(participationStatus);

  let schoolViewMode = "discovery";
  if (finalOutcomeReady && hasSchoolParticipation) {
    schoolViewMode = "results";
  } else if (registrationLocked && hasSchoolParticipation) {
    schoolViewMode = "tracking";
  } else if (hasSchoolParticipation) {
    schoolViewMode = "team";
  } else if (options.schoolInvitationStatus === "APPROVED") {
    schoolViewMode = "registration";
  } else if (options.schoolInvitationStatus === "PENDING") {
    schoolViewMode = "decision";
  }

  return {
    registrationLocked,
    finalOutcomeReady,
    isPublicResultAvailable,
    hasSchoolParticipation,
    schoolViewMode,
  };
}

