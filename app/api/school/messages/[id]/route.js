import connectDB from "@/lib/db";
import Conversation from "@/models/Conversation";
import Message from "@/models/Message";
import User from "@/models/User";
import "@/models/Parent";
import "@/models/Student";
import {
  successResponse,
  errorResponse,
  validationError,
  internalServerError,
} from "@/lib/apiResponse";
import { requireApiSession, getSessionSchoolId, sameId } from "@/lib/authz";
import { appendMessage, publishThreadRead } from "@/lib/parentMessaging";
import { notifyGuardians } from "@/lib/parentNotifications";

export const dynamic = "force-dynamic";

/**
 * Read and reply to one parent conversation, from the school side.
 *
 * Tenant isolation is the load-bearing check: the conversation is looked up
 * WITH the school in the filter, so a School A staff member cannot read a
 * School B thread even with a valid conversation id (§56).
 */

async function authoriseConversation(session, id) {
  await connectDB();

  const schoolId = getSessionSchoolId(session);

  const conversation = await Conversation.findOne({
    _id: id,
    isDeleted: { $ne: true },
    // SUPER_ADMIN aside, the school is part of the lookup rather than a check
    // afterwards — a thread from another school simply does not exist here.
    ...(session.user.role === "SUPER_ADMIN" ? {} : { school: schoolId }),
  });

  if (!conversation) {
    return { error: errorResponse(404, "Conversation not found", "NOT_FOUND") };
  }

  if (
    session.user.role !== "SUPER_ADMIN" &&
    !sameId(schoolId, conversation.school)
  ) {
    return { error: errorResponse(404, "Conversation not found", "NOT_FOUND") };
  }

  return { conversation };
}

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const { session, error } = await requireApiSession([
      "SCHOOL_ADMIN",
      "SUPER_ADMIN",
      "TEACHER",
    ]);
    if (error) return error;

    const authorised = await authoriseConversation(session, id);
    if (authorised.error) return authorised.error;

    const { conversation } = authorised;

    const { searchParams } = new URL(request.url);
    const page = Math.max(
      1,
      Number.parseInt(searchParams.get("page") || "1", 10) || 1
    );
    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(searchParams.get("limit") || "50", 10) || 50)
    );

    const messages = await Message.find({
      conversation: conversation._id,
      isDeleted: { $ne: true },
    })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select(
        "senderType senderName subject body attachments createdAt readByParentAt transcript"
      )
      .lean();

    // Opening a thread clears the STAFF unread counter only. The parent's own
    // counter is untouched — the school reading a message is not the parent
    // reading the reply.
    await Conversation.updateOne(
      { _id: conversation._id, "participants.participantType": "STAFF" },
      {
        $set: {
          "participants.$.unreadCount": 0,
          "participants.$.lastReadAt": new Date(),
        },
      }
    );

    await Message.updateMany(
      {
        conversation: conversation._id,
        senderType: "PARENT",
        readByStaffAt: null,
      },
      { $set: { readByStaffAt: new Date() } }
    );

    const populated = await Conversation.findById(conversation._id)
      .populate("student", "name grade")
      .lean();

    // Turn the parent's ✓✓ on live.
    publishThreadRead({ conversation: populated, reader: "STAFF" });

    const parentParticipant = (populated.participants || []).find(
      (p) => p.participantType === "PARENT"
    );

    return successResponse(200, "Conversation loaded", {
      conversation: {
        id: String(conversation._id),
        topic: conversation.topic,
        subject: conversation.subject || "",
        routedToLabel: conversation.routedToLabel || "",
        guardianName: parentParticipant?.displayName || "Guardian",
        // Needed so staff can reply to the right person without leaving the
        // thread, and so the UI can offer "view this child".
        child: populated.student
          ? {
              id: String(populated.student._id),
              name: populated.student.name,
              grade: populated.student.grade || "",
            }
          : null,
        isAnnouncement: conversation.originType === "SCHOOL_ANNOUNCEMENT",
        status: conversation.status,
      },
      messages: messages.reverse().map((message) => ({
        id: String(message._id),
        // "mine" from the school's point of view.
        mine: message.senderType === "STAFF",
        senderType: message.senderType,
        senderName: message.senderName || "",
        // Returned so the staff thread shows the announcement exactly as the
        // guardian sees it — a subject visible on one side only is how a school
        // ends up believing it sent something it did not.
        subject: message.subject || "",
        body: message.body || "",
        attachments: message.attachments || [],
        transcript: message.transcript || "",
        createdAt: message.createdAt,
        readByParent: Boolean(message.readByParentAt),
      })),
      pagination: { page, limit, hasOlder: messages.length === limit },
    });
  } catch (err) {
    console.error("GET /api/school/messages/[id] error:", err);
    return internalServerError("Failed to load the conversation");
  }
}

/** Reply to the parent. */
export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const { session, error } = await requireApiSession([
      "SCHOOL_ADMIN",
      "SUPER_ADMIN",
      "TEACHER",
    ]);
    if (error) return error;

    const authorised = await authoriseConversation(session, id);
    if (authorised.error) return authorised.error;

    const { conversation } = authorised;
    const body = await request.json().catch(() => ({}));
    const text = String(body.message || "").trim();

    if (!text) return validationError("Please write a reply");

    const school = await User.findById(conversation.school)
      .select("schoolName name")
      .lean();
    const schoolName = school?.schoolName || school?.name || "School";

    // Replies are attributed to the SCHOOL, not the individual staff member.
    // A parent should not learn which teacher is on the desk today, and staff
    // should not become personally contactable through this channel (§15).
    await appendMessage({
      conversation,
      senderType: "STAFF",
      senderStaff: session.user.id,
      senderStaffModel: session.user.role === "TEACHER" ? "Teacher" : "User",
      senderName: conversation.routedToLabel || schoolName,
      body: text,
    });

    // Fire-and-forget: a notification failure must not fail the reply.
    notifyGuardians({
      studentId: conversation.student,
      category: "MESSAGE",
      priority: "INFO",
      title: `Reply from ${conversation.routedToLabel || schoolName}`,
      message: text.slice(0, 160),
      href: `/parent/messages/${conversation._id}`,
      metadata: { conversationId: String(conversation._id) },
    }).catch((err) =>
      console.error("[school reply] notify failed:", err.message)
    );

    return successResponse(201, "Reply sent", null);
  } catch (err) {
    console.error("POST /api/school/messages/[id] error:", err);
    return internalServerError("Failed to send the reply");
  }
}

/** Close or reopen a thread. */
export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const { session, error } = await requireApiSession([
      "SCHOOL_ADMIN",
      "SUPER_ADMIN",
    ]);
    if (error) return error;

    const authorised = await authoriseConversation(session, id);
    if (authorised.error) return authorised.error;

    const body = await request.json().catch(() => ({}));
    const action = String(body.action || "").toUpperCase();

    if (!["CLOSE", "REOPEN"].includes(action)) {
      return validationError("Unknown action");
    }

    authorised.conversation.status = action === "CLOSE" ? "CLOSED" : "OPEN";
    await authorised.conversation.save();

    return successResponse(200, "Updated", {
      status: authorised.conversation.status,
    });
  } catch (err) {
    console.error("PATCH /api/school/messages/[id] error:", err);
    return internalServerError("Failed to update the conversation");
  }
}
