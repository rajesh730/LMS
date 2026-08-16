import connectDB from "@/lib/db";
import Conversation from "@/models/Conversation";
import Message from "@/models/Message";
import Student from "@/models/Student";
import ParentStudentLink from "@/models/ParentStudentLink";
import {
  successResponse,
  errorResponse,
  validationError,
  internalServerError,
} from "@/lib/apiResponse";
import { requireParentSession } from "@/lib/parentAccess";
import {
  appendMessage,
  markConversationRead,
  sanitiseAttachments,
} from "@/lib/parentMessaging";

export const dynamic = "force-dynamic";

/**
 * One conversation thread, from the guardian's side.
 *
 * AUTHORISATION IS AGAINST THE CONVERSATION'S OWN CHILD, not the child
 * currently selected in the app.
 *
 * The earlier version filtered on `student: <selected child>`, which meant a
 * guardian with two children got "Failed to load conversation" whenever the
 * switcher happened to be on the other one — following a notification deep link
 * did it every time. The selected child is a UI preference; it has no business
 * deciding whether a thread the guardian is demonstrably part of may be opened.
 *
 * Two checks still have to pass, and together they are strictly stronger than
 * the old single filter:
 *   1. the guardian is a PARTICIPANT in this conversation, and
 *   2. they hold an ACTIVE link to the child the conversation is about.
 *
 * (2) matters on its own: a school can revoke a guardian from a child without
 * deleting the thread, and participation alone would then still let them read
 * it.
 */
async function authoriseConversation(conversationId, parent) {
  await connectDB();

  // Participation is part of the FILTER, so a thread this guardian is not in
  // is indistinguishable from one that does not exist.
  const conversation = await Conversation.findOne({
    _id: conversationId,
    isDeleted: { $ne: true },
    "participants.parent": parent._id,
  });

  if (!conversation) {
    return { error: errorResponse(404, "Conversation not found", "NOT_FOUND") };
  }

  const link = await ParentStudentLink.findOne({
    parent: parent._id,
    student: conversation.student,
    status: "ACTIVE",
  })
    .select("canMessageSchool")
    .lean();

  if (!link) {
    // Access to this child was withdrawn since the thread was created.
    return { error: errorResponse(404, "Conversation not found", "NOT_FOUND") };
  }

  if (link.canMessageSchool === false) {
    return {
      error: errorResponse(
        403,
        "The school has not enabled messaging for your account.",
        "PERMISSION_DENIED"
      ),
    };
  }

  const student = await Student.findById(conversation.student)
    .select("name grade school")
    .lean();

  return { conversation, student };
}

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const { parent, error } = await requireParentSession();
    if (error) return error;

    const authorised = await authoriseConversation(id, parent);
    if (authorised.error) return authorised.error;

    const { conversation, student } = authorised;

    const { searchParams } = new URL(request.url);
    const page = Math.max(
      1,
      Number.parseInt(searchParams.get("page") || "1", 10) || 1
    );
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
        "senderType senderParent senderName subject body attachments replyTo transcript createdAt readByStaffAt"
      )
      .lean();

    await markConversationRead({
      conversationId: conversation._id,
      parentId: parent._id,
    });

    return successResponse(200, "Conversation loaded", {
      // The child this thread is ACTUALLY about, so the app can align its
      // switcher instead of showing one child's name over another's messages.
      child: {
        id: String(student._id),
        name: student.name,
        grade: student.grade || "",
      },
      conversation: {
        id: String(conversation._id),
        topic: conversation.topic,
        title: conversation.routedToLabel || "School",
        subject: conversation.subject || "",
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
        // Present only on announcements; the UI renders it as a headline above
        // the body so the guardian reads WHAT this is before the detail.
        subject: message.subject || "",
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

    const { parent, error } = await requireParentSession();
    if (error) return error;

    const authorised = await authoriseConversation(id, parent);
    if (authorised.error) return authorised.error;

    const { conversation } = authorised;

    if (conversation.status === "CLOSED") {
      return validationError("This conversation has been closed by the school");
    }

    const body = await request.json().catch(() => ({}));
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
