import { successResponse, validationError, internalServerError } from "@/lib/apiResponse";
import { requireParentSession } from "@/lib/parentAccess";
import { getWebPushPublicConfig } from "@/lib/webPush";
import PushSubscription from "@/models/PushSubscription";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { parent, error } = await requireParentSession();
    if (error) return error;

    const config = getWebPushPublicConfig();
    const count = await PushSubscription.countDocuments({ parent: parent._id });
    return successResponse(200, "Push status loaded", {
      ...config,
      subscribed: count > 0,
    });
  } catch (error) {
    console.error("GET /api/parent/push-subscription error:", error);
    return internalServerError("Failed to load push notification settings");
  }
}

export async function POST(request) {
  try {
    const { parent, error } = await requireParentSession();
    if (error) return error;

    if (!getWebPushPublicConfig().enabled) {
      return validationError("Push notifications are not configured yet");
    }

    const body = await request.json().catch(() => ({}));
    const endpoint = String(body?.endpoint || "").trim();
    const p256dh = String(body?.keys?.p256dh || "").trim();
    const auth = String(body?.keys?.auth || "").trim();

    let endpointUrl;
    try {
      endpointUrl = new URL(endpoint);
    } catch {
      return validationError("Invalid push subscription");
    }
    if (endpointUrl.protocol !== "https:" || !p256dh || !auth) {
      return validationError("Invalid push subscription");
    }

    await PushSubscription.findOneAndUpdate(
      { endpoint },
      {
        $set: {
          parent: parent._id,
          keys: { p256dh, auth },
          userAgent: String(request.headers.get("user-agent") || "").slice(0, 500),
          lastUsedAt: new Date(),
        },
      },
      { upsert: true, new: true, runValidators: true }
    );

    return successResponse(200, "Push notifications enabled", { subscribed: true });
  } catch (error) {
    console.error("POST /api/parent/push-subscription error:", error);
    return internalServerError("Failed to enable push notifications");
  }
}

export async function DELETE(request) {
  try {
    const { parent, error } = await requireParentSession();
    if (error) return error;
    const body = await request.json().catch(() => ({}));
    const endpoint = String(body?.endpoint || "").trim();
    const query = { parent: parent._id, ...(endpoint ? { endpoint } : {}) };
    await PushSubscription.deleteMany(query);
    return successResponse(200, "Push notifications disabled", { subscribed: false });
  } catch (error) {
    console.error("DELETE /api/parent/push-subscription error:", error);
    return internalServerError("Failed to disable push notifications");
  }
}
