import {
  successResponse,
  internalServerError,
} from "@/lib/apiResponse";
import {
  requireParentSession,
  getParentChildren,
} from "@/lib/parentAccess";

export const dynamic = "force-dynamic";

/**
 * The parent app's bootstrap call: who am I, which children can I see, and what
 * are my preferences.
 *
 * Returns an EMPTY children array rather than a 404 when nothing is linked —
 * that is the "Connect to Your Child" state (§26), a legitimate screen, not an
 * error.
 */
export async function GET() {
  try {
    const { parent, error } = await requireParentSession();
    if (error) return error;

    const children = await getParentChildren(parent._id);

    return successResponse(200, "Parent loaded", {
      parent: {
        id: String(parent._id),
        name: parent.name,
        email: parent.email || "",
        phone: parent.phone || "",
        photoUrl: parent.photoUrl || "",
      },
      preferences: {
        simpleMode: Boolean(parent.preferences?.simpleMode),
        language: parent.preferences?.language || "en",
        calendarPreference: parent.preferences?.calendarPreference || "BS",
        dataSaver: Boolean(parent.preferences?.dataSaver),
        notifications: parent.preferences?.notifications || {
          inApp: true,
          email: true,
          sms: false,
          push: true,
        },
      },
      children,
      // Drives the /parent/link redirect. Explicit flag so the client does not
      // have to infer intent from an empty array.
      needsChildLink: children.length === 0,
    });
  } catch (err) {
    console.error("GET /api/parent/me error:", err);
    return internalServerError("Failed to load your account");
  }
}
