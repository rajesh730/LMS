import Event from "@/models/Event";

export function canManageEventRounds(session, event) {
  if (!session?.user || !event) return false;

  if (session.user.role === "SUPER_ADMIN") return true;

  if (session.user.role === "SCHOOL_ADMIN") {
    const schoolId = session.user.schoolId || session.user.id;
    return (
      event.eventScope === "SCHOOL" &&
      event.school &&
      String(event.school) === String(schoolId)
    );
  }

  if (session.user.role === "TEACHER") {
    const schoolId = session.user.schoolId || null;
    const isAssignedMentor = (event.assignedMentors || []).some(
      (mentor) => String(mentor._id || mentor) === String(session.user.id)
    );
    return (
      event.eventScope === "SCHOOL" &&
      event.school &&
      String(event.school) === String(schoolId) &&
      (String(event.createdBy) === String(session.user.id) || isAssignedMentor)
    );
  }

  return false;
}

export async function getManageableEventOrResponse(eventId, session) {
  const event = await Event.findById(eventId);

  if (!event) {
    return { error: { message: "Event not found", status: 404 } };
  }

  if (!canManageEventRounds(session, event)) {
    return { error: { message: "Forbidden", status: 403 } };
  }

  return { event };
}
