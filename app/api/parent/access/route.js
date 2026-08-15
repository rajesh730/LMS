import {
  successResponse,
  errorResponse,
  validationError,
  internalServerError,
} from "@/lib/apiResponse";
import { applyRateLimit } from "@/lib/rateLimit";
import { normalizeParentId } from "@/lib/parentIdentity";
import { isValidPinFormat } from "@/lib/parentCredentials";

export const dynamic = "force-dynamic";

/**
 * Validate a Parent ID's FORMAT before the guardian is sent to activation (§8).
 *
 * Deliberately does NOT touch the database and deliberately does NOT say
 * whether the ID exists. §53 is explicit: knowing a Parent ID must never be
 * enough to learn anything. This endpoint only answers "could that be a Parent
 * ID at all?", which lets the UI catch a typo before asking for the PIN without
 * turning itself into an enumeration oracle.
 *
 * Existence is checked once, together with the PIN, in /api/parent/activate.
 */
export async function POST(request) {
  try {
    const ip =
      String(request.headers.get("x-forwarded-for") || "")
        .split(",")[0]
        .trim() || "unknown";

    const rate = await applyRateLimit({
      key: `parent-access-check:${ip}`,
      windowMs: 10 * 60 * 1000,
      max: 30,
    });
    if (!rate.ok) {
      return errorResponse(429, "Please wait a moment.", "RATE_LIMITED");
    }

    const body = await request.json().catch(() => ({}));

    const parentIdentifier = normalizeParentId(body.parentId);
    if (!parentIdentifier) {
      return validationError(
        "That Parent ID does not look right. Please check the card."
      );
    }

    if (body.pin !== undefined && !isValidPinFormat(body.pin)) {
      return validationError("The PIN should be 6 numbers.");
    }

    return successResponse(200, "Looks correct", {
      // Echo the canonical form so the UI can show it tidily. Says nothing
      // about whether the account exists.
      parentIdentifier,
    });
  } catch (err) {
    console.error("POST /api/parent/access error:", err);
    return internalServerError("Something went wrong. Please try again.");
  }
}
