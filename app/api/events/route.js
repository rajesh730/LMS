import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import Event from "@/models/Event";
import EventNotice from "@/models/EventNotice";
import Student from "@/models/Student";
import ParticipationRequest from "@/models/ParticipationRequest";
import EventProposal from "@/models/EventProposal";
import EventSchoolInvitation from "@/models/EventSchoolInvitation";
import {
  ensureSchoolInvitationsForPublishedEvents,
  syncEventSchoolInvitations,
} from "@/lib/eventInvitations";
import { validateEventDates } from "@/lib/eventDates";
import { validateEventCapacity } from "@/lib/eventCapacity";
import { normalizeGradeValue } from "@/lib/schoolGrades";
import { buildEventPresentationState } from "@/lib/eventPresentation";
import { buildSchoolParticipationPresentation } from "@/lib/participationPresentation";
import { isTeamEventLike, resolveParticipationFormat as resolveParticipationFormatFromRecord } from "@/lib/eventParticipationFormat";
import { publishEventRealtimeUpdate } from "@/lib/eventRealtime";
import { ensureStudentEventNotification } from "@/lib/studentEventNotifications";
import "@/models/ExternalOrganizer";

export const dynamic = "force-dynamic";

const EVENT_PARTNER_ROLES = [
  "ORGANIZER_PARTNER",
  "CHALLENGE_PARTNER",
  "SPONSOR",
  "VENUE_PARTNER",
  "MENTOR_PARTNER",
  "MEDIA_PARTNER",
  "PRESENTED_BY",
  "OTHER",
];

function normalizeEventPartners(partners) {
  if (!Array.isArray(partners)) return [];

  return partners
    .filter((partner) => partner?.organizer || partner?.displayName)
    .map((partner, index) => ({
      organizer: partner.organizer || null,
      role: EVENT_PARTNER_ROLES.includes(partner.role)
        ? partner.role
        : "ORGANIZER_PARTNER",
      displayName: partner.displayName || "",
      logoUrl: partner.logoUrl || "",
      website: partner.website || "",
      isPrimary: index === 0 ? true : Boolean(partner.isPrimary),
    }));
}

function buildEventPartnerFromProposal(proposal) {
  const organizer = proposal?.organizer;
  if (!organizer) return null;

  return {
    organizer: organizer._id || organizer,
    role: proposal.proposedRoles?.[0] || "ORGANIZER_PARTNER",
    displayName: organizer.organizationName || proposal.organizationName || "",
    logoUrl: organizer.logoUrl || "",
    website: organizer.website || proposal.website || "",
    isPrimary: true,
  };
}

function buildTeamKey(request) {
  const schoolId = String(request.school?._id || request.school || "");
  const teamName = String(request.teamName || "").trim().toLowerCase();
  return `${schoolId}::${teamName || "default-team"}`;
}

function resolveParticipationFormat(value, minTeamSize, maxTeamSize) {
  if (
    value === "TEAM" ||
    minTeamSize !== undefined && minTeamSize !== null && minTeamSize !== "" ||
    maxTeamSize !== undefined && maxTeamSize !== null && maxTeamSize !== ""
  ) {
    return "TEAM";
  }
  return "INDIVIDUAL";
}

function validateTeamRules({ participationFormat, minTeamSize, maxTeamSize }) {
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

function groupRequestsByEvent(requests = []) {
  const grouped = new Map();
  requests.forEach((request) => {
    const eventId = String(request.event || "");
    if (!eventId) return;
    grouped.set(eventId, [...(grouped.get(eventId) || []), request]);
  });
  return grouped;
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session ||
      !["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER"].includes(session.user.role)
    ) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const {
      title,
      description,
      date,
      schoolId,
      eventScope,
      eventType,
      visibility,
      registrationMode,
      participationFormat,
      featuredOnLanding,
      publicHighlightsEnabled,
      partnerBrandingEnabled,
      partners,
      sourceProposal,
      registrationDeadline,
      maxParticipants,
      maxParticipantsPerSchool,
      minTeamSize,
      maxTeamSize,
      eligibleGrades,
      assignedMentors,
    } = await req.json();

    if (!title || !description || !date) {
      return NextResponse.json(
        { message: "All fields are required" },
        { status: 400 }
      );
    }

    const dateValidationMessage = validateEventDates({
      date,
      registrationDeadline,
    });
    if (dateValidationMessage) {
      return NextResponse.json(
        { message: dateValidationMessage },
        { status: 400 }
      );
    }

    const capacityValidation = validateEventCapacity({
      maxParticipants,
      maxParticipantsPerSchool,
    });
    if (capacityValidation.message) {
      return NextResponse.json(
        { message: capacityValidation.message },
        { status: 400 }
      );
    }

    const resolvedParticipationFormat = resolveParticipationFormat(
      participationFormat,
      minTeamSize,
      maxTeamSize
    );
    const teamValidationMessage = validateTeamRules({
      participationFormat: resolvedParticipationFormat,
      minTeamSize,
      maxTeamSize,
    });
    if (teamValidationMessage) {
      return NextResponse.json(
        { message: teamValidationMessage },
        { status: 400 }
      );
    }

    await connectDB();

    const status = session.user.role === "TEACHER" ? "PENDING" : "APPROVED";

    const normalizedScope =
      session.user.role === "SUPER_ADMIN"
        ? eventScope || "PLATFORM"
        : "SCHOOL";
    const isSchoolOwnedEvent = normalizedScope === "SCHOOL";

    let school = null;
    if (normalizedScope === "SCHOOL") {
      school =
        session.user.role === "SUPER_ADMIN"
          ? schoolId || null
          : session.user.schoolId || null;

      if (!school) {
        return NextResponse.json(
          { message: "SCHOOL events require a valid school" },
          { status: 400 }
        );
      }
    }

    let resolvedVisibility = isSchoolOwnedEvent
      ? "INVITED"
      : visibility || "PUBLIC";
    if (status !== "APPROVED" && resolvedVisibility === "PUBLIC") {
      resolvedVisibility = "INVITED";
    }

    const canFeatureOnLanding =
      session.user.role === "SUPER_ADMIN" &&
      normalizedScope === "PLATFORM" &&
      status === "APPROVED" &&
      resolvedVisibility === "PUBLIC";

    const ownerId = normalizedScope === "SCHOOL" ? school : session.user.id;
    const ownerType = normalizedScope === "SCHOOL" ? "SCHOOL" : "PLATFORM";
    let normalizedPartners =
      session.user.role === "SUPER_ADMIN" ? normalizeEventPartners(partners) : [];
    const normalizedSourceProposal =
      session.user.role === "SUPER_ADMIN" ? sourceProposal || null : null;

    if (normalizedSourceProposal) {
      const proposal = await EventProposal.findById(normalizedSourceProposal)
        .populate("organizer", "organizationName logoUrl website")
        .lean();
      const proposalPartner = buildEventPartnerFromProposal(proposal);
      if (
        proposalPartner &&
        !normalizedPartners.some(
          (partner) => String(partner.organizer) === String(proposalPartner.organizer)
        )
      ) {
        normalizedPartners = [proposalPartner, ...normalizedPartners];
      }
    }

    const newEvent = await Event.create({
      title,
      description,
      date,
      createdBy: session.user.id,
      school,
      eventScope: normalizedScope,
      ownerType,
      ownerId,
      eventType: isSchoolOwnedEvent ? "COMPETITION" : eventType || "COMPETITION",
      visibility: resolvedVisibility,
      registrationMode:
        resolvedParticipationFormat === "TEAM"
          ? "THROUGH_SCHOOL"
          : registrationMode || "THROUGH_SCHOOL",
      participationFormat: resolvedParticipationFormat,
      featuredOnLanding: canFeatureOnLanding ? Boolean(featuredOnLanding) : false,
      publicHighlightsEnabled:
        isSchoolOwnedEvent
          ? false
          : status === "APPROVED"
          ? publicHighlightsEnabled === undefined
            ? true
            : Boolean(publicHighlightsEnabled)
          : false,
      partnerBrandingEnabled:
        session.user.role === "SUPER_ADMIN" &&
        (Boolean(partnerBrandingEnabled) || Boolean(normalizedSourceProposal)) &&
        normalizedPartners.length > 0,
      partners: normalizedPartners,
      sourceProposal: normalizedSourceProposal,
      registrationDeadline: registrationDeadline || null,
      maxParticipants: capacityValidation.totalStudentCapacity,
      maxParticipantsPerSchool: isSchoolOwnedEvent
        ? null
        : capacityValidation.maxStudentsPerSchool,
      minTeamSize:
        resolvedParticipationFormat === "TEAM" && minTeamSize !== ""
          ? Number(minTeamSize) || null
          : null,
      maxTeamSize:
        resolvedParticipationFormat === "TEAM" && maxTeamSize !== ""
          ? Number(maxTeamSize) || null
          : null,
      eligibleGrades: Array.isArray(eligibleGrades)
        ? eligibleGrades.map(normalizeGradeValue).filter(Boolean)
        : [],
      assignedMentors:
        normalizedScope === "SCHOOL"
          ? []
          : Array.isArray(assignedMentors)
          ? assignedMentors
          : [],
      status,
    });

    if (normalizedSourceProposal) {
      await EventProposal.findByIdAndUpdate(normalizedSourceProposal, {
        linkedEvent: newEvent._id,
        status: "CONVERTED_TO_EVENT",
      });
    }

    if (normalizedScope === "PLATFORM" && status === "APPROVED") {
      try {
        await syncEventSchoolInvitations(newEvent._id, {
          createdBy: session.user.id,
        });
      } catch (invitationError) {
        console.error("Sync Event Invitations Error:", invitationError);
      }
    }

    try {
      if (normalizedScope === "SCHOOL") {
        await ensureStudentEventNotification({
          event: newEvent,
          schoolId: school,
          authorId: session.user.id,
          title: `New internal event: ${newEvent.title}`,
          content:
            "Your school has published a new internal event. Open Student Events to view the details and follow updates.",
        });
      }
    } catch (noticeError) {
      console.error("Create School Event Notice Error:", noticeError);
    }

    publishEventRealtimeUpdate("event-created", {
      event: newEvent,
      schoolId: school,
      eventScope: normalizedScope,
    });

    return NextResponse.json(
      { message: "Event created successfully", event: newEvent },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create Event Error:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Block unsubscribed schools
    if (
      session.user.role === "SCHOOL_ADMIN" &&
      session.user.status === "UNSUBSCRIBED"
    ) {
      return NextResponse.json(
        { message: "Subscription inactive" },
        { status: 403 }
      );
    }

    await connectDB();
    const summaryMode = req.nextUrl.searchParams.get("summary") === "1";

    let query = {};
    let currentSchoolId = null;
    let schoolIdStrings = [];

    if (
      session.user.role === "SCHOOL_ADMIN" ||
      session.user.role === "TEACHER"
    ) {
      const mongoose = (await import("mongoose")).default;

      // Resolve schoolId from session (SCHOOL_ADMIN uses own id; TEACHER was hydrated in auth callbacks)
      const resolvedSchoolId = session.user.schoolId || session.user.id;
      const schoolObjectId = resolvedSchoolId
        ? new mongoose.Types.ObjectId(resolvedSchoolId)
        : null;
      currentSchoolId = schoolObjectId;
      schoolIdStrings = Array.from(
        new Set(
          [session.user.schoolId, session.user.id]
            .filter(Boolean)
            .map((value) => String(value))
        )
      );

      if (session.user.role === "SCHOOL_ADMIN" && schoolObjectId) {
        await ensureSchoolInvitationsForPublishedEvents(schoolObjectId);
      }

      // A school's internal feed should include:
      // - its own school-owned events
      // - approved platform-wide events
      const schoolOwnedCondition = schoolObjectId ? { school: schoolObjectId } : null;
      const visibleConditions = [
        { eventScope: "PLATFORM", status: "APPROVED" },
      ];

      if (schoolOwnedCondition) {
        visibleConditions.push(schoolOwnedCondition);
      }

      query = { $or: visibleConditions };

      if (session.user.role === "TEACHER") {
        const teacherConditions = [
          { eventScope: "PLATFORM", status: "APPROVED" },
        ];

        if (schoolOwnedCondition) {
          teacherConditions.push({
            school: schoolObjectId,
            status: "APPROVED",
          });
          teacherConditions.push({
            school: schoolObjectId,
            createdBy: session.user.id,
          });
        }

        query = { $or: teacherConditions };
      }
    }

    // If Super Admin, query remains {} (fetch all)

    let events;
    try {
      // For admin, populate participant school details
      if (session.user.role === "SUPER_ADMIN") {
        events = await Event.find(query)
          .sort({ date: 1 })
          .populate("assignedMentors", "name subject roles")
          .populate("sourceProposal", "eventTitle organizationName status")
          .populate(
            "partners.organizer",
            "organizationName slug logoUrl website verificationStatus profileVisibility"
          )
          .lean();
      } else {
        // For schools/teachers, just get basic data
        events = await Event.find(query)
          .sort({ date: 1 })
          .populate("assignedMentors", "name subject roles")
          .populate(
            "partners.organizer",
            "organizationName slug logoUrl website verificationStatus profileVisibility"
          )
          .lean();
      }
    } catch (queryError) {
      console.error("Query Error:", queryError.message);
      throw queryError;
    }

    const schoolInvitationMap = new Map();
    if (session.user.role === "SCHOOL_ADMIN" && currentSchoolId) {
      const invitations = await EventSchoolInvitation.find({
        school: { $in: schoolIdStrings },
        event: { $in: events.map((event) => event._id) },
      })
        .select("event status notifiedAt readAt decisionAt reason")
        .lean();

      invitations.forEach((invitation) => {
        schoolInvitationMap.set(String(invitation.event), invitation);
      });
    }

    const eventIds = events.map((event) => event._id);
    const activeStatusFilter = { $in: ["PENDING", "APPROVED", "ENROLLED"] };

    const [summaryRequests, detailedRequests, schoolRequests, eventNotices] = await Promise.all([
      ParticipationRequest.find({
        event: { $in: eventIds },
        status: { $in: ["PENDING", "APPROVED", "ENROLLED", "REJECTED"] },
      })
        .select("event school status teamName")
        .lean(),
      session.user.role === "SUPER_ADMIN" && !summaryMode
        ? ParticipationRequest.find({
            event: { $in: eventIds },
          })
            .populate(
              "school",
              "schoolName email principalName principalPhone schoolPhone"
            )
            .populate("student", "name grade")
            .populate("captainStudent", "name")
            .lean()
        : Promise.resolve([]),
      session.user.role === "SCHOOL_ADMIN"
        ? ParticipationRequest.find({
            event: { $in: eventIds },
            school: { $in: schoolIdStrings },
          })
            .select(
              "event status contactPerson contactPhone teamName captainStudent notes student requestedAt approvedAt enrollmentConfirmedAt"
            )
            .lean()
        : Promise.resolve([]),
      EventNotice.find({
        event: { $in: eventIds },
        round: null,
        status: "PUBLISHED",
        visibility: "PUBLIC",
        isDeleted: { $ne: true },
      })
        .select("event title message type publishedAt createdAt")
        .sort({ publishedAt: -1, createdAt: -1 })
        .lean(),
    ]);

    const summaryRequestsByEvent = groupRequestsByEvent(summaryRequests);
    const detailedRequestsByEvent = groupRequestsByEvent(detailedRequests);
    const schoolRequestsByEvent = groupRequestsByEvent(schoolRequests);
    const latestNoticeByEvent = new Map();
    const noticeCountByEvent = new Map();
    eventNotices.forEach((notice) => {
      const key = String(notice.event || "");
      if (!key) return;
      noticeCountByEvent.set(key, (noticeCountByEvent.get(key) || 0) + 1);
      if (!latestNoticeByEvent.has(key)) {
        latestNoticeByEvent.set(key, notice);
      }
    });

    // Add computed fields for frontend compatibility
    const eventsWithParticipation = events.map((event) => {
        const eventObj = { ...event };

        // Map fields to frontend expectations
        eventObj.deadline = event.registrationDeadline;
        eventObj.capacity = event.maxParticipants;
        eventObj.totalStudentCapacity = event.maxParticipants;
        eventObj.isPlatformEvent = event.eventScope === "PLATFORM";
        eventObj.isSchoolEvent = event.eventScope === "SCHOOL";
        if (session.user.role === "SCHOOL_ADMIN") {
          const invitation = schoolInvitationMap.get(String(event._id));
          eventObj.schoolInvitationStatus = invitation?.status || null;
          eventObj.schoolInvitation = invitation || null;
        }

        // Calculate real-time counts from ParticipationRequest
        // This ensures Super Admin sees all activity (Pending + Approved)
        const allRequests = summaryRequestsByEvent.get(String(event._id)) || [];

        const isTeamEvent = isTeamEventLike(event);
        eventObj.participationFormat = resolveParticipationFormatFromRecord(
          event.participationFormat,
          event.minTeamSize,
          event.maxTeamSize
        );
        const requestEntryKey = (request) =>
          isTeamEvent
            ? buildTeamKey(request)
            : String(request.school?._id || request.school || "");

        const uniqueSchools = new Set(
          allRequests
            .filter((r) => ["PENDING", "APPROVED", "ENROLLED"].includes(String(r.status || "").toUpperCase()))
            .map((r) => (r.school ? String(r.school) : ""))
            .filter(Boolean)
        );
        const activeRequestsOnly = allRequests.filter((r) =>
          ["PENDING", "APPROVED", "ENROLLED"].includes(String(r.status || "").toUpperCase())
        );
        const uniqueTeams = new Set(activeRequestsOnly.map(buildTeamKey));
        const pendingEntries = new Set(
          allRequests
            .filter((r) => String(r.status || "").toUpperCase() === "PENDING")
            .map(requestEntryKey)
            .filter(Boolean)
        );
        const approvedEntries = new Set(
          allRequests
            .filter((r) => ["APPROVED", "ENROLLED"].includes(String(r.status || "").toUpperCase()))
            .map(requestEntryKey)
            .filter(Boolean)
        );
        const rejectedEntries = new Set(
          allRequests
            .filter((r) => String(r.status || "").toUpperCase() === "REJECTED")
            .map(requestEntryKey)
            .filter(Boolean)
        );

        eventObj.schoolCount = uniqueSchools.size;
        eventObj.studentCount = activeRequestsOnly.length;
        eventObj.teamCount = uniqueTeams.size;
        eventObj.memberCount = activeRequestsOnly.length;
        eventObj.pendingEntryCount = pendingEntries.size;
        eventObj.approvedEntryCount = approvedEntries.size;
        eventObj.rejectedEntryCount = rejectedEntries.size;

        // Keep legacy fields for compatibility if needed, but prefer new ones
        eventObj.enrolled = isTeamEvent ? eventObj.teamCount : eventObj.studentCount;
        eventObj.participantCount = eventObj.schoolCount;
        eventObj.studentCapacityCount = isTeamEvent
          ? eventObj.teamCount
          : eventObj.studentCount;
        eventObj.capacity = event.maxParticipants;
        eventObj.totalStudentCapacity = isTeamEvent ? null : event.maxParticipants;
        eventObj.totalTeamCapacity = isTeamEvent ? event.maxParticipants : null;

        // For Super Admin: Construct detailed participants list from requests
        if (session.user.role === "SUPER_ADMIN" && !summaryMode) {
          const detailedRequestsForEvent =
            detailedRequestsByEvent.get(String(event._id)) || [];

          // Group by school from ParticipationRequest, the registration source of truth.
          const schoolMap = new Map();

          detailedRequestsForEvent.forEach((req) => {
            if (!req.school) return;
            const schoolId = req.school._id.toString();
            const teamKey =
              isTeamEvent
                ? `${schoolId}::${String(req.teamName || "").trim().toLowerCase() || "default-team"}`
                : schoolId;

            if (!schoolMap.has(teamKey)) {
              schoolMap.set(teamKey, {
                school: req.school,
                contactPerson:
                  req.contactPerson || req.school.principalName || "N/A",
                contactPhone:
                  req.contactPhone || req.school.principalPhone || "N/A",
                joinedAt: req.requestedAt,
                students: [],
                notes: req.notes || "Pending Registration",
                status: req.status, // Added status
                teamName: req.teamName || "",
                captainStudent: req.captainStudent || null,
              });
            } else {
              // Update contact info if available in request
              const entry = schoolMap.get(teamKey);
              if (req.contactPerson) entry.contactPerson = req.contactPerson;
              if (req.contactPhone) entry.contactPhone = req.contactPhone;
              if (req.notes) entry.notes = req.notes;
              if (req.teamName) entry.teamName = req.teamName;
              if (req.captainStudent) entry.captainStudent = req.captainStudent;

              // Ensure status is set if it was missing (from initial population)
              if (!entry.status) entry.status = req.status;
              // If any request is PENDING, mark the school as PENDING
              else if (req.status === "PENDING") entry.status = "PENDING";
            }

            const schoolEntry = schoolMap.get(teamKey);
            // Add student if not already there
            if (
              req.student &&
              !schoolEntry.students.find(
                (s) => s._id.toString() === req.student._id.toString()
              )
            ) {
              // Attach requestId to student for easier approval
              const studentWithReq = { ...req.student, requestId: req._id };
              schoolEntry.students.push(studentWithReq);
            }
          });

          eventObj.participants = Array.from(schoolMap.values());
        }

        if (session.user.role === "SCHOOL_ADMIN") {
          const requests = schoolRequestsByEvent.get(String(event._id)) || [];
          Object.assign(eventObj, buildSchoolParticipationPresentation(requests));
        }

        Object.assign(
          eventObj,
          buildEventPresentationState(eventObj, {
            participationStatus: eventObj.participationStatus,
            studentCount: eventObj.myParticipation?.studentCount || 0,
            schoolInvitationStatus: eventObj.schoolInvitationStatus,
          })
        );

        const latestNotice = latestNoticeByEvent.get(String(event._id));
        if (latestNotice) {
          eventObj.latestEventNotice = {
            _id: latestNotice._id,
            title: latestNotice.title,
            message: latestNotice.message,
            type: latestNotice.type,
            publishedAt: latestNotice.publishedAt || latestNotice.createdAt,
          };
          eventObj.eventNoticeCount = noticeCountByEvent.get(String(event._id)) || 1;
        }

        return eventObj;
      });

    return NextResponse.json(
      { events: eventsWithParticipation },
      { status: 200 }
    );
  } catch (error) {
    console.error("Fetch Events Error:", error.message);
    console.error("Stack:", error.stack);
    return NextResponse.json(
      { message: "Internal Server Error", error: error.message },
      { status: 500 }
    );
  }
}
