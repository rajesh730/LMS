import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import Event from "@/models/Event";
import EventProposal from "@/models/EventProposal";
import EventSchoolInvitation from "@/models/EventSchoolInvitation";
import { syncEventSchoolInvitations } from "@/lib/eventInvitations";
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
      targetGroup,
      eventScope,
      eventType,
      visibility,
      registrationMode,
      featuredOnLanding,
      publicHighlightsEnabled,
      partnerBrandingEnabled,
      partners,
      sourceProposal,
      resultsPublished,
      registrationDeadline,
      maxParticipants,
      maxParticipantsPerSchool,
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

    const requestedScope =
      session.user.role === "SUPER_ADMIN"
        ? eventScope || event.eventScope
        : event.eventScope;

    event.title = title ?? event.title;
    event.description = description ?? event.description;
    event.date = date ?? event.date;
    if (targetGroup !== undefined) {
      event.targetGroup = targetGroup || null;
    }
    event.eventScope = requestedScope;
    event.ownerType =
      requestedScope === "SCHOOL"
        ? "SCHOOL"
        : requestedScope === "PLATFORM"
        ? "PLATFORM"
        : event.ownerType;
    event.eventType = eventType || event.eventType;
    event.visibility = visibility || event.visibility;
    event.registrationMode = registrationMode || event.registrationMode;
    if (featuredOnLanding !== undefined) {
      event.featuredOnLanding = Boolean(featuredOnLanding);
    }
    if (publicHighlightsEnabled !== undefined) {
      event.publicHighlightsEnabled = Boolean(publicHighlightsEnabled);
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
    if (resultsPublished !== undefined) {
      event.resultsPublished = Boolean(resultsPublished);
    }
    if (registrationDeadline !== undefined) {
      event.registrationDeadline = registrationDeadline || null;
    }
    if (maxParticipants !== undefined) {
      event.maxParticipants = maxParticipants || null;
    }
    if (maxParticipantsPerSchool !== undefined) {
      event.maxParticipantsPerSchool = maxParticipantsPerSchool || null;
    }
    if (eligibleGrades !== undefined) {
      event.eligibleGrades = eligibleGrades || [];
    }
    if (Array.isArray(assignedMentors)) {
      event.assignedMentors = assignedMentors;
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
    
    // Check for permanent delete flag
    const { searchParams } = new URL(req.url);
    const isPermanent = searchParams.get("permanent") === "true";

    console.log(`[DELETE EVENT] Request received for ID: ${id}, Permanent: ${isPermanent}`);

    await connectDB();

    const event = await Event.findById(id);
    if (!event) {
      return NextResponse.json({ message: "Event not found" }, { status: 404 });
    }

    if (!canManageEvent(session, event)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    if (!isPermanent) {
      // SOFT DELETE (Archive)
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
          console.error("Withdraw Event Invitations Error:", invitationError);
        }
      }

      return NextResponse.json(
        { message: "Event archived successfully" },
        { status: 200 }
      );
    }

    // PERMANENT DELETE
    let deletedEvent;
    try {
      console.log("[DELETE EVENT] Attempting findByIdAndDelete...");
      deletedEvent = await Event.findByIdAndDelete(id);
      console.log(
        "[DELETE EVENT] Result:",
        deletedEvent ? "Deleted" : "Not Found"
      );

      // ===== CASCADE DELETE: Remove related participation requests =====
      if (deletedEvent) {
        const ParticipationRequest = (
          await import("@/models/ParticipationRequest")
        ).default;
        const deleteResult = await ParticipationRequest.deleteMany({
          event: id,
        });
        await EventSchoolInvitation.deleteMany({ event: id });
        console.log(
          `[DELETE EVENT] Deleted ${deleteResult.deletedCount} related participation requests`
        );
      }
    } catch (dbError) {
      console.error("[DELETE EVENT] DB Error:", dbError);
      throw dbError;
    }

    if (!deletedEvent) {
      return NextResponse.json({ message: "Event not found" }, { status: 404 });
    }

    return NextResponse.json(
      { message: "Event and related requests permanently deleted" },
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
