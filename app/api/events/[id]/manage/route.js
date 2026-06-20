import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/db";
import Event from "@/models/Event";
import EventSchoolInvitation from "@/models/EventSchoolInvitation";
import ParticipationRequest from "@/models/ParticipationRequest";
import Student from "@/models/Student";
import { buildParticipationLifecycle } from "@/lib/lifecycle";
import { getStudentViewerForEvent } from "@/lib/eventRoundAccess";

function isTeamEvent(event) {
  return String(event?.participationFormat || "INDIVIDUAL").toUpperCase() === "TEAM";
}

function buildTeamKey(request) {
  return `${String(request.school?._id || request.school || "")}::${String(
    request.teamName || ""
  )
    .trim()
    .toLowerCase() || "default-team"}`;
}

function canManageEvent(session, event) {
  if (!session?.user || !event) return false;

  if (session.user.role === "SUPER_ADMIN") return true;

  if (session.user.role === "SCHOOL_ADMIN") {
    const schoolId = session.user.schoolId || session.user.id;
    return (
      event.eventScope === "SCHOOL" &&
      event.school &&
      String(event.school._id || event.school) === String(schoolId)
    );
  }

  if (session.user.role === "TEACHER") {
    const schoolId = session.user.schoolId || null;
    const isSameSchool =
      event.eventScope === "SCHOOL" &&
      event.school &&
      String(event.school._id || event.school) === String(schoolId);
    const isCreator =
      event.createdBy && String(event.createdBy._id || event.createdBy) === String(session.user.id);
    const isAssignedMentor = (event.assignedMentors || []).some(
      (mentor) => String(mentor._id || mentor) === String(session.user.id)
    );

    return isSameSchool && (isCreator || isAssignedMentor);
  }

  return false;
}

/**
 * GET /api/events/[id]/manage
 * Get complete event with all participation requests for management
 * Only event creator or admin can access
 */
export async function GET(req, context) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const params = await context.params;
    const { id: eventId } = params;

    // Get event
    const event = await Event.findById(eventId)
      .populate("createdBy", "name email")
      .populate("school", "schoolName name email")
      .populate("assignedMentors", "name email subject roles")
      .populate("participants.school", "schoolName name email")
      .populate("participants.students", "name grade rollNumber platformStudentId");

    if (!event) {
      return NextResponse.json({ message: "Event not found" }, { status: 404 });
    }

    // Students may read visible events for their own school, or events they are
    // enrolled in. Mutations live in other routes that still require manage access.
    const viewerStudent = await getStudentViewerForEvent(event, session);
    const isReadOnlyViewer = Boolean(viewerStudent);

    const schoolScopeId =
      session.user.role === "SCHOOL_ADMIN" && event.eventScope === "PLATFORM"
        ? session.user.schoolId || session.user.id
        : viewerStudent
        ? String(viewerStudent.school || "")
        : null;

    if (isReadOnlyViewer) {
      // Student read access was verified against enrollment or same-school visibility.
    } else if (session.user.role === "STUDENT") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    } else if (schoolScopeId) {
      const [approvedInvitation, existingParticipation] = await Promise.all([
        EventSchoolInvitation.exists({
          event: eventId,
          school: schoolScopeId,
          status: "APPROVED",
        }),
        ParticipationRequest.exists({
          event: eventId,
          school: schoolScopeId,
        }),
      ]);

      if (!approvedInvitation && !existingParticipation) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
      }
    } else if (!canManageEvent(session, event)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    // Get all participation requests
    const requests = await ParticipationRequest.find({
      event: eventId,
      ...(schoolScopeId ? { school: schoolScopeId } : {}),
    })
      .populate("student", "name email grade")
      .populate("captainStudent", "name grade")
      .populate("school", "schoolName name email")
      .populate("approvedBy", "name schoolName email")
      .lean();

    // Organize requests by status
    const organized = {
      PENDING: [],
      APPROVED: [],
      REJECTED: [],
      WITHDRAWN: [],
      ENROLLED: [],
    };

    requests.forEach((req) => {
      organized[req.status]?.push({
        ...req,
        lifecycle: buildParticipationLifecycle(req),
      });
    });

    const teamEvent = isTeamEvent(event);
    const countUnits = (items = []) => {
      if (!teamEvent) return items.length;
      return new Set(items.map(buildTeamKey)).size;
    };

    const activeRequests = [...organized.APPROVED, ...organized.ENROLLED];
    const schoolScoped = Boolean(schoolScopeId);

    // Calculate capacity info
    const capacityInfo = {
      total: schoolScoped
        ? event.maxParticipantsPerSchool || event.maxParticipants || null
        : event.maxParticipants || null,
      filled: teamEvent
        ? countUnits(activeRequests)
        : schoolScoped
        ? activeRequests.length
        : event.participants.reduce(
            (sum, p) => sum + (p.students ? p.students.length : 0),
            0
          ),
      pending: countUnits(organized.PENDING),
      approved: countUnits(organized.APPROVED),
      rejected: countUnits(organized.REJECTED),
    };

    if (capacityInfo.total) {
      capacityInfo.available = Math.max(
        0,
        capacityInfo.total - capacityInfo.filled
      );
      capacityInfo.percentage = Math.round(
        (capacityInfo.filled / capacityInfo.total) * 100
      );
    }

    // Get per-school breakdown
    const perSchoolBreakdown = schoolScoped
      ? [
          {
            school: session.user.name || session.user.email || "Your school",
            count: capacityInfo.filled,
            limit: event.maxParticipantsPerSchool || null,
            percentage: event.maxParticipantsPerSchool
              ? Math.round((capacityInfo.filled / event.maxParticipantsPerSchool) * 100)
              : null,
          },
        ]
      : teamEvent
      ? Array.from(
          activeRequests.reduce((map, request) => {
            const schoolId = String(request.school?._id || request.school || "");
            if (!schoolId) return map;
            if (!map.has(schoolId)) {
              map.set(schoolId, {
                school:
                  request.school?.schoolName ||
                  request.school?.name ||
                  request.school?.email ||
                  "",
                teamKeys: new Set(),
              });
            }
            map.get(schoolId).teamKeys.add(buildTeamKey(request));
            return map;
          }, new Map()).values()
        ).map((entry) => {
          const count = entry.teamKeys.size;
          return {
            school: entry.school,
            count,
            limit: event.maxParticipantsPerSchool || null,
            percentage: event.maxParticipantsPerSchool
              ? Math.round((count / event.maxParticipantsPerSchool) * 100)
              : null,
          };
        })
      : event.participants.map((p) => ({
          school: p.school?.schoolName || p.school?.name || p.school?.email || "",
          count: p.students ? p.students.length : 0,
          limit: event.maxParticipantsPerSchool || null,
          percentage: event.maxParticipantsPerSchool
            ? Math.round(
                ((p.students ? p.students.length : 0) /
                  event.maxParticipantsPerSchool) *
                  100
              )
            : null,
        }));

    return NextResponse.json(
      {
        event: {
          id: event._id,
          _id: event._id,
          title: event.title,
          description: event.description,
          date: event.date,
          registrationDeadline: event.registrationDeadline,
          createdBy: event.createdBy,
          school: event.school,
          status: event.status,
          lifecycleStatus: event.lifecycleStatus,
          eventScope: event.eventScope,
          eventType: event.eventType,
          visibility: event.visibility,
          participationFormat: event.participationFormat,
          minTeamSize: event.minTeamSize,
          maxTeamSize: event.maxTeamSize,
          resultsPublished: event.resultsPublished,
          publicHighlightsEnabled: event.publicHighlightsEnabled,
          eligibleGrades: event.eligibleGrades,
          maxParticipants: event.maxParticipants,
          maxParticipantsPerSchool: event.maxParticipantsPerSchool,
          assignedMentors: event.assignedMentors,
        },
        requests: {
          PENDING: organized.PENDING,
          APPROVED: organized.APPROVED,
          REJECTED: organized.REJECTED,
          WITHDRAWN: organized.WITHDRAWN,
          ENROLLED: organized.ENROLLED,
        },
        capacityInfo,
        perSchoolBreakdown,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching event management data:", error);
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}
