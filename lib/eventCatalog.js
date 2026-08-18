/**
 * Event catalog — domain rules for creating and listing events.
 *
 * Extracted from `app/api/events/route.js` (741 lines). Two of these are the
 * kind of rule that must not be duplicated per route: `validateTeamRules`
 * decides whether a team configuration is coherent, and
 * `describeEventForFamilies` writes the text a guardian actually receives.
 *
 * NOTE: this module deliberately does NOT define a participation-format
 * resolver. The route used to carry its own copy that compared
 * `value === "TEAM"` exactly, while `lib/eventParticipationFormat.js` compares
 * case-insensitively — so an event created with `"team"` was stored as
 * INDIVIDUAL and then read back as TEAM. There is now one implementation, in
 * `lib/eventParticipationFormat.js`.
 */

/** Stable identity for a team within an event: school + normalized team name. */
export function buildTeamKey(request) {
  const schoolId = String(request.school?._id || request.school || "");
  const teamName = String(request.teamName || "").trim().toLowerCase();
  return `${schoolId}::${teamName || "default-team"}`;
}

/**
 * Is this team configuration coherent? Returns a message, or null when valid.
 * Sizes are optional — an unset bound means "no limit", not zero.
 */
export function validateTeamRules({ participationFormat, minTeamSize, maxTeamSize }) {
  if (participationFormat !== "TEAM") {
    return null;
  }

  const min = minTeamSize === "" || minTeamSize === undefined || minTeamSize === null
    ? null
    : Number(minTeamSize);
  const max = maxTeamSize === "" || maxTeamSize === undefined || maxTeamSize === null
    ? null
    : Number(maxTeamSize);

  if (min !== null && (!Number.isFinite(min) || min < 1)) {
    return "Minimum team size must be at least 1.";
  }

  if (max !== null && (!Number.isFinite(max) || max < 1)) {
    return "Maximum team size must be at least 1.";
  }

  if (min !== null && max !== null && min > max) {
    return "Minimum team size cannot exceed maximum team size.";
  }

  return null;
}

/** Bucket participation requests by their event id, for list endpoints. */
export function groupRequestsByEvent(requests = []) {
  const grouped = new Map();
  requests.forEach((request) => {
    const eventId = String(request.event || "");
    if (!eventId) return;
    grouped.set(eventId, [...(grouped.get(eventId) || []), request]);
  });
  return grouped;
}

/**
 * The announcement body for a newly published event.
 *
 * Read by students AND guardians — it becomes the message that lands in the
 * parent's inbox — so it leads with what a family actually needs: what it is,
 * when it is, and who it is for. No screen names, no product jargon.
 *
 * The date is deliberately plain English rather than a locale-formatted
 * timestamp: this is read on a low-end phone, sometimes aloud, and often by
 * someone who is not confident in English.
 */
export function describeEventForFamilies(event) {
  const parts = [];

  if (event.description) parts.push(String(event.description).trim());

  if (event.date) {
    parts.push(
      `Date: ${new Date(event.date).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })}`
    );
  }

  if (Array.isArray(event.eligibleGrades) && event.eligibleGrades.length > 0) {
    parts.push(`For: ${event.eligibleGrades.join(", ")}`);
  }

  parts.push("Open Events to see the details.");

  // Notice.content caps at 2000; a long description must not fail the write.
  return parts.join("\n\n").slice(0, 2000);
}
