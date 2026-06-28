import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Event from "@/models/Event";
import { syncEventSchoolInvitations } from "@/lib/eventInvitations";
import { getEventDeletionPolicy } from "@/lib/eventDeletion";
import { validateEventDates } from "@/lib/eventDates";
import { validateEventCapacity } from "@/lib/eventCapacity";
import { normalizeGradeValue } from "@/lib/schoolGrades";
import { publishEventRealtimeUpdate } from "@/lib/eventRealtime";
import { normalizeEventWorkflowStatus } from "@/lib/eventWorkflow";
import { canManageEventRecord, requireApiSession } from "@/lib/authz";

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

export async function PUT(req, props) {
  try {
    const { session, error } = await requireApiSession([
      "SUPER_ADMIN",
      "SCHOOL_ADMIN",
      "TEACHER",
    ]);
    if (error) return error;

    const params = await props.params;
    const id = params.id;
    const {
      title,
      description,
      date,
      schoolId,
      eventScope,
      eventType,
      registrationMode,
      participationFormat,
      resultsPublished,
      registrationDeadline,
      maxParticipants,
      maxParticipantsPerSchool,
      minTeamSize,
      maxTeamSize,
      eligibleGrades,
      lifecycleStatus,
      eventWorkflowStatus,
      assignedMentors,
    } = await req.json();

    await connectDB();
    const event = await Event.findById(id);

    if (!event) {
      return NextResponse.json({ message: "Event not found" }, { status: 404 });
    }

    if (!canManageEventRecord(session, event)) {
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

    const resolvedVisibility = event.status === "APPROVED" ? "PUBLIC" : "INVITED";

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
        : !isSchoolOwnedEvent
        ? "THROUGH_SCHOOL"
        : registrationMode === "DIRECT"
        ? "DIRECT"
        : registrationMode === "THROUGH_SCHOOL"
        ? "THROUGH_SCHOOL"
        : event.registrationMode || "THROUGH_SCHOOL";
    event.featuredOnLanding = false;
    event.publicHighlightsEnabled = event.status === "APPROVED";
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
      if (lifecycleStatus === "ARCHIVED" && event.resultsPublished) {
        return NextResponse.json(
          { message: "Events cannot be archived after results are published." },
          { status: 400 }
        );
      }
      if (lifecycleStatus === "COMPLETED" && !event.resultsPublished) {
        return NextResponse.json(
          { message: "Events can be completed only after results are published." },
          { status: 400 }
        );
      }
      event.lifecycleStatus = lifecycleStatus;
      if (lifecycleStatus === "ARCHIVED") {
        event.eventWorkflowStatus = "ARCHIVED";
      } else if (lifecycleStatus === "COMPLETED") {
        event.eventWorkflowStatus = "COMPLETED";
      }
    }
    if (eventWorkflowStatus !== undefined) {
      const nextWorkflowStatus = normalizeEventWorkflowStatus(eventWorkflowStatus);
      if (nextWorkflowStatus === "ARCHIVED") {
        event.lifecycleStatus = "ARCHIVED";
      } else if (nextWorkflowStatus === "COMPLETED") {
        if (!event.resultsPublished) {
          return NextResponse.json(
            { message: "Events can be completed only after results are published." },
            { status: 400 }
          );
        }
        event.lifecycleStatus = "COMPLETED";
      }
      event.eventWorkflowStatus = nextWorkflowStatus;
    }

    await event.save();

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
    const { session, error } = await requireApiSession([
      "SUPER_ADMIN",
      "SCHOOL_ADMIN",
      "TEACHER",
    ]);
    if (error) return error;

    // Next.js 15: props.params is a Promise
    const params = await props.params;
    const id = params.id;
    
    await connectDB();

    const event = await Event.findById(id);
    if (!event) {
      return NextResponse.json({ message: "Event not found" }, { status: 404 });
    }

    if (!canManageEventRecord(session, event)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const archivePolicy = getEventDeletionPolicy(event);
    if (!archivePolicy.canArchive) {
      return NextResponse.json(
        { message: archivePolicy.archiveBlockedReason || "This event cannot be archived." },
        { status: 400 }
      );
    }

    const archivedEvent = await Event.findByIdAndUpdate(
      id,
      { lifecycleStatus: "ARCHIVED", eventWorkflowStatus: "ARCHIVED" },
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
