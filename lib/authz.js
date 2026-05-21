import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { errorResponse } from "@/lib/apiResponse";

export async function requireApiSession(allowedRoles = []) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.role) {
    return {
      error: errorResponse(401, "Authentication required", "UNAUTHORIZED"),
    };
  }

  if (
    allowedRoles.length > 0 &&
    !allowedRoles.includes(session.user.role)
  ) {
    return {
      error: errorResponse(403, "Forbidden", "FORBIDDEN"),
    };
  }

  return { session };
}

export function getSessionSchoolId(session) {
  if (!session?.user) return null;
  if (session.user.role === "SCHOOL_ADMIN") return session.user.id;
  return session.user.schoolId || null;
}

export function sameId(left, right) {
  return Boolean(left && right && String(left) === String(right));
}

export function isActiveStudentQuery(extra = {}) {
  return {
    ...extra,
    isDeleted: { $ne: true },
    status: { $ne: "INACTIVE" },
  };
}

export function canManageEventRecord(session, event) {
  if (!session?.user || !event) return false;

  if (session.user.role === "SUPER_ADMIN") return true;

  const schoolId = getSessionSchoolId(session);
  const eventSchoolId = event.school?._id || event.school || null;

  if (!schoolId || !eventSchoolId || !sameId(schoolId, eventSchoolId)) {
    return false;
  }

  if (session.user.role === "SCHOOL_ADMIN") {
    return event.eventScope === "SCHOOL";
  }

  if (session.user.role === "TEACHER") {
    const isCreator = sameId(event.createdBy, session.user.id);
    const isAssignedMentor = (event.assignedMentors || []).some((mentor) =>
      sameId(mentor?._id || mentor, session.user.id)
    );

    return event.eventScope === "SCHOOL" && (isCreator || isAssignedMentor);
  }

  return false;
}
