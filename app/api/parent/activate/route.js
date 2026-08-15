import connectDB from "@/lib/db";
import Parent from "@/models/Parent";
import ParentStudentLink from "@/models/ParentStudentLink";
import Student from "@/models/Student";
import User from "@/models/User";
import SchoolConfig from "@/models/SchoolConfig";
import {
  successResponse,
  errorResponse,
  validationError,
  internalServerError,
} from "@/lib/apiResponse";
import { applyRateLimit } from "@/lib/rateLimit";
import {
  resolveActivationByToken,
  resolveActivationByPin,
  completeActivation,
  ACTIVATION_INVALID,
} from "@/lib/parentCredentials";

export const dynamic = "force-dynamic";

/**
 * Parent Access activation (§8, §9, §11).
 *
 * GET  — resolve a card and show the child for confirmation. Does NOT activate.
 * POST — confirm, set the guardian's own PIN, and consume the card.
 *
 * The split exists because §9 requires the guardian to see and confirm the
 * child *before* anything happens: a mis-printed or mis-handed card must be
 * catchable by the person holding it, not discovered after they are inside
 * someone else's child's record.
 *
 * This route is unauthenticated by necessity — the guardian has no session yet.
 * The card credentials ARE the authentication, which is why every path here is
 * rate limited and every failure is opaque.
 */

function clientIp(request) {
  return (
    String(request.headers.get("x-forwarded-for") || "")
      .split(",")[0]
      .trim() || "unknown"
  );
}

/**
 * Minimal, safe confirmation payload.
 *
 * §53 allows showing just enough for the guardian to confirm the right child.
 * Deliberately excluded: date of birth, address, roll number, contact details,
 * other guardians, and anything about the child's record. Seeing a first name
 * and grade is what confirmation needs; anything more would make a stolen card
 * a data-disclosure event rather than just an access-control one.
 */
async function buildConfirmation(activation) {
  const [parent, student, school] = await Promise.all([
    Parent.findById(activation.parent).select("name parentId preferences").lean(),
    activation.student
      ? Student.findById(activation.student)
          .select("name grade photoUrl school")
          .lean()
      : null,
    User.findById(activation.school).select("schoolName name").lean(),
  ]);

  if (!parent) return null;

  const link = student
    ? await ParentStudentLink.findOne({
        parent: activation.parent,
        student: activation.student,
      })
        .select("relationshipType")
        .lean()
    : null;

  // The child's photo is shown only where the school's own privacy settings
  // allow it (§54); otherwise the UI falls back to initials.
  let photoAllowed = false;
  if (student?.photoUrl) {
    const config = await SchoolConfig.findOne({ school: activation.school })
      .select("allowStudentPhotoInParentApp")
      .lean();
    photoAllowed = config?.allowStudentPhotoInParentApp !== false;
  }

  return {
    guardianName: parent.name,
    relationshipType: link?.relationshipType || "",
    language: parent.preferences?.language || "en",
    school: {
      name: school?.schoolName || school?.name || "School",
    },
    child: student
      ? {
          name: student.name,
          grade: student.grade || "",
          photoUrl: photoAllowed ? student.photoUrl : "",
        }
      : null,
  };
}

/** Resolve a QR token and return the confirmation screen's data. */
export async function GET(request) {
  try {
    const ip = clientIp(request);
    const rate = await applyRateLimit({
      key: `parent-activate-get:${ip}`,
      windowMs: 10 * 60 * 1000,
      max: 20,
    });
    if (!rate.ok) {
      return errorResponse(429, "Please wait a moment and try again.", "RATE_LIMITED");
    }

    const { searchParams } = new URL(request.url);
    const token = String(searchParams.get("t") || "").trim();
    if (!token) return validationError("Missing card details");

    await connectDB();

    const activation = await resolveActivationByToken(token);
    if (!activation) {
      return errorResponse(400, ACTIVATION_INVALID.message, ACTIVATION_INVALID.code);
    }

    const confirmation = await buildConfirmation(activation);
    if (!confirmation) {
      return errorResponse(400, ACTIVATION_INVALID.message, ACTIVATION_INVALID.code);
    }

    return successResponse(200, "Card found", confirmation);
  } catch (err) {
    console.error("GET /api/parent/activate error:", err);
    return internalServerError("Something went wrong. Please try again.");
  }
}

/**
 * Complete activation.
 *
 * Accepts either the QR token, or a Parent ID + activation PIN pair for
 * guardians who cannot scan (§8). Both resolve to the same activation record
 * and the same consume-once behaviour.
 */
export async function POST(request) {
  try {
    const ip = clientIp(request);
    const rate = await applyRateLimit({
      key: `parent-activate-post:${ip}`,
      windowMs: 15 * 60 * 1000,
      max: 12,
    });
    if (!rate.ok) {
      return errorResponse(
        429,
        `Too many attempts. Please try again in ${rate.retryAfter}s.`,
        "RATE_LIMITED"
      );
    }

    const body = await request.json().catch(() => ({}));

    await connectDB();

    const activation = body.token
      ? await resolveActivationByToken(String(body.token))
      : await resolveActivationByPin(body.parentId, body.activationPin);

    if (!activation) {
      return errorResponse(400, ACTIVATION_INVALID.message, ACTIVATION_INVALID.code);
    }

    // Step 1 of the two-step flow: the client asked to confirm the child only.
    if (body.step === "CONFIRM") {
      const confirmation = await buildConfirmation(activation);
      if (!confirmation) {
        return errorResponse(400, ACTIVATION_INVALID.message, ACTIVATION_INVALID.code);
      }
      // A short-lived handle so the next step does not have to re-send the
      // activation PIN. The card is still not consumed at this point.
      return successResponse(200, "Card found", {
        ...confirmation,
        token: body.token || null,
        activationId: String(activation._id),
      });
    }

    const parent = await Parent.findById(activation.parent);
    if (!parent) {
      return errorResponse(400, ACTIVATION_INVALID.message, ACTIVATION_INVALID.code);
    }

    const result = await completeActivation({
      activation,
      parent,
      pin: body.pin,
      language: body.language,
      devicePreference: body.devicePreference,
    });

    if (!result.ok) {
      return errorResponse(400, result.message, result.code);
    }

    return successResponse(200, "Activated", {
      // The client signs in next with these; the PIN is the one the guardian
      // just chose, so it is not being disclosed by us.
      parentIdentifier: parent.parentId,
      devicePreference: parent.devicePreference,
    });
  } catch (err) {
    console.error("POST /api/parent/activate error:", err);
    return internalServerError("Something went wrong. Please try again.");
  }
}
