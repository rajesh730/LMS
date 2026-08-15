import connectDB from "@/lib/db";
import Notice from "@/models/Notice";
import NoticeReceipt from "@/models/NoticeReceipt";
import Achievement from "@/models/Achievement";
import SchoolMagazineArticle from "@/models/SchoolMagazineArticle";
import ParticipationRequest from "@/models/ParticipationRequest";
import Event from "@/models/Event";
import Conversation from "@/models/Conversation";
import "@/models/Student";
import { buildNoticeQuery } from "@/lib/parentNotices";
import { noticeStatus } from "@/lib/parentStatus";
import { gradeListContains } from "@/lib/schoolGrades";

/**
 * Parent Home composition (§3, §30).
 *
 * Home answers exactly one question: **what is happening with my child today?**
 * It is a priority queue, not a feed and not a dashboard.
 *
 * Two rules drive everything here:
 *
 *  1. Sort by PRIORITY, then recency — never by date alone (§30). A permission
 *     slip that closes tonight outranks an achievement from this morning, no
 *     matter which arrived last.
 *
 *  2. No category may flood Home. Each type has a hard cap (CATEGORY_CAPS), so
 *     a school publishing nine notices at once cannot bury the child's new
 *     article. The full list always remains one tap away in its own tab.
 */

// §30's ordering, lowest number = highest priority.
const PRIORITY = {
  ACTION_REQUIRED: 1,
  LIVE_EVENT: 2,
  CONSENT_REQUIRED: 3,
  UNREAD_MESSAGE: 4,
  UNREAD_NOTICE: 5,
  REGISTRATION_OPEN: 6,
  ACHIEVEMENT: 7,
  NEW_WRITING: 8,
  GENERAL: 9,
};

// How many cards of each kind may appear on Home at once.
const CATEGORY_CAPS = {
  ACTION_REQUIRED: 3,
  LIVE_EVENT: 2,
  CONSENT_REQUIRED: 3,
  UNREAD_MESSAGE: 2,
  UNREAD_NOTICE: 3,
  REGISTRATION_OPEN: 2,
  ACHIEVEMENT: 2,
  NEW_WRITING: 2,
  GENERAL: 2,
};

// Simple Mode shows fewer, larger cards (§8) — same information, less to scan.
const SIMPLE_MODE_TOTAL = 5;
const STANDARD_TOTAL = 12;

// "New" for the celebratory cards. Older achievements still live on the
// Journey; Home is about what changed recently.
const RECENT_WINDOW_DAYS = 14;

function daysAgo(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

/**
 * Build the Home card list for ONE child.
 *
 * `student` and `parentId` must already be authorised by lib/parentAccess.js.
 * Every query below is scoped to `student.school` — the child's CURRENT school,
 * resolved server-side — which is what guarantees a parent with children at two
 * schools never sees one school's content under the other child (§36).
 */
export async function buildParentHome({ parent, student, link, simpleMode = false }) {
  await connectDB();

  const now = new Date();
  const recentSince = daysAgo(RECENT_WINDOW_DAYS);

  const [
    notices,
    achievements,
    writings,
    registrations,
    conversations,
  ] = await Promise.all([
    Notice.find(buildNoticeQuery(student))
      .sort({ publishedAt: -1 })
      // Bounded: Home never needs more than a handful, and the Notices tab
      // paginates the rest.
      .limit(25)
      .select(
        "title content type priority publishedAt requiresAcknowledgement requiresConsent actionDeadline"
      )
      .lean(),

    Achievement.find({
      student: student._id,
      awardedAt: { $gte: recentSince },
    })
      .sort({ awardedAt: -1 })
      .limit(5)
      .select("title placement awardedAt event certificateCode certificateUrl")
      .populate("event", "title")
      .lean(),

    SchoolMagazineArticle.find({
      authorStudent: student._id,
      isDeleted: { $ne: true },
      $or: [{ isPublished: true }, { status: "APPROVED" }],
      publishedAt: { $gte: recentSince },
    })
      .sort({ publishedAt: -1 })
      .limit(5)
      .select({ title: 1, category: 1, publishedAt: 1 })
      .lean(),

    ParticipationRequest.find({ student: student._id })
      .select("event status enrollmentConfirmedAt")
      .lean(),

    // Only threads this guardian is actually in — never another guardian's
    // conversation with the school (§19).
    Conversation.find({
      student: student._id,
      isDeleted: { $ne: true },
      "participants.parent": parent._id,
    })
      .sort({ lastMessageAt: -1 })
      .limit(10)
      .select(
        "topic routedToLabel lastMessageAt lastMessagePreview lastMessageSenderType participants"
      )
      .lean(),
  ]);

  const registrationByEvent = new Map(
    registrations.map((r) => [String(r.event), r])
  );

  // Events the child could join or is currently in. Restricted to the child's
  // school plus platform-wide events their grade is eligible for.
  const events = await Event.find({
    lifecycleStatus: "ACTIVE",
    status: "APPROVED",
    $or: [{ school: student.school }, { eventScope: "PLATFORM", visibility: "PUBLIC" }],
  })
    .sort({ date: 1 })
    .limit(25)
    .select(
      "title date eventType eventScope registrationDeadline eligibleGrades school lifecycleStatus"
    )
    .lean();

  const cards = [];

  // --- Notices: action-required, consent, and unread ----------------------
  const noticeIds = notices.map((n) => n._id);
  const receipts = noticeIds.length
    ? await NoticeReceipt.find({
        notice: { $in: noticeIds },
        parent: parent._id,
        student: student._id,
      })
        .select("notice openedAt acknowledgedAt consentDecision")
        .lean()
    : [];
  const receiptByNotice = new Map(receipts.map((r) => [String(r.notice), r]));

  notices.forEach((notice) => {
    const receipt = receiptByNotice.get(String(notice._id));
    const status = noticeStatus(notice, receipt);

    // A consent request is its own card type so it can be answered inline.
    if (notice.requiresConsent && receipt?.consentDecision !== "YES" && receipt?.consentDecision !== "NO") {
      cards.push({
        id: `consent:${notice._id}`,
        kind: "CONSENT_REQUIRED",
        priority: PRIORITY.CONSENT_REQUIRED,
        status: "ACTION_REQUIRED",
        emoji: "📝",
        title: notice.title,
        body: String(notice.content || "").slice(0, 160),
        deadline: notice.actionDeadline || null,
        href: `/parent/notices/${notice._id}`,
        cta: "home.open",
        occurredAt: notice.publishedAt,
      });
      return;
    }

    if (status.key === "ACTION_REQUIRED") {
      cards.push({
        id: `notice:${notice._id}`,
        kind: "ACTION_REQUIRED",
        priority: PRIORITY.ACTION_REQUIRED,
        status: "ACTION_REQUIRED",
        emoji: "📣",
        title: notice.title,
        body: String(notice.content || "").slice(0, 160),
        deadline: notice.actionDeadline || null,
        href: `/parent/notices/${notice._id}`,
        cta: "home.open",
        occurredAt: notice.publishedAt,
      });
      return;
    }

    if (status.key === "NEEDS_ATTENTION") {
      cards.push({
        id: `notice:${notice._id}`,
        kind: "UNREAD_NOTICE",
        priority: PRIORITY.UNREAD_NOTICE,
        status: "NEEDS_ATTENTION",
        emoji: "📄",
        title: notice.title,
        body: String(notice.content || "").slice(0, 160),
        href: `/parent/notices/${notice._id}`,
        cta: "home.open",
        occurredAt: notice.publishedAt,
      });
    }
  });

  // --- Events: live now, and open registrations ---------------------------
  events.forEach((event) => {
    if (!gradeListContains(event.eligibleGrades, student.grade)) return;

    const registration = registrationByEvent.get(String(event._id));
    const isRegistered =
      registration &&
      ["APPROVED", "ENROLLED"].includes(registration.status);

    if (isEventLive(event, now) && isRegistered) {
      cards.push({
        id: `live:${event._id}`,
        kind: "LIVE_EVENT",
        priority: PRIORITY.LIVE_EVENT,
        status: "ACTION_REQUIRED",
        emoji: "🔴",
        title: event.title,
        bodyKey: "home.participating",
        bodyParams: { name: student.name },
        href: `/parent/events?event=${event._id}`,
        cta: "home.viewEvent",
        occurredAt: event.date,
        live: true,
      });
      return;
    }

    const deadline = event.registrationDeadline
      ? new Date(event.registrationDeadline)
      : null;
    const registrationOpen = deadline ? deadline > now : new Date(event.date) > now;

    if (registrationOpen && !registration) {
      // Only surfaced as an opportunity if this guardian may act on it —
      // dangling a "Register Now" button in front of a guardian the school has
      // not authorised to register would be a dead end (§20).
      if (!link?.canRegisterEvents) return;

      const closingSoon =
        deadline && (deadline - now) / (1000 * 60 * 60) <= 48;

      cards.push({
        id: `registration:${event._id}`,
        kind: "REGISTRATION_OPEN",
        priority: closingSoon
          ? PRIORITY.ACTION_REQUIRED
          : PRIORITY.REGISTRATION_OPEN,
        status: closingSoon ? "ACTION_REQUIRED" : "NEEDS_ATTENTION",
        emoji: "🗓️",
        title: event.title,
        deadline: deadline,
        href: `/parent/events?event=${event._id}`,
        cta: "home.registerNow",
        occurredAt: event.date,
      });
    }
  });

  // --- Unread messages ----------------------------------------------------
  conversations.forEach((conversation) => {
    const me = (conversation.participants || []).find(
      (p) => p.participantType === "PARENT" && String(p.parent) === String(parent._id)
    );
    if (!me || (me.unreadCount || 0) === 0) return;

    cards.push({
      id: `conversation:${conversation._id}`,
      kind: "UNREAD_MESSAGE",
      priority: PRIORITY.UNREAD_MESSAGE,
      status: "NEEDS_ATTENTION",
      emoji: "💬",
      title: conversation.routedToLabel || "School",
      body: conversation.lastMessagePreview || "",
      href: `/parent/messages/${conversation._id}`,
      cta: "home.openConversation",
      occurredAt: conversation.lastMessageAt,
      unreadCount: me.unreadCount,
    });
  });

  // --- Achievements (celebratory) -----------------------------------------
  achievements.forEach((achievement) => {
    cards.push({
      id: `achievement:${achievement._id}`,
      kind: "ACHIEVEMENT",
      priority: PRIORITY.ACHIEVEMENT,
      status: "COMPLETE",
      emoji: "🏆",
      title: achievement.title,
      body: achievement.event?.title || "",
      href: `/parent/child?tab=achievements`,
      cta: "home.see",
      occurredAt: achievement.awardedAt,
      verified: Boolean(achievement.certificateCode),
    });
  });

  // --- New writing --------------------------------------------------------
  writings.forEach((writing) => {
    cards.push({
      id: `writing:${writing._id}`,
      kind: "NEW_WRITING",
      priority: PRIORITY.NEW_WRITING,
      status: "INFO",
      emoji: "✍️",
      titleKey: "home.publishedBy",
      titleParams: { name: student.name },
      title: writing.title,
      href: `/parent/child?tab=writing&item=${writing._id}`,
      cta: "home.read",
      // Drives the "Listen" button — the text-to-speech target (§7).
      listenable: true,
      occurredAt: writing.publishedAt,
    });
  });

  return {
    cards: prioritiseCards(cards, { simpleMode }),
    generatedAt: now,
  };
}

/**
 * An event counts as live on its scheduled day while still ACTIVE.
 *
 * Event has no start/end time fields — only a `date` — so "live" is
 * day-granular. Deliberately not inferred more precisely than the data
 * supports; a false "LIVE NOW" is worse than a coarse one.
 */
export function isEventLive(event, now = new Date()) {
  if (!event?.date) return false;
  if (event.lifecycleStatus !== "ACTIVE") return false;

  const eventDay = new Date(event.date);
  return (
    eventDay.getFullYear() === now.getFullYear() &&
    eventDay.getMonth() === now.getMonth() &&
    eventDay.getDate() === now.getDate()
  );
}

/**
 * Apply §30's priority order and the per-category caps.
 *
 * Exported so it can be tested directly — the ordering rule is the part of
 * Home most likely to be broken by a future edit, and it is pure.
 */
export function prioritiseCards(cards, { simpleMode = false } = {}) {
  const sorted = [...cards].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    // Within a priority band, newest first.
    const at = a.occurredAt ? new Date(a.occurredAt).getTime() : 0;
    const bt = b.occurredAt ? new Date(b.occurredAt).getTime() : 0;
    return bt - at;
  });

  const seen = new Map();
  const capped = [];

  for (const card of sorted) {
    const used = seen.get(card.kind) || 0;
    const cap = CATEGORY_CAPS[card.kind] ?? 2;
    if (used >= cap) continue;
    seen.set(card.kind, used + 1);
    capped.push(card);
  }

  const total = simpleMode ? SIMPLE_MODE_TOTAL : STANDARD_TOTAL;
  return capped.slice(0, total);
}

export const HOME_PRIORITY = PRIORITY;
export const HOME_CATEGORY_CAPS = CATEGORY_CAPS;
