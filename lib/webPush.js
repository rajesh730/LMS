import webPush from "web-push";
import connectDB from "@/lib/db";
import PushSubscription from "@/models/PushSubscription";

function configuration() {
  const publicKey = String(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "").trim();
  const privateKey = String(process.env.VAPID_PRIVATE_KEY || "").trim();
  const subject = String(
    process.env.VAPID_SUBJECT ||
      `mailto:${process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "contact@pravyo.app"}`
  ).trim();

  return { publicKey, privateKey, subject };
}

export function getWebPushPublicConfig() {
  const { publicKey, privateKey } = configuration();
  return { enabled: Boolean(publicKey && privateKey), publicKey };
}

/** Send to every registered phone/browser for the supplied parents. */
export async function sendPushToParents(parentIds, payload) {
  const ids = Array.from(new Set((parentIds || []).filter(Boolean).map(String)));
  const { publicKey, privateKey, subject } = configuration();
  if (ids.length === 0 || !publicKey || !privateKey) return { sent: 0 };

  await connectDB();
  webPush.setVapidDetails(subject, publicKey, privateKey);

  const subscriptions = await PushSubscription.find({ parent: { $in: ids } })
    .select("endpoint keys")
    .lean();

  let sent = 0;
  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webPush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: subscription.keys,
          },
          JSON.stringify({
            title: String(payload.title || "Pravyo").slice(0, 180),
            body: String(payload.body || "You have a new update.").slice(0, 500),
            href: String(payload.href || "/parent/notifications"),
            tag: String(payload.tag || "pravyo-update").slice(0, 120),
          }),
          { TTL: 60 * 60 * 24, urgency: payload.urgent ? "high" : "normal" }
        );
        sent += 1;
      } catch (error) {
        // 404/410 means the browser permanently invalidated this endpoint.
        if (error?.statusCode === 404 || error?.statusCode === 410) {
          await PushSubscription.deleteOne({ endpoint: subscription.endpoint });
          return;
        }
        console.error("[webPush] delivery failed:", error.message);
      }
    })
  );

  return { sent };
}
