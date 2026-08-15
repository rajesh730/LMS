import connectDB from "@/lib/db";
import Event from "@/models/Event";
import ParticipationRequest from "@/models/ParticipationRequest";
import Achievement from "@/models/Achievement";
import { successResponse, internalServerError } from "@/lib/apiResponse";
import { requireParentChild } from "@/lib/parentAccess";
import { gradeListContains } from "@/lib/schoolGrades";
import { isEventLive } from "@/lib/parentHome";
import { isActiveCertificateRecord } from "@/lib/certificates";

export const dynamic = "force-dynamic";

/**
 * The parent Events tab (§12), in four sections:
 *   🔴 LIVE NOW · 🟡 OPEN FOR REGISTRATION · 🟢 REGISTERED · COMPLETED
 *
 * Completed events carry the full chain the spec asks for —
 * Event → Participation → Result → Achievement → Certificate — so a parent can
 * follow "he took part" through to "here is the certificate" without leaving
 * the screen.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const { student, permissions, context, error } = await requireParentChild(
      searchParams.get("studentId")
    );
    if (error) return error;

    await connectDB();

    const now = new Date();

    const [events, registrations, achievements] = await Promise.all([
      // The child's own school's events, plus public platform-wide events.
      Event.find({
        status: "APPROVED",
        lifecycleStatus: { $in: ["ACTIVE", "COMPLETED"] },
        $or: [
          { school: student.school },
          { eventScope: "PLATFORM", visibility: "PUBLIC" },
        ],
      })
        .sort({ date: -1 })
        .limit(80)
        .select(
          "title description date eventType eventScope registrationDeadline eligibleGrades school lifecycleStatus participationFormat resultsPublished"
        )
        .lean(),

      ParticipationRequest.find({ student: student._id })
        .select("event status requestedAt approvedAt enrollmentConfirmedAt teamName")
        .lean(),

      Achievement.find({ student: student._id, event: { $ne: null } })
        .select(
          "event title placement certificateUrl certificateCode certificateIssuedAt certificateState"
        )
        .lean(),
    ]);

    const registrationByEvent = new Map(
      registrations.map((r) => [String(r.event), r])
    );
    const achievementByEvent = new Map(
      achievements.map((a) => [String(a.event), a])
    );

    const live = [];
    const openForRegistration = [];
    const registered = [];
    const completed = [];

    events.forEach((event) => {
      const registration = registrationByEvent.get(String(event._id));
      const achievement = achievementByEvent.get(String(event._id));
      const eligible = gradeListContains(event.eligibleGrades, student.grade);

      const card = {
        id: String(event._id),
        title: event.title,
        description: String(event.description || "").slice(0, 200),
        date: event.date,
        eventType: event.eventType,
        scope: event.eventScope,
        registrationDeadline: event.registrationDeadline || null,
        // Always name the child on the card — with two children in the app,
        // "Register" alone is ambiguous and mis-registration is costly (§12).
        childName: student.name,
        registration: registration
          ? {
              status: registration.status,
              requestedAt: registration.requestedAt,
              teamName: registration.teamName || "",
            }
          : null,
      };

      const isActiveRegistration =
        registration && ["APPROVED", "ENROLLED"].includes(registration.status);
      const isPendingRegistration = registration?.status === "PENDING";

      if (event.lifecycleStatus === "COMPLETED" || new Date(event.date) < startOfDay(now)) {
        // Only events the child actually took part in belong in COMPLETED —
        // a parent does not need a log of every event the school ever ran.
        if (isActiveRegistration || achievement) {
          completed.push({
            ...card,
            status: "COMPLETE",
            result: achievement
              ? {
                  title: achievement.title,
                  placement: String(achievement.placement || "PARTICIPANT").replaceAll("_", " "),
                }
              : null,
            certificate:
              achievement && isActiveCertificateRecord(achievement)
                ? {
                    code: achievement.certificateCode || "",
                    url: achievement.certificateUrl || "",
                    verifyPath: achievement.certificateCode
                      ? `/verify?code=${encodeURIComponent(achievement.certificateCode)}`
                      : "",
                  }
                : null,
          });
        }
        return;
      }

      if (isEventLive(event, now) && isActiveRegistration) {
        live.push({ ...card, status: "ACTION_REQUIRED", live: true });
        return;
      }

      if (isActiveRegistration || isPendingRegistration) {
        registered.push({
          ...card,
          status: isPendingRegistration ? "NEEDS_ATTENTION" : "COMPLETE",
          // A pending request is with the school, not the parent — say so
          // rather than leaving them wondering whether they finished.
          awaitingApproval: isPendingRegistration,
        });
        return;
      }

      const deadline = event.registrationDeadline
        ? new Date(event.registrationDeadline)
        : null;
      const stillOpen = deadline ? deadline > now : new Date(event.date) > now;

      if (stillOpen && eligible) {
        const closingSoon =
          deadline && (deadline - now) / (1000 * 60 * 60) <= 48;
        openForRegistration.push({
          ...card,
          status: closingSoon ? "ACTION_REQUIRED" : "NEEDS_ATTENTION",
          closingSoon: Boolean(closingSoon),
          // The button is hidden, not merely disabled, for a guardian without
          // registration rights (§20).
          canRegister: Boolean(permissions.canRegisterEvents),
        });
      }
    });

    return successResponse(200, "Events loaded", {
      child: {
        id: context.studentId,
        name: student.name,
        grade: student.grade || "",
        school: { id: context.schoolId, name: context.schoolName },
      },
      permissions,
      sections: {
        live,
        openForRegistration,
        registered,
        completed: completed.slice(0, 30),
      },
    });
  } catch (err) {
    console.error("GET /api/parent/events error:", err);
    return internalServerError("Failed to load events");
  }
}

function startOfDay(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}
