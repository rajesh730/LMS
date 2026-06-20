import Event from "@/models/Event";
import Student from "@/models/Student";
import ParticipationRequest from "@/models/ParticipationRequest";

export function canManageEventRounds(session, event) {
  if (!session?.user || !event) return false;

  if (session.user.role === "SUPER_ADMIN") return true;

  if (session.user.role === "SCHOOL_ADMIN") {
    const schoolId = session.user.schoolId || session.user.id;
    const eventSchoolId = event.school?._id || event.school || null;
    return (
      event.eventScope === "SCHOOL" &&
      eventSchoolId &&
      String(eventSchoolId) === String(schoolId)
    );
  }

  if (session.user.role === "TEACHER") {
    const schoolId = session.user.schoolId || null;
    const eventSchoolId = event.school?._id || event.school || null;
    const isAssignedMentor = (event.assignedMentors || []).some(
      (mentor) => String(mentor._id || mentor) === String(session.user.id)
    );
    return (
      event.eventScope === "SCHOOL" &&
      eventSchoolId &&
      String(eventSchoolId) === String(schoolId) &&
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

/**
 * Resolve the active Student record for the current session, or null.
 */
export async function getStudentForSession(session) {
  if (session?.user?.role !== "STUDENT") return null;

  return Student.findOne({
    isDeleted: { $ne: true },
    status: "ACTIVE",
    $or: [
      { _id: session.user.id },
      { userId: session.user.id },
      { email: session.user.email },
      { username: session.user.email },
    ],
  })
    .select("_id school")
    .lean();
}

/**
 * Resolve the enrolled Student record for the current session, or null.
 */
export async function getEnrolledStudentForEvent(eventId, session) {
  const student = await getStudentForSession(session);

  if (!student) return null;

  const enrolled = await ParticipationRequest.exists({
    event: eventId,
    student: student._id,
    status: { $in: ["APPROVED", "ENROLLED"] },
  });

  return enrolled ? student : null;
}

export async function getStudentViewerForEvent(event, session) {
  const student = await getStudentForSession(session);

  if (!student || !event) return null;

  const enrolled = await ParticipationRequest.exists({
    event: event._id || event,
    student: student._id,
    status: { $in: ["APPROVED", "ENROLLED"] },
  });

  if (enrolled) return student;

  const eventSchoolId = event.school?._id || event.school || null;
  const lifecycleStatus = String(event.lifecycleStatus || "ACTIVE").toUpperCase();
  const canViewSchoolEvent =
    event.eventScope === "SCHOOL" &&
    event.status === "APPROVED" &&
    lifecycleStatus !== "ARCHIVED" &&
    eventSchoolId &&
    String(eventSchoolId) === String(student.school || "");

  return canViewSchoolEvent ? student : null;
}

/**
 * Like getManageableEventOrResponse, but also allows an enrolled student to
 * READ the event (canManage=false). Use for GET handlers only — mutations must
 * still use getManageableEventOrResponse so students can never edit.
 */
export async function getViewableEventOrResponse(eventId, session) {
  const event = await Event.findById(eventId);

  if (!event) {
    return { error: { message: "Event not found", status: 404 } };
  }

  if (canManageEventRounds(session, event)) {
    return { event, canManage: true, viewerStudent: null };
  }

  const viewerStudent = await getStudentViewerForEvent(event, session);
  if (viewerStudent) {
    return { event, canManage: false, viewerStudent };
  }

  return { error: { message: "Forbidden", status: 403 } };
}
