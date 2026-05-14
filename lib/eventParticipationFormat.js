export function resolveParticipationFormat(value, minTeamSize, maxTeamSize) {
  if (
    String(value || "").toUpperCase() === "TEAM" ||
    minTeamSize !== undefined && minTeamSize !== null && minTeamSize !== "" ||
    maxTeamSize !== undefined && maxTeamSize !== null && maxTeamSize !== ""
  ) {
    return "TEAM";
  }

  return "INDIVIDUAL";
}

export function isTeamEventLike(event) {
  return (
    resolveParticipationFormat(
      event?.participationFormat,
      event?.minTeamSize,
      event?.maxTeamSize
    ) === "TEAM"
  );
}
