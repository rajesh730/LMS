import connectDB from "@/lib/db";
import Parent from "@/models/Parent";
import {
  successResponse,
  validationError,
  internalServerError,
} from "@/lib/apiResponse";
import { requireParentSession } from "@/lib/parentAccess";
import { SUPPORTED_LOCALES } from "@/lib/parentI18n";

export const dynamic = "force-dynamic";

/**
 * Update the guardian's own accessibility and delivery preferences (§8, §23).
 *
 * Every field is optional and validated against an allow-list, so a malformed
 * or hostile body can only ever be a no-op — it can never write an arbitrary
 * value into the parent document.
 */
export async function PATCH(request) {
  try {
    const { parent, error } = await requireParentSession();
    if (error) return error;

    const body = await request.json().catch(() => ({}));
    const updates = {};

    if (typeof body.simpleMode === "boolean") {
      updates["preferences.simpleMode"] = body.simpleMode;
    }

    if (body.language !== undefined) {
      if (!SUPPORTED_LOCALES.includes(body.language)) {
        return validationError("Unsupported language");
      }
      updates["preferences.language"] = body.language;
    }

    if (body.calendarPreference !== undefined) {
      if (!["AD", "BS"].includes(body.calendarPreference)) {
        return validationError("Calendar must be AD or BS");
      }
      updates["preferences.calendarPreference"] = body.calendarPreference;
    }

    if (typeof body.dataSaver === "boolean") {
      updates["preferences.dataSaver"] = body.dataSaver;
    }

    if (body.notifications && typeof body.notifications === "object") {
      ["inApp", "email", "sms", "push"].forEach((channel) => {
        if (typeof body.notifications[channel] === "boolean") {
          updates[`preferences.notifications.${channel}`] =
            body.notifications[channel];
        }
      });
    }

    if (Object.keys(updates).length === 0) {
      return validationError("No valid preference supplied");
    }

    await connectDB();
    const updated = await Parent.findByIdAndUpdate(
      parent._id,
      { $set: updates },
      { new: true }
    )
      .select("preferences")
      .lean();

    return successResponse(200, "Preferences saved", {
      preferences: updated?.preferences || {},
    });
  } catch (err) {
    console.error("PATCH /api/parent/preferences error:", err);
    return internalServerError("Failed to save preferences");
  }
}
