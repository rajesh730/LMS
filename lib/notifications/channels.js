import { NotificationChannel } from "./NotificationChannel";
import { notifyGuardians } from "@/lib/parentNotifications";
import { sendNoticeEmail } from "@/lib/emailService";
import Conversation from "@/models/Conversation";
import Message from "@/models/Message";
import { appendMessage } from "@/lib/parentMessaging";

/**
 * Concrete delivery channels (§34).
 *
 * Each one is small on purpose: the interesting logic lives in the shared
 * service, and a channel only knows how to reach one kind of destination.
 */

/**
 * In-app notification + the Parent App notice list.
 *
 * The primary channel for V1 (§30) and the only one with no per-message cost.
 * Always applicable, at every priority — an in-app notification is never noise
 * the way an email at 6am is, because the parent chooses when to look.
 */
export class InAppNotificationChannel extends NotificationChannel {
  get key() {
    return "IN_APP";
  }

  isConfigured() {
    return true;
  }

  /**
   * Reachable when the guardian actually has working Pravyo access. A guardian
   * whose card was printed but never activated cannot see an in-app
   * notification, and calling them "reached" would hide them from the offline
   * follow-up list — exactly the family most at risk of missing the notice.
   */
  canReach({ parent, link }) {
    return (
      parent?.accessState === "ACTIVATED" &&
      parent?.status === "ACTIVE" &&
      link?.canReceiveNotices === true
    );
  }

  shouldSendFor() {
    return true;
  }

  async send({ notice, recipients, priority }) {
    try {
      const reachable = recipients.filter((r) => this.canReach(r));
      if (reachable.length === 0) {
        return { channel: this.key, status: "SKIPPED", reason: "No activated guardians", count: 0 };
      }

      // Fan out per student so every notification names the child it concerns
      // — §36 requires a combined inbox to stay unambiguous.
      const byStudent = new Map();
      reachable.forEach((r) => {
        const key = String(r.student._id);
        if (!byStudent.has(key)) byStudent.set(key, r.student);
      });

      await Promise.all(
        Array.from(byStudent.values()).map((student) =>
          notifyGuardians({
            studentId: student._id,
            category: notice.requiresConsent ? "CONSENT" : "NOTICE",
            priority:
              priority === "URGENT"
                ? "URGENT"
                : priority === "IMPORTANT"
                  ? "ACTION"
                  : priority === "POSITIVE"
                    ? "POSITIVE"
                    : "INFO",
            title: notice.title,
            message: String(notice.content || "").slice(0, 200),
            href: `/parent/notices/${notice._id}`,
            metadata: { noticeId: String(notice._id) },
          })
        )
      );

      return { channel: this.key, status: "SENT", count: reachable.length };
    } catch (err) {
      return { channel: this.key, status: "FAILED", reason: err.message };
    }
  }
}

/**
 * Email (§31, §32).
 *
 * OPTIONAL in every sense: guardians may have no email, and email is only a
 * delivery channel — never the source of truth. A notice is not "read" because
 * an email was sent, and this channel never writes `openedAt`.
 *
 * Reuses the existing transport in lib/emailService.js (Zoho SMTP or Resend),
 * so no new provider is introduced.
 */
export class EmailNotificationChannel extends NotificationChannel {
  get key() {
    return "EMAIL";
  }

  isConfigured() {
    return Boolean(
      (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD) ||
        process.env.RESEND_API_KEY
    );
  }

  canReach({ parent, link }) {
    return Boolean(parent?.email) && link?.canReceiveNotices === true;
  }

  /** §32/§35: don't email every minor update. */
  shouldSendFor(priority) {
    return priority === "URGENT" || priority === "IMPORTANT";
  }

  async send({ notice, recipients, schoolName }) {
    if (!this.isConfigured()) {
      return {
        channel: this.key,
        status: "UNAVAILABLE",
        reason: "No email transport configured",
      };
    }

    const reachable = recipients.filter((r) => this.canReach(r));
    if (reachable.length === 0) {
      return { channel: this.key, status: "SKIPPED", reason: "No email addresses", count: 0 };
    }

    let sent = 0;
    let failed = 0;

    // Sequential rather than parallel: a burst of hundreds of concurrent sends
    // trips provider rate limits and gets the domain throttled.
    for (const recipient of reachable) {
      const result = await sendNoticeEmail({
        to: recipient.parent.email,
        guardianName: recipient.parent.name,
        studentName: recipient.student.name,
        schoolName,
        noticeTitle: notice.title,
        noticeBody: notice.content,
        noticeId: String(notice._id),
        requiresAction: Boolean(
          notice.requiresConsent || notice.requiresAcknowledgement
        ),
      });
      if (result?.success) sent += 1;
      else failed += 1;
    }

    return {
      channel: this.key,
      // "QUEUED", not "SENT": handing a message to a transport is not proof of
      // delivery, and §40 forbids claiming delivered/read without real signal.
      status: failed === reachable.length ? "FAILED" : "QUEUED",
      count: sent,
      reason: failed > 0 ? `${failed} could not be sent` : undefined,
    };
  }
}

/**
 * Offline / assisted delivery (§38, §39).
 *
 * Does not transmit anything. It identifies the guardians no digital channel
 * can reach and records them for the school's follow-up list, so a family
 * without a phone is a tracked task rather than a silent gap.
 *
 * This is the channel that makes §69 true — an offline parent is not a failed
 * user, they are a guardian whose delivery path happens to be a person.
 */
export class OfflineDeliveryChannel extends NotificationChannel {
  get key() {
    return "OFFLINE";
  }

  isConfigured() {
    return true;
  }

  /** Applies precisely when nothing else can reach them. */
  canReach({ parent, link }) {
    if (link?.canReceiveNotices !== true) return false;
    const hasApp = parent?.accessState === "ACTIVATED";
    const hasEmail = Boolean(parent?.email);
    return !hasApp && !hasEmail;
  }

  shouldSendFor(priority) {
    return priority === "URGENT" || priority === "IMPORTANT";
  }

  async send({ recipients }) {
    const needing = recipients.filter((r) => this.canReach(r));
    return {
      channel: this.key,
      status: needing.length > 0 ? "QUEUED" : "SKIPPED",
      reason:
        needing.length > 0
          ? "Added to the offline follow-up list"
          : "No offline guardians",
      count: needing.length,
    };
  }
}

/**
 * SMS — INTERFACE ONLY, INTENTIONALLY DISABLED (§33, §61).
 *
 * No provider is installed and none is called. Sparrow, Twilio, Ncell, NTC and
 * WhatsApp Business are all paid dependencies the spec explicitly forbids
 * adding now.
 *
 * This class exists so that enabling SMS later is: implement `send`, flip
 * `isConfigured` to read a real env var, register it in the service. Nothing in
 * the notice routes changes.
 */
export class SmsNotificationChannel extends NotificationChannel {
  get key() {
    return "SMS";
  }

  isConfigured() {
    // Deliberately hard-coded false. When a provider is chosen this becomes a
    // check on its credentials.
    return false;
  }

  canReach({ parent, link }) {
    return Boolean(parent?.phone) && link?.canReceiveNotices === true;
  }

  shouldSendFor(priority) {
    return priority === "URGENT";
  }

  async send() {
    return {
      channel: this.key,
      status: "UNAVAILABLE",
      reason: "SMS is not configured",
    };
  }
}

/**
 * The guardian's message inbox.
 *
 * Parents live in the conversation thread. That is the screen they open, the
 * one with an unread badge, and the one they think of as "the school talking to
 * me" — so a notice published to parents is delivered there as an announcement,
 * with the notice's title as its subject and its content as the body. It reads
 * exactly like a message the school typed, because to a parent that is what it
 * is.
 *
 * This does NOT make a notice into a message. The `Notice` remains the formal
 * record and keeps sole ownership of read receipts, acknowledgement and
 * consent — the Notice Centre is still where those actions are taken, and a
 * notice needing one says so in its body rather than pretending it can be
 * answered by replying in chat. What this channel adds is reach: a notice that
 * only ever appeared in a Notice Centre the parent never opened was, in
 * practice, undelivered.
 *
 * Idempotent by `Message.sourceNotice`. Delivery can legitimately run more than
 * once — the school can press "Deliver" again from the delivery page — and a
 * second run must not put the same announcement in a family's thread twice.
 */
export class ParentInboxChannel extends NotificationChannel {
  get key() {
    return "PARENT_INBOX";
  }

  isConfigured() {
    return true;
  }

  /**
   * Reachable on the notice permission alone — deliberately NOT on
   * `accessState`.
   *
   * A guardian whose card has not been activated yet still gets the thread
   * seeded, so the notice is waiting for them the first time they sign in
   * rather than lost because it was published a day too early.
   */
  canReach({ link }) {
    return link?.canReceiveNotices === true;
  }

  shouldSendFor() {
    return true;
  }

  async send({ notice, recipients, schoolName }) {
    try {
      const reachable = recipients.filter((r) => this.canReach(r));
      if (reachable.length === 0) {
        return {
          channel: this.key,
          status: "SKIPPED",
          reason: "No guardians set to receive notices",
          count: 0,
        };
      }

      // Two bulk reads instead of two per guardian. A whole-school notice
      // touches hundreds of threads, and an N+1 here would be the slowest
      // thing in the product on a 69ms-RTT cluster (§65).
      const studentIds = reachable.map((r) => r.student._id);
      const parentIds = reachable.map((r) => r.parent._id);

      const conversations = await Conversation.find({
        student: { $in: studentIds },
        isDeleted: { $ne: true },
        "participants.parent": { $in: parentIds },
      }).sort({ createdAt: 1 });

      // Key on (parent × student): a guardian has one thread per child, and
      // two children at the same school are two different conversations.
      const threadByPair = new Map();
      conversations.forEach((conversation) => {
        (conversation.participants || [])
          .filter((p) => p.participantType === "PARENT" && p.parent)
          .forEach((p) => {
            const key = `${p.parent}:${conversation.student}`;
            if (!threadByPair.has(key)) threadByPair.set(key, conversation);
          });
      });

      // Keyed on the CONTENT, not just the notice.
      //
      // Re-running delivery for an unchanged notice must post nothing. But an
      // event notice is upserted in place — a cancellation rewrites the same
      // record — and families who were told "this is happening" have to be told
      // it is not. Comparing what was actually said distinguishes the two
      // without needing a second notice per revision.
      const alreadyDelivered = new Set(
        (
          await Message.find({
            sourceNotice: notice._id,
            conversation: { $in: conversations.map((c) => c._id) },
          })
            .select("conversation subject body")
            .lean()
        ).map((m) => JSON.stringify([m.conversation, m.subject, m.body]))
      );

      // A notice that needs a decision cannot be answered by replying here, so
      // it says where to go. Silently accepting a "yes" in chat as consent
      // would be the worst possible outcome of putting notices in the inbox.
      const needsAction =
        notice.requiresAcknowledgement || notice.requiresConsent;
      const body = needsAction
        ? `${notice.content}\n\n— Please open Notices to respond.`
        : notice.content;

      let delivered = 0;

      for (const { parent, student } of reachable) {
        const key = `${parent._id}:${student._id}`;
        let conversation = threadByPair.get(key);

        if (!conversation) {
          conversation = await Conversation.create({
            // From the STUDENT record, never the notice: a platform notice has
            // no school, and a multi-school family must not have one school's
            // thread reused for the other's child (§36).
            school: student.school,
            student: student._id,
            topic: "ADMINISTRATION",
            routedToLabel: schoolName,
            subject: notice.title,
            originType: "SCHOOL_ANNOUNCEMENT",
            participants: [
              {
                participantType: "PARENT",
                parent: parent._id,
                displayName: parent.name,
                lastReadAt: null,
                unreadCount: 0,
              },
              {
                participantType: "STAFF",
                staff: notice.author,
                staffModel: "User",
                displayName: schoolName,
                lastReadAt: new Date(),
                unreadCount: 0,
              },
            ],
          });
          threadByPair.set(key, conversation);
        } else if (
          alreadyDelivered.has(
            JSON.stringify([conversation._id, notice.title, body])
          )
        ) {
          continue;
        }

        await appendMessage({
          conversation,
          senderType: "STAFF",
          senderStaff: notice.author,
          senderStaffModel: "User",
          senderName: schoolName,
          subject: notice.title,
          body,
          sourceNotice: notice._id,
        });
        delivered += 1;
      }

      if (delivered === 0) {
        return {
          channel: this.key,
          status: "SKIPPED",
          reason: "Already in every guardian's inbox",
          count: 0,
        };
      }

      return { channel: this.key, status: "SENT", count: delivered };
    } catch (err) {
      // Never throws: the notice is already published and the other channels
      // must still run.
      return {
        channel: this.key,
        status: "FAILED",
        reason: err.message,
        count: 0,
      };
    }
  }
}
