import connectDB from "@/lib/db";
import Notice from "@/models/Notice";
import NoticeReceipt from "@/models/NoticeReceipt";
import ParentStudentLink from "@/models/ParentStudentLink";
import Parent from "@/models/Parent";
import Student from "@/models/Student";
import User from "@/models/User";
import { getEquivalentGradeValues } from "@/lib/schoolGrades";
import { normalizeNoticePriority } from "./NotificationChannel";
import {
  InAppNotificationChannel,
  ParentInboxChannel,
  EmailNotificationChannel,
  OfflineDeliveryChannel,
  SmsNotificationChannel,
} from "./channels";

/**
 * The publish-once notification service (§24, §34, §70).
 *
 * A school writes ONE `Notice`. This service resolves who it reaches, asks each
 * registered channel whether it applies, and records what was attempted against
 * each guardian's `NoticeReceipt`.
 *
 * Ordering matters: channels run in registration order, and in-app is first so
 * the cheapest, most reliable path is never delayed behind a slow SMTP call.
 */

// Registration order is delivery order.
const CHANNELS = [
  new InAppNotificationChannel(),
  // Second: the inbox is where parents actually look, so it runs before
  // anything that can be slow (SMTP) and before the offline follow-up list is
  // computed. Both it and IN_APP are free and local.
  new ParentInboxChannel(),
  new EmailNotificationChannel(),
  new OfflineDeliveryChannel(),
  new SmsNotificationChannel(), // disabled; present so the shape is exercised
];

export function getChannels() {
  return CHANNELS;
}

/**
 * Which guardians should receive this notice, with their parent + student +
 * link resolved.
 *
 * Written as four bulk queries rather than a per-student loop: a whole-school
 * notice touches hundreds of guardians, and an N+1 here would be the slowest
 * thing in the product on a 69ms-RTT cluster (§65).
 */
export async function resolveNoticeRecipients(notice) {
  await connectDB();

  const studentQuery = {
    isDeleted: { $ne: true },
    status: { $in: ["ACTIVE", "SUSPENDED"] },
  };

  if (notice.scope === "PLATFORM") {
    // Platform notices are not school-scoped; the link's own school still
    // bounds what each guardian sees.
  } else {
    studentQuery.school = notice.school;
  }

  if (Array.isArray(notice.targetStudents) && notice.targetStudents.length > 0) {
    studentQuery._id = { $in: notice.targetStudents };
  } else if (Array.isArray(notice.grades) && notice.grades.length > 0) {
    // Grade data is messy ("9" / "Grade 9" / "Class 9"), so match every
    // equivalent form — an exact match would silently skip whole cohorts.
    const variants = notice.grades.flatMap((grade) =>
      getEquivalentGradeValues(grade)
    );
    studentQuery.grade = { $in: Array.from(new Set(variants)) };
  }

  const students = await Student.find(studentQuery)
    .select("name grade school")
    .lean();

  if (students.length === 0) return [];

  const links = await ParentStudentLink.find({
    student: { $in: students.map((s) => s._id) },
    status: "ACTIVE",
    canReceiveNotices: true,
  })
    .select("parent student school canReceiveNotices canGiveConsent")
    .lean();

  if (links.length === 0) return [];

  const parents = await Parent.find({
    _id: { $in: Array.from(new Set(links.map((l) => String(l.parent)))) },
    isDeleted: { $ne: true },
    status: "ACTIVE",
  })
    .select("name email phone accessState status isHousehold householdName")
    .lean();

  const parentById = new Map(parents.map((p) => [String(p._id), p]));
  const studentById = new Map(students.map((s) => [String(s._id), s]));

  return links
    .map((link) => {
      const parent = parentById.get(String(link.parent));
      const student = studentById.get(String(link.student));
      if (!parent || !student) return null;
      return { parent, student, link };
    })
    .filter(Boolean);
}

/**
 * Publish a notice across every applicable channel.
 *
 * Returns a per-channel summary the school UI renders directly (§37). Nothing
 * here throws: a channel failure is reported, never propagated, so publishing
 * always succeeds even if email is down.
 */
export async function publishNotice(noticeId) {
  await connectDB();

  const notice = await Notice.findById(noticeId).lean();
  if (!notice) return { ok: false, reason: "Notice not found" };

  const priority = normalizeNoticePriority(notice);
  const recipients = await resolveNoticeRecipients(notice);

  if (recipients.length === 0) {
    return { ok: true, priority, recipients: 0, results: [] };
  }

  const school = notice.school
    ? await User.findById(notice.school).select("schoolName name").lean()
    : null;
  const schoolName = school?.schoolName || school?.name || "Your school";

  // Create the delivery rows FIRST. A receipt marks the notice as delivered to
  // that guardian; `openedAt` stays null, because delivering is not reading
  // (§27) — that distinction is the whole point of the receipt model.
  await NoticeReceipt.bulkWrite(
    recipients.map(({ parent, student }) => ({
      updateOne: {
        filter: { notice: notice._id, parent: parent._id, student: student._id },
        update: {
          $setOnInsert: {
            notice: notice._id,
            parent: parent._id,
            student: student._id,
            school: student.school,
            deliveredAt: new Date(),
          },
        },
        upsert: true,
      },
    })),
    { ordered: false }
  );

  const results = [];

  for (const channel of CHANNELS) {
    if (!channel.isConfigured()) {
      results.push({
        channel: channel.key,
        status: "UNAVAILABLE",
        reason: "Not configured",
        count: 0,
      });
      continue;
    }

    if (!channel.shouldSendFor(priority)) {
      results.push({
        channel: channel.key,
        status: "SKIPPED",
        reason: `Not used for ${priority.toLowerCase()} notices`,
        count: 0,
      });
      continue;
    }

    const result = await channel.send({
      notice,
      recipients,
      priority,
      schoolName,
    });
    results.push(result);

    // Record what each channel actually attempted, per guardian, so the
    // school's delivery view reflects reality rather than intent (§40).
    if (["SENT", "QUEUED"].includes(result.status)) {
      const handled = recipients.filter((r) => channel.canReach(r));
      if (handled.length > 0) {
        await NoticeReceipt.bulkWrite(
          handled.map(({ parent, student }) => ({
            updateOne: {
              filter: {
                notice: notice._id,
                parent: parent._id,
                student: student._id,
              },
              update: {
                $push: {
                  deliveries: {
                    channel: channel.key,
                    status: result.status,
                    attemptedAt: new Date(),
                  },
                },
              },
            },
          })),
          { ordered: false }
        );
      }
    }
  }

  // Stamped after the channels have run, so `publishNoticeToParents` can tell
  // an already-delivered notice from a new one and never sends it twice.
  await Notice.updateOne(
    { _id: notice._id },
    { $set: { parentsNotifiedAt: new Date() } }
  );

  return { ok: true, priority, recipients: recipients.length, results };
}

/**
 * Deliver a notice to guardians ONCE, on publish.
 *
 * Called from the notice create/update routes so that choosing "Students and
 * parents" actually reaches parents. Before this, setting the parents flag only
 * made a notice *visible* in the Parent App's Notice Centre — a guardian who did
 * not happen to browse there was never told, which is not what a school means
 * by publishing.
 *
 * Skips silently when:
 *   - the notice is not published, or does not target parents;
 *   - it has already been delivered (`parentsNotifiedAt`), which is what stops
 *     an edit — or the delivery page's own button — sending it a second time.
 *
 * Never throws. Delivery is a side effect of publishing; a notification failure
 * must not fail the notice the school just wrote.
 */
export async function publishNoticeToParents(noticeId) {
  try {
    await connectDB();

    const notice = await Notice.findById(noticeId)
      .select("status targetAudience parentsNotifiedAt isDeleted")
      .lean();

    if (!notice) return { ok: false, reason: "Notice not found" };
    if (notice.isDeleted) return { ok: false, reason: "Notice is archived" };
    if (notice.status !== "PUBLISHED") {
      return { ok: false, reason: "Not published" };
    }
    if (!notice.targetAudience?.parents) {
      return { ok: false, reason: "Not addressed to parents" };
    }
    if (notice.parentsNotifiedAt) {
      return { ok: false, reason: "Already delivered" };
    }

    return await publishNotice(noticeId);
  } catch (err) {
    console.error("[notifications] publishNoticeToParents failed:", err.message);
    return { ok: false, reason: err.message };
  }
}

/**
 * Guardian reachability for the school UI (§36).
 *
 * The important nuance: a guardian is NOT "unreachable" merely because they
 * have no email or phone. If they have activated Pravyo access, they are
 * connected — that is the entire premise of the Parent Access Card.
 */
export function describeReachability(parent, link) {
  if (link?.canReceiveNotices !== true) {
    return {
      key: "NO_NOTICES",
      emoji: "⚪",
      label: "Not receiving notices",
      hint: "The school has not enabled notices for this guardian.",
    };
  }

  if (parent?.accessState === "ACTIVATED") {
    return {
      key: "CONNECTED",
      emoji: "🟢",
      label: "Connected to Pravyo",
      hint: "Receives notices in the app.",
    };
  }

  if (parent?.email) {
    return {
      key: "EMAIL",
      emoji: "🔵",
      label: "Email available",
      hint: "Not using the app yet; can be emailed.",
    };
  }

  if (parent?.phone) {
    return {
      key: "PHONE",
      emoji: "🟡",
      label: "Phone available",
      hint: "SMS is not configured yet, so this is for calling.",
    };
  }

  return {
    key: "OFFLINE",
    emoji: "⚪",
    label: "Offline / assisted",
    hint: "Needs a printed notice or a call from the school.",
  };
}
