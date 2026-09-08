import webPush from "web-push";
import connectDB from "@/lib/db";
import PushSubscription from "@/models/PushSubscription";
import Parent from "@/models/Parent";

const PUSH_CONCURRENCY = 20;

function configuration() {
  const publicKey = String(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "").trim();
  const privateKey = String(process.env.VAPID_PRIVATE_KEY || "").trim();
  const subject = String(
    process.env.VAPID_SUBJECT ||
      `mailto:${process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "contact@pravyo.app"}`
  ).trim();

  return { publicKey, privateKey, subject };
}

function safeHref(value) {
  const path = String(value || "").trim();
  return path.startsWith("/") && !path.startsWith("//")
    ? path.slice(0, 300)
    : "/parent/notifications";
}

export function getWebPushPublicConfig() {
  const { publicKey, privateKey } = configuration();
  return { enabled: Boolean(publicKey && privateKey), publicKey };
}

async function sendOne(subscription, delivery) {
  await webPush.sendNotification(
    {
      endpoint: subscription.endpoint,
      keys: subscription.keys,
    },
    JSON.stringify({
      notificationId: String(delivery.notificationId || ""),
      title: String(delivery.title || "Pravyo").slice(0, 180),
      body: String(delivery.body || "You have a new update.").slice(0, 500),
      href: safeHref(delivery.href),
      createdAt: delivery.createdAt || new Date().toISOString(),
      // A unique tag prevents one child's later message replacing an earlier
      // notice in the phone's notification tray.
      tag: `pravyo-${String(delivery.notificationId || "update")}`.slice(0, 120),
      urgent: Boolean(delivery.urgent),
    }),
    { TTL: 60 * 60 * 24, urgency: delivery.urgent ? "high" : "normal" }
  );
}

/** Send each durable notification to every current device for its parent. */
export async function sendPushNotifications(deliveries = []) {
  const normalized = (Array.isArray(deliveries) ? deliveries : [])
    .map((delivery) => ({
      ...delivery,
      parentId: String(delivery?.parentId || "").trim(),
    }))
    .filter((delivery) => delivery.parentId);
  const { publicKey, privateKey, subject } = configuration();

  if (normalized.length === 0 || !publicKey || !privateKey) {
    return { sent: 0 };
  }

  await connectDB();
  webPush.setVapidDetails(subject, publicKey, privateKey);

  const parentIds = Array.from(
    new Set(normalized.map((delivery) => delivery.parentId))
  );
  const [parents, subscriptions] = await Promise.all([
    Parent.find({
      _id: { $in: parentIds },
      status: "ACTIVE",
      accessState: "ACTIVATED",
      isDeleted: { $ne: true },
    })
      .select("_id authVersion")
      .lean(),
    PushSubscription.find({ parent: { $in: parentIds } })
      .select("parent endpoint keys authVersion expirationTime")
      .lean(),
  ]);

  const authVersionByParent = new Map(
    parents.map((parent) => [String(parent._id), Number(parent.authVersion || 0)])
  );
  const deliveriesByParent = new Map();
  normalized.forEach((delivery) => {
    if (!deliveriesByParent.has(delivery.parentId)) {
      deliveriesByParent.set(delivery.parentId, []);
    }
    deliveriesByParent.get(delivery.parentId).push(delivery);
  });

  const now = Date.now();
  const jobs = [];
  const staleEndpoints = [];

  subscriptions.forEach((subscription) => {
    const parentId = String(subscription.parent);
    const currentAuthVersion = authVersionByParent.get(parentId);
    const expired =
      subscription.expirationTime &&
      new Date(subscription.expirationTime).getTime() <= now;

    if (
      currentAuthVersion === undefined ||
      Number(subscription.authVersion || 0) !== currentAuthVersion ||
      expired
    ) {
      staleEndpoints.push(subscription.endpoint);
      return;
    }

    (deliveriesByParent.get(parentId) || []).forEach((delivery) => {
      jobs.push({ subscription, delivery });
    });
  });

  if (staleEndpoints.length > 0) {
    await PushSubscription.deleteMany({ endpoint: { $in: staleEndpoints } });
  }

  let sent = 0;
  for (let index = 0; index < jobs.length; index += PUSH_CONCURRENCY) {
    const batch = jobs.slice(index, index + PUSH_CONCURRENCY);
    await Promise.all(
      batch.map(async ({ subscription, delivery }) => {
        try {
          await sendOne(subscription, delivery);
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
  }

  return { sent };
}

/** Backward-compatible helper for callers sharing one payload. */
export async function sendPushToParents(parentIds, payload) {
  return sendPushNotifications(
    Array.from(new Set((parentIds || []).filter(Boolean).map(String))).map(
      (parentId) => ({ parentId, ...payload })
    )
  );
}
