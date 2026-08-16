import connectDB from "@/lib/db";
import Conversation from "@/models/Conversation";
import "@/models/Parent";
import "@/models/Student";
import {
  successResponse,
  internalServerError,
} from "@/lib/apiResponse";
import { requireApiSession, getSessionSchoolId } from "@/lib/authz";
import { parsePagination, buildPagination, escapeRegex } from "@/lib/pagination";
import { TOPIC_CATALOGUE } from "@/lib/parentMessaging";
import { mergeDuplicateConversations } from "@/lib/mergeConversations";

export const dynamic = "force-dynamic";

/**
 * The staff inbox — conversations between this school and its parents.
 *
 * Without this the messaging feature is one-way: guardians can write and reply,
 * and nobody at the school can read it. That is worse than having no messaging
 * at all, because a parent who sends a question and gets silence stops trusting
 * the channel.
 *
 * Scoped to the caller's school. Teachers see the same inbox as admins for now
 * — the routing config decides who a topic is addressed to, but a small school
 * office is usually one or two people sharing the work, and hiding a parent's
 * message from the person at the desk helps nobody. When schools ask for
 * per-teacher inboxes, filter on `participants.staff` here.
 */
export async function GET(request) {
  try {
    const { session, error } = await requireApiSession([
      "SCHOOL_ADMIN",
      "SUPER_ADMIN",
      "TEACHER",
    ]);
    if (error) return error;

    await connectDB();

    const { searchParams } = new URL(request.url);
    const schoolId = getSessionSchoolId(session);
    const filter = String(searchParams.get("filter") || "ALL").toUpperCase();
    const topic = String(searchParams.get("topic") || "").toUpperCase();
    const search = String(searchParams.get("search") || "").trim();

    const { page, limit, skip } = parsePagination(searchParams, {
      limit: 25,
      maxLimit: 100,
    });

    // Fold together any threads left over from when topic was part of a
    // conversation's identity, so one guardian never occupies several rows for
    // the same child. Cheap when there is nothing to do.
    await mergeDuplicateConversations(schoolId);

    const query = {
      school: schoolId,
      isDeleted: { $ne: true },
    };

    if (TOPIC_CATALOGUE.some((entry) => entry.topic === topic)) {
      query.topic = topic;
    }

    if (filter === "UNREAD") {
      // A thread needing a reply is one where a STAFF participant still has an
      // unread count — that is the school's own to-do list.
      query.participants = {
        $elemMatch: { participantType: "STAFF", unreadCount: { $gt: 0 } },
      };
    } else if (filter === "PARENT_STARTED") {
      query.originType = "PARENT_INITIATED";
    } else if (filter === "ANNOUNCEMENTS") {
      query.originType = "SCHOOL_ANNOUNCEMENT";
    }

    const [total, conversations] = await Promise.all([
      Conversation.countDocuments(query),
      Conversation.find(query)
        .sort({ lastMessageAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("student", "name grade")
        .select(
          "topic routedToLabel subject lastMessageAt lastMessagePreview lastMessageSenderType participants originType status student"
        )
        .lean(),
    ]);

    // Search is applied after loading because the useful fields — the parent's
    // name and the child's name — live on populated documents rather than on
    // the conversation itself. Bounded by the page size, so it stays cheap.
    const filtered = search
      ? conversations.filter((conversation) => {
          const pattern = new RegExp(escapeRegex(search), "i");
          const parentName =
            (conversation.participants || []).find(
              (p) => p.participantType === "PARENT"
            )?.displayName || "";
          return (
            pattern.test(parentName) ||
            pattern.test(conversation.student?.name || "") ||
            pattern.test(conversation.lastMessagePreview || "")
          );
        })
      : conversations;

    return successResponse(200, "Inbox loaded", {
      conversations: filtered.map((conversation) => {
        const parentParticipant = (conversation.participants || []).find(
          (p) => p.participantType === "PARENT"
        );
        const staffParticipant = (conversation.participants || []).find(
          (p) => p.participantType === "STAFF"
        );
        const catalogue = TOPIC_CATALOGUE.find(
          (entry) => entry.topic === conversation.topic
        );

        return {
          id: String(conversation._id),
          topic: conversation.topic,
          emoji: catalogue?.emoji || "💬",
          topicLabel: catalogue?.defaultLabel || "Other",
          routedToLabel: conversation.routedToLabel || "",
          // Whose message this is about, and about which child.
          guardianName: parentParticipant?.displayName || "Guardian",
          child: conversation.student
            ? {
                id: String(conversation.student._id),
                name: conversation.student.name,
                grade: conversation.student.grade || "",
              }
            : null,
          subject: conversation.subject || "",
          preview: conversation.lastMessagePreview || "",
          lastMessageAt: conversation.lastMessageAt,
          lastMessageSenderType: conversation.lastMessageSenderType || "",
          // Drives the "needs a reply" badge.
          unreadCount: staffParticipant?.unreadCount || 0,
          isAnnouncement: conversation.originType === "SCHOOL_ANNOUNCEMENT",
          status: conversation.status,
        };
      }),
      pagination: buildPagination({ page, limit, total }),
      topics: TOPIC_CATALOGUE,
    });
  } catch (err) {
    console.error("GET /api/school/messages error:", err);
    return internalServerError("Failed to load the inbox");
  }
}
