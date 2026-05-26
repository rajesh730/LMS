import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import Event from "@/models/Event";
import EventProposal from "@/models/EventProposal";
import { syncEventSchoolInvitations } from "@/lib/eventInvitations";
import { validateEventDates } from "@/lib/eventDates";
import { validateEventCapacity } from "@/lib/eventCapacity";
import { normalizeGradeValue } from "@/lib/schoolGrades";
import { publishEventRealtimeUpdate } from "@/lib/eventRealtime";
import "@/models/ExternalOrganizer";

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

function normalizeParticipationFormat(value) {
  return value === "TEAM" ? "TEAM" : "INDIVIDUAL";
}

function resolveParticipationFormat(value, minTeamSize, maxTeamSize, fallbackValue) {
  if (
    value === "TEAM" ||
    minTeamSize !== undefined && minTeamSize !== null && minTeamSize !== "" ||
    maxTeamSize !== undefined && maxTeamSize !== null && maxTeamSize !== ""
  ) {
    return "TEAM";
  }
  return normalizeParticipationFormat(value ?? fallbackValue);
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

function canManageEvent(session, event) {
  if (!session?.user || !event) return false;

  if (session.user.role === "SUPER_ADMIN") {
    return true;
  }

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
    return (
      event.eventScope === "SCHOOL" &&
      event.school &&
      String(event.school) === String(schoolId) &&
      String(event.createdBy) === String(session.user.id)
    );
  }

  return false;
}

export async function PUT(req, props) {
  try {
    const session = await getServerSession(authOptions);
    if (
      !session ||
      !["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER"].includes(session.user.role)
    ) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const params = await props.params;
    const id = params.id;
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
      resultsPublished,
      registrationDeadline,
      maxParticipants,
      maxParticipantsPerSchool,
      minTeamSize,
      maxTeamSize,
      eligibleGrades,
      lifecycleStatus,
      assignedMentors,
    } = await req.json();

    await connectDB();
    const event = await Event.findById(id);

    if (!event) {
      return NextResponse.json({ message: "Event not found" }, { status: 404 });
    }

    if (!canManageEvent(session, event)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    if (date !== undefined || registrationDeadline !== undefined) {
      const dateValidationMessage = validateEventDates({
        date: date ?? event.date,
        registrationDeadline:
          registrationDeadline !== undefined
            ? registrationDeadline || null
            : event.registrationDeadline,
      });
      if (dateValidationMessage) {
        return NextResponse.json(
          { message: dateValidationMessage },
          { status: 400 }
        );
      }
    }

    const requestedScope =
      session.user.role === "SUPER_ADMIN"
        ? eventScope || event.eventScope
        : event.eventScope;
    const isSchoolOwnedEvent = requestedScope === "SCHOOL";

    let resolvedSchool = event.school;
    if (requestedScope === "SCHOOL") {
      if (session.user.role === "SUPER_ADMIN") {
        resolvedSchool = schoolId || event.school || null;
      }
      if (!resolvedSchool) {
        return NextResponse.json(
          { message: "SCHOOL events require a valid school" },
          { status: 400 }
        );
      }
    } else {
      resolvedSchool = null;
    }

    const resolvedVisibility = isSchoolOwnedEvent
      ? "INVITED"
      : visibility || event.visibility;
    if (resolvedVisibility === "PUBLIC" && event.status !== "APPROVED") {
      return NextResponse.json(
        {
          message:
            "Only approved events can be public. Approve the event before publishing.",
        },
        { status: 400 }
      );
    }

    if (
      featuredOnLanding !== undefined &&
      Boolean(featuredOnLanding) &&
      (session.user.role !== "SUPER_ADMIN" ||
        requestedScope !== "PLATFORM" ||
        resolvedVisibility !== "PUBLIC" ||
        event.status !== "APPROVED")
    ) {
      return NextResponse.json(
        {
          message:
            "Featured events must be approved, platform-scoped, and public, and can only be managed by SUPER_ADMIN.",
        },
        { status: 400 }
      );
    }

    if (resultsPublished !== undefined && Boolean(resultsPublished) && event.status !== "APPROVED") {
      return NextResponse.json(
        { message: "Results can only be published for approved events." },
        { status: 400 }
      );
    }

    const capacityValidation = validateEventCapacity({
      maxParticipants:
        maxParticipants !== undefined ? maxParticipants : event.maxParticipants,
      maxParticipantsPerSchool:
        isSchoolOwnedEvent
          ? null
          : maxParticipantsPerSchool !== undefined
          ? maxParticipantsPerSchool
          : event.maxParticipantsPerSchool,
    });
    if (capacityValidation.message) {
      return NextResponse.json(
        { message: capacityValidation.message },
        { status: 400 }
      );
    }

    const resolvedParticipationFormat =
      resolveParticipationFormat(
        participationFormat,
        minTeamSize,
        maxTeamSize,
        event.participationFormat
      );
    const teamValidationMessage = validateTeamRules({
      participationFormat: resolvedParticipationFormat,
      minTeamSize:
        minTeamSize !== undefined ? minTeamSize : event.minTeamSize,
      maxTeamSize:
        maxTeamSize !== undefined ? maxTeamSize : event.maxTeamSize,
    });
    if (teamValidationMessage) {
      return NextResponse.json(
        { message: teamValidationMessage },
        { status: 400 }
      );
    }

    event.title = title ?? event.title;
    event.description = description ?? event.description;
    event.date = date ?? event.date;
    event.eventScope = requestedScope;
    event.school = resolvedSchool;
    event.ownerType = requestedScope === "SCHOOL" ? "SCHOOL" : "PLATFORM";
    event.ownerId = requestedScope === "SCHOOL" ? resolvedSchool : session.user.id;
    event.eventType = isSchoolOwnedEvent
      ? "COMPETITION"
      : eventType || event.eventType;
    event.visibility = resolvedVisibility;
    event.participationFormat = resolvedParticipationFormat;
    event.registrationMode =
      resolvedParticipationFormat === "TEAM"
        ? "THROUGH_SCHOOL"
        : registrationMode || event.registrationMode;
    if (featuredOnLanding !== undefined) {
      event.featuredOnLanding = Boolean(featuredOnLanding);
    }
    if (publicHighlightsEnabled !== undefined) {
      event.publicHighlightsEnabled = isSchoolOwnedEvent
        ? false
        : Boolean(publicHighlightsEnabled);
      if (!event.publicHighlightsEnabled) {
        event.featuredOnLanding = false;
      }
    }
    if (session.user.role === "SUPER_ADMIN") {
      if (Array.isArray(partners)) {
        event.partners = normalizeEventPartners(partners);
      }
      if (sourceProposal !== undefined) {
        event.sourceProposal = sourceProposal || null;
      }
      if (partnerBrandingEnabled !== undefined) {
        event.partnerBrandingEnabled =
          Boolean(partnerBrandingEnabled) && event.partners.length > 0;
      }
    }

    if (session.user.role === "SUPER_ADMIN" && event.sourceProposal) {
      const proposal = await EventProposal.findById(event.sourceProposal)
        .populate("organizer", "organizationName logoUrl website")
        .lean();
      const proposalPartner = buildEventPartnerFromProposal(proposal);
      if (
        proposalPartner &&
        !(event.partners || []).some(
          (partner) => String(partner.organizer) === String(proposalPartner.organizer)
        )
      ) {
        event.partners = [proposalPartner, ...(event.partners || [])];
      }
      if (proposalPartner && event.partners.length > 0) {
        event.partnerBrandingEnabled = true;
      }
    }
    if (resultsPublished !== undefined) {
      event.resultsPublished = Boolean(resultsPublished);
    }
    if (registrationDeadline !== undefined) {
      event.registrationDeadline = registrationDeadline || null;
    }
    if (maxParticipants !== undefined) {
      event.maxParticipants = capacityValidation.totalStudentCapacity;
    }
    if (maxParticipantsPerSchool !== undefined) {
      event.maxParticipantsPerSchool = isSchoolOwnedEvent
        ? null
        : capacityValidation.maxStudentsPerSchool;
    } else if (isSchoolOwnedEvent) {
      event.maxParticipantsPerSchool = null;
    }
    if (resolvedParticipationFormat === "TEAM") {
      event.minTeamSize =
        minTeamSize !== undefined && minTeamSize !== ""
          ? Number(minTeamSize) || null
          : minTeamSize === ""
          ? null
          : event.minTeamSize;
      event.maxTeamSize =
        maxTeamSize !== undefined && maxTeamSize !== ""
          ? Number(maxTeamSize) || null
          : maxTeamSize === ""
          ? null
          : event.maxTeamSize;
    } else {
      event.minTeamSize = null;
      event.maxTeamSize = null;
    }
    if (eligibleGrades !== undefined) {
      event.eligibleGrades = Array.isArray(eligibleGrades)
        ? eligibleGrades.map(normalizeGradeValue).filter(Boolean)
        : [];
    }
    if (Array.isArray(assignedMentors)) {
      event.assignedMentors =
        requestedScope === "SCHOOL" ? [] : assignedMentors;
    }
    if (lifecycleStatus) {
      event.lifecycleStatus = lifecycleStatus;
    }

    await event.save();

    if (session.user.role === "SUPER_ADMIN" && event.sourceProposal) {
      await EventProposal.findByIdAndUpdate(event.sourceProposal, {
        linkedEvent: event._id,
        status: "CONVERTED_TO_EVENT",
      });
    }

    if (session.user.role === "SUPER_ADMIN") {
      try {
        await syncEventSchoolInvitations(event._id, {
          createdBy: session.user.id,
        });
      } catch (invitationError) {
        console.error("Sync Event Invitations Error:", invitationError);
      }
    }

    publishEventRealtimeUpdate("event-updated", { event });

    return NextResponse.json(
      { message: "Event updated", event },
      { status: 200 }
    );
  } catch (error) {
    console.error("Update Event Error:", error);
    return NextResponse.json(
      { message: "Error updating event" },
      { status: 500 }
    );
  }
}

export async function DELETE(req, props) {
  try {
    const session = await getServerSession(authOptions);
    if (
      !session ||
      !["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER"].includes(session.user.role)
    ) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Next.js 15: props.params is a Promise
    const params = await props.params;
    const id = params.id;
    
    await connectDB();

    const event = await Event.findById(id);
    if (!event) {
      return NextResponse.json({ message: "Event not found" }, { status: 404 });
    }

    if (!canManageEvent(session, event)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const archivedEvent = await Event.findByIdAndUpdate(
      id,
      { lifecycleStatus: "ARCHIVED" },
      { new: true }
    );

    if (!archivedEvent) {
      return NextResponse.json({ message: "Event not found" }, { status: 404 });
    }

    if (session.user.role === "SUPER_ADMIN") {
      try {
        await syncEventSchoolInvitations(archivedEvent._id, {
          createdBy: session.user.id,
        });
      } catch (invitationError) {
        console.error("Archive Event Invitations Error:", invitationError);
      }
    }

    publishEventRealtimeUpdate("event-archived", { event: archivedEvent });

    return NextResponse.json(
      { message: "Event archived successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Delete Event Error:", error);
    return NextResponse.json(
      { message: "Error deleting event: " + error.message },
      { status: 500 }
    );
  }
}
