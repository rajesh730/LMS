import Notice from "@/models/Notice";
import { normalizeGradeValue } from "@/lib/schoolGrades";
import { publishNoticeToParents } from "@/lib/notifications/service";

/**
 * The Notice that announces an event.
 *
 * An event is not itself a communication — it is a thing on a calendar. This
 * turns it into one: a single `Notice`, keyed on (school × event), that both
 * students and guardians receive. Keeping it as a Notice rather than inventing
 * a parallel event-announcement path is what earns the whole delivery stack for
 * free — the Parent App notice centre, the in-app bell, read receipts, and the
 * guardian's message inbox all already know how to carry a Notice.
 *
 * Upserted, never duplicated: re-approving or re-saving an event updates the
 * one announcement instead of stacking another on top of it.
 *
 * **Guardians are included deliberately.** This used to be students-only, which
 * meant a school could publish a sports day and no parent was ever told — the
 * one audience that has to arrange the travel, the kit and the day off work.
 */

function eventIdFor(event) {
  return event ? event._id || event.id || event : null;
}

export async function ensureEventNotice({
  event,
  schoolId,
  authorId,
  title,
  content,
  // Set when the announcement has MATERIALLY changed — a cancellation, not a
  // re-save. Clears the delivery stamp so guardians are told again; without it
  // a cancelled event would silently keep its original "this is happening"
  // message in every family's inbox.
  announceAgain = false,
} = {}) {
  const eventId = eventIdFor(event);
  const targetSchoolId = schoolId || event?.school || null;

  if (!eventId || !targetSchoolId || !authorId) {
    return null;
  }

  if (event?.status && event.status !== "APPROVED") {
    return null;
  }

  // An event restricted to certain grades must only reach those families.
  // Empty means everyone, matching how Notice.grades already behaves.
  const grades = Array.isArray(event?.eligibleGrades)
    ? event.eligibleGrades.map(normalizeGradeValue).filter(Boolean)
    : [];

  const notice = await Notice.findOneAndUpdate(
    {
      scope: "SCHOOL",
      school: targetSchoolId,
      event: eventId,
      type: "EVENT",
      isDeleted: { $ne: true },
    },
    {
      $set: {
        title: title || `New event: ${event.title || "Event"}`,
        content:
          content ||
          "Your school has published a new event. Open Events for the details.",
        priority: "NORMAL",
        status: "PUBLISHED",
        visibility: "PRIVATE",
        isActive: true,
        grades,
        publishedAt: new Date(),
        // In `$set`, not `$setOnInsert`: event notices created before guardians
        // were an audience must start reaching them too, rather than staying
        // students-only forever because they happen to already exist.
        targetAudience: {
          students: true,
          teachers: false,
          parents: true,
        },
        ...(announceAgain ? { parentsNotifiedAt: null } : {}),
      },
      $setOnInsert: {
        scope: "SCHOOL",
        school: targetSchoolId,
        author: authorId,
        event: eventId,
        type: "EVENT",
        attachments: [],
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );

  // Deliver to guardians: bell, notice centre, and the message inbox. Guarded
  // by `parentsNotifiedAt`, so re-saving an event does not re-announce it.
  // Fire-and-forget — the event is already saved and a delivery failure must
  // not fail the school's action.
  if (notice?._id) {
    publishNoticeToParents(notice._id).catch((err) =>
      console.error("[eventNotices] parent delivery failed:", err.message)
    );
  }

  return notice;
}
