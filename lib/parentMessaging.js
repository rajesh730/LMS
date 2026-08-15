import connectDB from "@/lib/db";
import SchoolConfig from "@/models/SchoolConfig";
import User from "@/models/User";
import Teacher from "@/models/Teacher";
import Conversation, { CONVERSATION_TOPICS } from "@/models/Conversation";
import Message from "@/models/Message";

/**
 * Parent → school message routing (§14).
 *
 * The design constraint, stated plainly in the spec: *do not allow every parent
 * to randomly message every teacher in the school*.
 *
 * So a parent never selects a recipient. They answer "What do you need help
 * with?" and pick a topic; this module resolves that topic to the staff inbox
 * the SCHOOL configured. The parent never learns which individual received it
 * until that person replies, and never sees a personal phone number or email —
 * all communication stays inside Pravyo (§15).
 */

// Topic → default label + icon, used when a school has not customised its
// routing. Labels are translation keys resolved in the UI (§23).
export const TOPIC_CATALOGUE = [
  { topic: "LEARNING", emoji: "🎓", labelKey: "messages.topicLearning", defaultLabel: "Learning" },
  { topic: "EVENTS", emoji: "📅", labelKey: "messages.topicEvents", defaultLabel: "Events" },
  { topic: "TRANSPORT", emoji: "🚌", labelKey: "messages.topicTransport", defaultLabel: "Transport" },
  { topic: "FEES", emoji: "💳", labelKey: "messages.topicFees", defaultLabel: "Fees / Accounts" },
  { topic: "ADMINISTRATION", emoji: "🏫", labelKey: "messages.topicAdministration", defaultLabel: "Administration" },
  { topic: "WELLBEING", emoji: "❤️", labelKey: "messages.topicWellbeing", defaultLabel: "Student Wellbeing" },
  { topic: "OTHER", emoji: "❓", labelKey: "messages.topicOther", defaultLabel: "Other" },
];

/**
 * Which topics may this parent raise, and what is each one called here?
 *
 * A school that has configured routes gets exactly those. A school that has
 * configured nothing gets the full catalogue routed to the school admin —
 * failing OPEN rather than closed, because a parent who cannot reach the school
 * at all is a worse outcome than a message landing in the office inbox.
 */
export async function getAvailableTopics(schoolId) {
  await connectDB();

  const config = await SchoolConfig.findOne({ school: schoolId })
    .select("parentMessaging")
    .lean();

  if (config?.parentMessaging?.enabled === false) {
    return [];
  }

  const routes = config?.parentMessaging?.routes || [];

  if (routes.length === 0) {
    return TOPIC_CATALOGUE.map((entry) => ({
      ...entry,
      label: entry.defaultLabel,
      configured: false,
    }));
  }

  return routes
    .filter((route) => CONVERSATION_TOPICS.includes(route.topic))
    .map((route) => {
      const catalogue = TOPIC_CATALOGUE.find((t) => t.topic === route.topic);
      return {
        topic: route.topic,
        emoji: catalogue?.emoji || "❓",
        labelKey: catalogue?.labelKey || "messages.topicOther",
        defaultLabel: catalogue?.defaultLabel || "Other",
        label: route.label || catalogue?.defaultLabel || "Other",
        configured: true,
      };
    });
}

/**
 * Resolve the staff who should receive a new conversation on `topic`.
 *
 * Returns `{ label, recipients: [{ staff, staffModel, displayName }] }`.
 * Never returns an empty recipient list: an unroutable message is a message the
 * school never sees, so the school admin is the last-resort inbox.
 */
export async function resolveRoute({ schoolId, topic }) {
  await connectDB();

  const normalizedTopic = CONVERSATION_TOPICS.includes(topic) ? topic : "OTHER";

  const config = await SchoolConfig.findOne({ school: schoolId })
    .select("parentMessaging")
    .lean();

  const route = (config?.parentMessaging?.routes || []).find(
    (entry) => entry.topic === normalizedTopic
  );

  const catalogue = TOPIC_CATALOGUE.find((t) => t.topic === normalizedTopic);
  const label = route?.label || catalogue?.defaultLabel || "School Office";

  const configured = (route?.recipients || []).filter((r) => r.staff);

  if (configured.length > 0) {
    const teacherIds = configured
      .filter((r) => r.staffModel === "Teacher")
      .map((r) => r.staff);
    const userIds = configured
      .filter((r) => r.staffModel !== "Teacher")
      .map((r) => r.staff);

    const [teachers, users] = await Promise.all([
      teacherIds.length
        ? Teacher.find({
            _id: { $in: teacherIds },
            isDeleted: { $ne: true },
            status: { $ne: "INACTIVE" },
          })
            .select("name")
            .lean()
        : [],
      userIds.length
        ? User.find({ _id: { $in: userIds } })
            .select("name schoolName")
            .lean()
        : [],
    ]);

    const recipients = [
      ...teachers.map((t) => ({
        staff: t._id,
        staffModel: "Teacher",
        displayName: t.name || label,
      })),
      ...users.map((u) => ({
        staff: u._id,
        staffModel: "User",
        displayName: u.schoolName || u.name || label,
      })),
    ];

    // Every configured recipient may have since left the school. Fall through
    // to the admin rather than creating an unreachable thread.
    if (recipients.length > 0) {
      return { topic: normalizedTopic, label, recipients };
    }
  }

  const school = await User.findById(schoolId).select("schoolName name").lean();

  return {
    topic: normalizedTopic,
    label,
    recipients: [
      {
        staff: schoolId,
        staffModel: "User",
        displayName: school?.schoolName || school?.name || "School Office",
      },
    ],
  };
}

/**
 * Find this guardian's existing thread on a topic for a child, or start one.
 *
 * Reusing a thread rather than opening a new one per message is what makes the
 * Messages tab read like WhatsApp instead of like an email client (§13).
 */
export async function findOrCreateConversation({
  parent,
  student,
  schoolId,
  topic,
  subject = "",
}) {
  await connectDB();

  const route = await resolveRoute({ schoolId, topic });

  const existing = await Conversation.findOne({
    student: student._id,
    school: schoolId,
    topic: route.topic,
    status: "OPEN",
    isDeleted: { $ne: true },
    "participants.parent": parent._id,
  });

  if (existing) return existing;

  return Conversation.create({
    school: schoolId,
    student: student._id,
    topic: route.topic,
    routedToLabel: route.label,
    subject: subject || route.label,
    originType: "PARENT_INITIATED",
    participants: [
      {
        participantType: "PARENT",
        parent: parent._id,
        displayName: parent.name,
        lastReadAt: new Date(),
        unreadCount: 0,
      },
      ...route.recipients.map((recipient) => ({
        participantType: "STAFF",
        staff: recipient.staff,
        staffModel: recipient.staffModel,
        displayName: recipient.displayName,
        lastReadAt: null,
        unreadCount: 0,
      })),
    ],
  });
}

/**
 * Append a message and keep the conversation's denormalised preview + unread
 * counters in step.
 *
 * The counters live on the conversation so the thread list costs one query
 * instead of one-per-thread — the difference between a snappy and an unusable
 * Messages tab on a slow connection (§22).
 */
export async function appendMessage({
  conversation,
  senderType,
  senderParent = null,
  senderStaff = null,
  senderStaffModel = "User",
  senderName = "",
  body = "",
  attachments = [],
  replyTo = null,
}) {
  await connectDB();

  const trimmed = String(body || "").trim();
  if (!trimmed && attachments.length === 0) {
    throw new Error("A message needs text or an attachment");
  }

  const now = new Date();

  const message = await Message.create({
    conversation: conversation._id,
    school: conversation.school,
    student: conversation.student,
    senderType,
    senderParent,
    senderStaff,
    senderStaffModel,
    senderName,
    body: trimmed,
    attachments,
    replyTo,
    // The sender has by definition read their own message.
    readByParentAt: senderType === "PARENT" ? now : null,
    readByStaffAt: senderType === "STAFF" ? now : null,
  });

  // Bump unread for everyone except the sender.
  const participants = (conversation.participants || []).map((participant) => {
    const isSender =
      (senderType === "PARENT" &&
        participant.participantType === "PARENT" &&
        String(participant.parent) === String(senderParent)) ||
      (senderType === "STAFF" &&
        participant.participantType === "STAFF" &&
        String(participant.staff) === String(senderStaff));

    if (isSender) {
      return { ...participant, lastReadAt: now, unreadCount: 0 };
    }
    return { ...participant, unreadCount: (participant.unreadCount || 0) + 1 };
  });

  await Conversation.updateOne(
    { _id: conversation._id },
    {
      $set: {
        participants,
        lastMessageAt: now,
        lastMessagePreview: trimmed
          ? trimmed.slice(0, 160)
          : describeAttachment(attachments[0]),
        lastMessageSenderType: senderType === "SYSTEM" ? "STAFF" : senderType,
      },
    }
  );

  return message;
}

/**
 * Accept only the attachment shape the Message schema defines.
 *
 * An unfiltered pass-through would let a client write arbitrary fields into the
 * message document, so this is an allow-list, not a convenience. Capped at five
 * attachments per message.
 */
export function sanitiseAttachments(attachments = []) {
  const ALLOWED_KINDS = ["IMAGE", "DOCUMENT", "VOICE"];

  return (Array.isArray(attachments) ? attachments : [])
    .filter((a) => a && ALLOWED_KINDS.includes(a.kind) && a.url)
    .slice(0, 5)
    .map((a) => ({
      kind: a.kind,
      url: String(a.url),
      thumbnailUrl: String(a.thumbnailUrl || ""),
      name: String(a.name || "").slice(0, 120),
      mimeType: String(a.mimeType || "").slice(0, 80),
      sizeBytes: Number(a.sizeBytes) || 0,
      durationSeconds: Number(a.durationSeconds) || 0,
    }));
}

// A voice note or photo with no caption still needs a list preview.
function describeAttachment(attachment) {
  if (!attachment) return "";
  if (attachment.kind === "VOICE") return "🎤 Voice message";
  if (attachment.kind === "IMAGE") return "📷 Photo";
  return "📎 Document";
}

/** Clear this guardian's unread counter when they open a thread. */
export async function markConversationRead({ conversationId, parentId }) {
  await connectDB();

  const now = new Date();

  // Positional update touches only THIS guardian's participant entry, so
  // opening a thread never clears the other guardian's or the staff's unread
  // state (§19).
  await Conversation.updateOne(
    { _id: conversationId, "participants.parent": parentId },
    {
      $set: {
        "participants.$.unreadCount": 0,
        "participants.$.lastReadAt": now,
      },
    }
  );

  await Message.updateMany(
    { conversation: conversationId, readByParentAt: null, senderType: "STAFF" },
    { $set: { readByParentAt: now } }
  );
}
