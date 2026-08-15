import connectDB from "@/lib/db";
import Conversation from "@/models/Conversation";
import Message from "@/models/Message";
import {
  successResponse,
  errorResponse,
  validationError,
  internalServerError,
} from "@/lib/apiResponse";
import { requireParentChild } from "@/lib/parentAccess";
import {
  appendMessage,
  markConversationRead,
  sanitiseAttachments,
} from "@/lib/parentMessaging";

export const dynamic = "force-dynamic";

/**
 * Read one conversation thread (§15).
 *
 * The conversation is looked up with `participants.parent` in the FILTER, not
 * checked afterwards — so a guardian who is not in the thread gets a 404 and
 * cannot confirm the thread exists at all. That matters most in the separated-
 * guardian case the spec calls out (§20).
 */
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);

    const { parent, student, context, error } = await requireParentChild(
      searchParams.get("studentId"),
      "canMessageSchool"
    );
    if (error) return error;

    await connectDB();

    const conversation = await Conversation.findOne({
      _id: id,
      student: student._id,
      isDeleted: { $ne: true },
      "participants.parent": parent._id,
    }).lean();

    if (!conversation) {
      return errorResponse(404, "Conversation not found", "NOT_FOUND");
    }

    const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(searchParams.get("limit") || "30", 10) || 30)
    );

    // Newest-first for pagination (so "load older" is a deeper page), reversed
    // below for display order. Paging rather than loading a whole history keeps
    // a long thread usable on a slow connection (§22).
    const messages = await Message.find({
      conversation: conversation._id,
      isDeleted: { $ne: true },
    })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select(
        "senderType senderParent senderName body attachments replyTo transcript createdAt readByStaffAt"
      )
      .lean();

    await markConversationRead({
      conversationId: conversation._id,
      parentId: parent._id,
    });

    return successResponse(200, "Conversation loaded", {
      child: {
        id: context.studentId,
        name: student.name,
        school: { id: context.schoolId, name: context.schoolName },
      },
      conversation: {
        id: String(conversation._id),
        topic: conversation.topic,
        title: conversation.routedToLabel || conversation.subject || "School",
        isAnnouncement: conversation.originType === "SCHOOL_ANNOUNCEMENT",
        status: conversation.status,
      },
      messages: messages.reverse().map((message) => ({
        id: String(message._id),
        mine:
          message.senderType === "PARENT" &&
          String(message.senderParent) === String(parent._id),
        senderType: message.senderType,
        senderName: message.senderName || "",
        body: message.body || "",
        attachments: message.attachments || [],
        replyTo: message.replyTo ? String(message.replyTo) : null,
        transcript: message.transcript || "",
        createdAt: message.createdAt,
        readByStaff: Boolean(message.readByStaffAt),
      })),
      pagination: { page, limit, hasOlder: messages.length === limit },
    });
  } catch (err) {
    console.error("GET /api/parent/messages/[id] error:", err);
    return internalServerError("Failed to load conversation");
  }
}

/** Post a reply into an existing thread. */
export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const { parent, student, error } = await requireParentChild(
      body.studentId,
      "canMessageSchool"
    );
    if (error) return error;

    await connectDB();

    const conversation = await Conversation.findOne({
      _id: id,
      student: student._id,
      isDeleted: { $ne: true },
      "participants.parent": parent._id,
    });

    if (!conversation) {
      return errorResponse(404, "Conversation not found", "NOT_FOUND");
    }

    if (conversation.status === "CLOSED") {
      return validationError("This conversation has been closed by the school");
    }

    const text = String(body.message || "").trim();
    const attachments = sanitiseAttachments(
      Array.isArray(body.attachments) ? body.attachments : []
    );

    if (!text && attachments.length === 0) {
      return validationError("Please write a message");
    }

    const message = await appendMessage({
      conversation,
      senderType: "PARENT",
      senderParent: parent._id,
      senderName: parent.name,
      body: text,
      attachments,
      replyTo: body.replyTo || null,
    });

    return successResponse(201, "Message sent", {
      id: String(message._id),
      createdAt: message.createdAt,
    });
  } catch (err) {
    console.error("POST /api/parent/messages/[id] error:", err);
    return internalServerError("Failed to send your message");
  }
}
