import connectDB from "@/lib/db";
import Conversation from "@/models/Conversation";
import Message from "@/models/Message";

/**
 * Merge threads that were split by topic back into one per guardian per child.
 *
 * Conversations used to be keyed on (student, school, parent, **topic**), and
 * school announcements were keyed on originType, so one guardian could occupy
 * several rows of the school's inbox for the same child — the same name
 * repeating with no way to tell why.
 *
 * The rule now: ONE thread per guardian per child. This folds the existing
 * duplicates together so schools do not have to live with the old mess.
 *
 * Runs on every inbox load rather than once. When there is nothing to merge it
 * costs a single indexed read, and a correctness repair should not depend on a
 * flag that might be set prematurely.
 *
 * Never throws — the inbox must still render.
 */
export async function mergeDuplicateConversations(schoolId) {
  try {
    await connectDB();

    const conversations = await Conversation.find({
      school: schoolId,
      isDeleted: { $ne: true },
    })
      .sort({ createdAt: 1 })
      .lean();

    if (conversations.length < 2) return { merged: 0 };

    // Group by (student, parent). A conversation with no parent participant is
    // malformed and is left alone rather than guessed at.
    const groups = new Map();
    conversations.forEach((conversation) => {
      const parentId = (conversation.participants || []).find(
        (p) => p.participantType === "PARENT" && p.parent
      )?.parent;
      if (!parentId || !conversation.student) return;

      const key = `${conversation.student}:${parentId}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(conversation);
    });

    let merged = 0;

    for (const [, rows] of groups) {
      if (rows.length < 2) continue;

      // Oldest wins — it holds the earliest history, and keeping it stable
      // means a link to that thread never breaks.
      const [canonical, ...duplicates] = rows;
      const duplicateIds = duplicates.map((row) => row._id);

      // Move every message across BEFORE retiring the duplicates, so a failure
      // half way leaves messages reachable rather than orphaned.
      await Message.updateMany(
        { conversation: { $in: duplicateIds } },
        { $set: { conversation: canonical._id } }
      );

      // Rebuild the preview from whatever is now genuinely newest.
      const newest = await Message.findOne({
        conversation: canonical._id,
        isDeleted: { $ne: true },
      })
        .sort({ createdAt: -1 })
        .select("subject body attachments senderType createdAt")
        .lean();

      // The label follows the most recently active thread — that is what the
      // parent last asked about.
      const mostRecent = rows.reduce((latest, row) =>
        new Date(row.lastMessageAt || 0) > new Date(latest.lastMessageAt || 0)
          ? row
          : latest
      );

      // Unread counts add up: two threads each showing 1 unread were 2 messages
      // the school had not read.
      const totalUnread = rows.reduce((sum, row) => {
        const staff = (row.participants || []).find(
          (p) => p.participantType === "STAFF"
        );
        return sum + (staff?.unreadCount || 0);
      }, 0);
      const totalParentUnread = rows.reduce((sum, row) => {
        const parentSide = (row.participants || []).find(
          (p) => p.participantType === "PARENT"
        );
        return sum + (parentSide?.unreadCount || 0);
      }, 0);

      const participants = (canonical.participants || []).map((p) => {
        if (p.participantType === "STAFF") {
          return { ...p, unreadCount: totalUnread };
        }
        if (p.participantType === "PARENT") {
          return { ...p, unreadCount: totalParentUnread };
        }
        return p;
      });

      await Conversation.updateOne(
        { _id: canonical._id },
        {
          $set: {
            participants,
            topic: mostRecent.topic || canonical.topic,
            routedToLabel: mostRecent.routedToLabel || canonical.routedToLabel,
            lastMessageAt: newest?.createdAt || canonical.lastMessageAt,
            lastMessagePreview: newest
              ? previewOf(newest)
              : canonical.lastMessagePreview,
            // The denormalised headline follows the newest message that HAS
            // one. A parent reply carries no subject, and letting it blank the
            // field would strip the announcement's heading off the inbox row.
            subject: newest?.subject || canonical.subject,
            lastMessageSenderType:
              newest?.senderType === "SYSTEM"
                ? "STAFF"
                : newest?.senderType || canonical.lastMessageSenderType,
            // A merged thread is a real two-way conversation, whichever side
            // happened to start the oldest of its parts.
            originType:
              rows.some((row) => row.originType === "PARENT_INITIATED")
                ? "PARENT_INITIATED"
                : canonical.originType,
            status: "OPEN",
          },
        }
      );

      // Soft delete: the rows disappear from every query but the history is
      // still there if a merge ever needs auditing.
      await Conversation.updateMany(
        { _id: { $in: duplicateIds } },
        { $set: { isDeleted: true } }
      );

      merged += duplicates.length;
    }

    if (merged > 0) {
      console.warn(
        `[mergeConversations] folded ${merged} duplicate thread(s) into their guardian's single conversation`
      );
    }

    return { merged };
  } catch (err) {
    console.error("[mergeConversations] failed:", err.message);
    return { merged: 0, error: true };
  }
}

function previewOf(message) {
  const body = String(message.body || "").trim();
  if (body) return body.slice(0, 160);

  const attachment = (message.attachments || [])[0];
  if (!attachment) return "";
  if (attachment.kind === "VOICE") return "🎤 Voice message";
  if (attachment.kind === "IMAGE") return "📷 Photo";
  return "📎 Document";
}
