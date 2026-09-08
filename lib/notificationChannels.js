/**
 * Private realtime channels for durable parent notifications.
 *
 * A parent channel carries only change signals, but even a notification type
 * can disclose private school activity. Every channel therefore includes the
 * recipient id and the SSE route verifies that it matches the signed-in parent.
 */

export const PARENT_NOTIFICATION_CHANNEL_PREFIX = "parent-notifications:";

export const NOTIFICATION_EVENTS = {
  NEW: "notification:new",
  STATE_CHANGED: "notification:state-changed",
};

export function parentNotificationsChannel(parentId) {
  return `${PARENT_NOTIFICATION_CHANNEL_PREFIX}${String(parentId || "")}`;
}

export function isNotificationChannel(channel) {
  return String(channel || "").startsWith(PARENT_NOTIFICATION_CHANNEL_PREFIX);
}

export function canAccessNotificationChannel(channel, session) {
  const name = String(channel || "");
  const user = session?.user;

  if (!isNotificationChannel(name) || user?.role !== "PARENT" || !user?.id) {
    return false;
  }

  const recipientId = name.slice(PARENT_NOTIFICATION_CHANNEL_PREFIX.length);
  return Boolean(recipientId) && recipientId === String(user.id);
}

