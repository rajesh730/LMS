import connectDB from "@/lib/db";
import Conversation from "@/models/Conversation";
import {
  successResponse,
  validationError,
  internalServerError,
} from "@/lib/apiResponse";
import { requireParentChild } from "@/lib/parentAccess";
import {
  getAvailableTopics,
  findOrCreateConversation,
  appendMessage,
  sanitiseAttachments,
  TOPIC_CATALOGUE,
} from "@/lib/parentMessaging";

export const dynamic = "force-dynamic";

/**
 * The parent's conversation list for the selected child (§13).
 *
 * Scoped by BOTH `student` and `participants.parent`, which is what keeps two
 * guarantees at once:
 *   - switching child switches the whole thread list (§36);
 *   - one guardian never sees another guardian's conversation with the school
 *     (§19) — critical in separated-family cases.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const { parent, student, context, error } = await requireParentChild(
      searchParams.get("studentId"),
      "canMessageSchool"
    );
    if (error) return error;

    await connectDB();

    const conversations = await Conversation.find({
      student: student._id,
      isDeleted: { $ne: true },
      "participants.parent": parent._id,
    })
      .sort({ lastMessageAt: -1 })
      .limit(50)
      .select(
        "topic routedToLabel subject lastMessageAt lastMessagePreview lastMessageSenderType participants originType status"
      )
      .lean();

    const topics = await getAvailableTopics(context.schoolId);

    return successResponse(200, "Conversations loaded", {
      child: {
        id: context.studentId,
        name: student.name,
        school: { id: context.schoolId, name: context.schoolName },
      },
      conversations: conversations.map((conversation) => {
        const me = (conversation.participants || []).find(
          (p) =>
            p.participantType === "PARENT" &&
            String(p.parent) === String(parent._id)
        );
        const emoji =
          TOPIC_CATALOGUE.find((t) => t.topic === conversation.topic)?.emoji ||
          "💬";

        return {
          id: String(conversation._id),
          topic: conversation.topic,
          emoji,
          // The staff-side LABEL, never an individual's contact details (§15).
          title: conversation.routedToLabel || conversation.subject || "School",
          preview: conversation.lastMessagePreview || "",
          lastMessageAt: conversation.lastMessageAt,
          lastMessageSenderType: conversation.lastMessageSenderType || "",
          unreadCount: me?.unreadCount || 0,
          isAnnouncement: conversation.originType === "SCHOOL_ANNOUNCEMENT",
          status: conversation.status,
        };
      }),
      // Only the topics this school offers — see lib/parentMessaging.js.
      topics,
    });
  } catch (err) {
    console.error("GET /api/parent/messages error:", err);
    return internalServerError("Failed to load messages");
  }
}

/**
 * Start (or resume) a conversation on a topic and post the first message (§14).
 *
 * The parent supplies a TOPIC, never a recipient. Routing is resolved
 * server-side from the school's configuration.
 */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));

    const { parent, student, context, error } = await requireParentChild(
      body.studentId,
      "canMessageSchool"
    );
    if (error) return error;

    const message = String(body.message || "").trim();
    const attachments = Array.isArray(body.attachments) ? body.attachments : [];

    if (!message && attachments.length === 0) {
      return validationError("Please write a message");
    }

    const topics = await getAvailableTopics(context.schoolId);
    if (topics.length === 0) {
      return validationError(
        "This school has not enabled parent messaging yet."
      );
    }

    // Reject a topic the school does not offer, rather than silently routing it
    // to a fallback the parent did not choose.
    const requestedTopic = String(body.topic || "").toUpperCase();
    if (!topics.some((t) => t.topic === requestedTopic)) {
      return validationError("Please choose what you need help with");
    }

    const conversation = await findOrCreateConversation({
      parent,
      student,
      schoolId: context.schoolId,
      topic: requestedTopic,
      subject: body.subject || "",
    });

    await appendMessage({
      conversation,
      senderType: "PARENT",
      senderParent: parent._id,
      senderName: parent.name,
      body: message,
      attachments: sanitiseAttachments(attachments),
    });

    return successResponse(201, "Message sent", {
      conversationId: String(conversation._id),
    });
  } catch (err) {
    console.error("POST /api/parent/messages error:", err);
    return internalServerError("Failed to send your message");
  }
}
