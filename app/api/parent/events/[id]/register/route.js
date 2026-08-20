import connectDB from "@/lib/db";
import Event from "@/models/Event";
import ParticipationRequest from "@/models/ParticipationRequest";
import {
  successResponse,
  errorResponse,
  validationError,
  internalServerError,
} from "@/lib/apiResponse";
import { requireParentChild } from "@/lib/parentAccess";
import { gradeListContains } from "@/lib/schoolGrades";
import { notifyGuardians } from "@/lib/parentNotifications";

export const dynamic = "force-dynamic";

/**
 * Register the selected child for an event (§12).
 *
 * This creates a **PENDING ParticipationRequest** — the same record the school
 * already approves through /api/participation-requests. A parent registration
 * is a request, not an enrolment: capacity checks, grade eligibility overrides
 * and team formation all remain the school's decision, and short-circuiting
 * that would let parents bypass limits the school relies on.
 *
 * Requires `canRegisterEvents`, so a guardian the school has restricted to
 * viewing and notices cannot commit the child to anything (§20).
 */
export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const { parent, student, context, error } = await requireParentChild(
      body.studentId,
      "canRegisterEvents"
    );
    if (error) return error;

    await connectDB();

    const event = await Event.findOne({
      _id: id,
      status: "APPROVED",
      lifecycleStatus: "ACTIVE",
      $or: [
        { school: student.school },
        { eventScope: "PLATFORM", visibility: "PUBLIC" },
      ],
    })
      .select(
        "title date registrationDeadline eligibleGrades school participationFormat eventScope"
      )
      .lean();

    if (!event) {
      return errorResponse(404, "Event not found", "NOT_FOUND");
    }

    const now = new Date();
    const deadline = event.registrationDeadline
      ? new Date(event.registrationDeadline)
      : null;

    if (deadline && deadline < now) {
      return validationError("Registration for this event has closed");
    }
    if (!deadline && new Date(event.date) < now) {
      return validationError("This event has already taken place");
    }

    if (!gradeListContains(event.eligibleGrades, student.grade)) {
      return validationError(
        `${student.name} is not in an eligible grade for this event`
      );
    }

    // Team events are formed by the school, not assembled by parents.
    if (event.participationFormat === "TEAM") {
      return validationError(
        "This is a team event. Please contact the school to enter your child."
      );
    }

    const existing = await ParticipationRequest.findOne({
      student: student._id,
      event: event._id,
      school: student.school,
    }).lean();

    if (existing) {
      // Idempotent for the states that mean "already in": pressing Register
      // twice on a slow connection must not error at the parent.
      if (["PENDING", "APPROVED", "ENROLLED"].includes(existing.status)) {
        return successResponse(200, "Already registered", {
          status: existing.status,
          alreadyRegistered: true,
          child: { id: context.studentId, name: student.name },
        });
      }

      // A withdrawn or rejected request is reopened rather than duplicated —
      // the unique (student, event, school) index would reject a second row.
      await ParticipationRequest.updateOne(
        { _id: existing._id },
        {
          $set: {
            status: "PENDING",
            requestedAt: now,
            approvedAt: null,
            rejectedAt: null,
            rejectionReason: null,
            contactPerson: parent.name,
            contactPhone: parent.phone || "",
          },
        }
      );

      return successResponse(200, "Registration requested", {
        status: "PENDING",
        alreadyRegistered: false,
        child: { id: context.studentId, name: student.name },
      });
    }

    await ParticipationRequest.create({
      student: student._id,
      event: event._id,
      school: student.school,
      status: "PENDING",
      contactPerson: parent.name,
      contactPhone: parent.phone || "",
      notes: `Registered by guardian via Parent App`,
      requestedAt: now,
    });

    // Keep the other guardians informed so two do not both register the child
    // and wonder why one attempt reported "already registered" (§19).
    await notifyGuardians({
      studentId: student._id,
      category: "EVENT",
      priority: "INFO",
      title: `${student.name} registered for ${event.title}`,
      message: `${parent.name} submitted a registration. The school will confirm it.`,
      href: `/parent/events?event=${event._id}`,
      metadata: { eventId: String(event._id) },
      excludeParentId: parent._id,
    }).catch((err) =>
      console.error("[parent register] guardian notify failed:", err.message)
    );

    return successResponse(201, "Registration requested", {
      status: "PENDING",
      alreadyRegistered: false,
      child: { id: context.studentId, name: student.name },
    });
  } catch (err) {
    // The unique index on (student, event, school) is the last line of defence
    // against a double submit racing past the findOne above.
    if (err?.code === 11000) {
      return successResponse(200, "Already registered", {
        status: "PENDING",
        alreadyRegistered: true,
      });
    }
    console.error("POST /api/parent/events/[id]/register error:", err);
    return internalServerError("Failed to register");
  }
}
