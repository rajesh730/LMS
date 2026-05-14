export const ACTIVE_PARTICIPATION_REQUEST_STATUSES = [
  "PENDING",
  "APPROVED",
  "ENROLLED",
];

function resolveStudentId(request) {
  const value = request?.student;
  if (!value) return "";
  return String(value._id || value);
}

function pickContactRequest(requests = []) {
  return requests.find((request) => request.contactPerson || request.contactPhone) || requests[0] || null;
}

function buildTeamBuckets(requests = []) {
  const buckets = new Map();

  requests.forEach((request) => {
    const teamName = String(request.teamName || "").trim();
    if (!teamName) return;

    const key = teamName.toLowerCase();
    if (!buckets.has(key)) {
      buckets.set(key, {
        teamName,
        captainStudent:
          request.captainStudent?._id || request.captainStudent || null,
        members: [],
        memberIds: [],
        memberCount: 0,
        status: String(request.status || "").toUpperCase(),
        contactPerson: request.contactPerson || "",
        contactPhone: request.contactPhone || "",
        notes: request.notes || "",
      });
    }

    const bucket = buckets.get(key);
    const student = request.student || null;
    const studentId = resolveStudentId(request);

    if (student && studentId && !bucket.memberIds.includes(studentId)) {
      bucket.members.push(student);
      bucket.memberIds.push(studentId);
      bucket.memberCount = bucket.members.length;
    }

    bucket.captainStudent =
      bucket.captainStudent ||
      request.captainStudent?._id ||
      request.captainStudent ||
      null;
    bucket.contactPerson = bucket.contactPerson || request.contactPerson || "";
    bucket.contactPhone = bucket.contactPhone || request.contactPhone || "";
    bucket.notes = bucket.notes || request.notes || "";
  });

  return Array.from(buckets.values());
}

export function buildSchoolParticipationPresentation(requests = []) {
  const normalizedRequests = Array.isArray(requests) ? requests : [];
  const statuses = normalizedRequests.map((request) => String(request.status || "").toUpperCase());
  const activeRequests = normalizedRequests.filter((request) =>
    ACTIVE_PARTICIPATION_REQUEST_STATUSES.includes(String(request.status || "").toUpperCase())
  );
  const contactRequest = pickContactRequest(normalizedRequests);
  const teams = buildTeamBuckets(activeRequests);

  let participationStatus = null;
  if (statuses.includes("APPROVED") || statuses.includes("ENROLLED")) {
    participationStatus = "APPROVED";
  } else if (statuses.includes("PENDING")) {
    participationStatus = "PENDING";
  } else if (statuses.includes("REJECTED")) {
    participationStatus = "REJECTED";
  }

  return {
    participationStatus,
    isParticipating: Boolean(participationStatus),
    hasSchoolParticipation: activeRequests.length > 0,
    myParticipation: contactRequest
        ? {
          contactPerson: contactRequest.contactPerson || "",
          contactPhone: contactRequest.contactPhone || "",
          notes: contactRequest.notes || "",
          teamName: contactRequest.teamName || "",
          captainStudent:
            contactRequest.captainStudent?._id || contactRequest.captainStudent || null,
          students: activeRequests.map((request) => request.student),
          studentIds: activeRequests.map(resolveStudentId).filter(Boolean),
          studentCount: activeRequests.length,
          teams,
          teamCount: teams.length,
          status: participationStatus,
          registeredAt:
            contactRequest.enrollmentConfirmedAt ||
            contactRequest.approvedAt ||
            contactRequest.requestedAt ||
            null,
        }
      : null,
  };
}

export function applySchoolParticipationProjection(event, schoolId, requests = []) {
  const normalizedRequests = Array.isArray(requests) ? requests : [];
  const activeRequests = normalizedRequests.filter((request) =>
    ACTIVE_PARTICIPATION_REQUEST_STATUSES.includes(String(request.status || "").toUpperCase())
  );
  const contactRequest = pickContactRequest(normalizedRequests);
  const normalizedSchoolId = String(schoolId);

  event.participants = (event.participants || []).filter(
    (participant) => String(participant.school) !== normalizedSchoolId
  );

  if (!activeRequests.length) {
    return event;
  }

  event.participants.push({
    school: schoolId,
    joinedAt: contactRequest?.requestedAt || new Date(),
    contactPerson: contactRequest?.contactPerson || undefined,
    contactPhone: contactRequest?.contactPhone || undefined,
    expectedStudents: activeRequests.length,
    notes: contactRequest?.notes || undefined,
    teamName: contactRequest?.teamName || undefined,
    captainStudent:
      contactRequest?.captainStudent?._id || contactRequest?.captainStudent || null,
    students: activeRequests
      .map((request) => request.student?._id || request.student)
      .filter(Boolean),
  });

  return event;
}
