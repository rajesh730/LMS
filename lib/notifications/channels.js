import { NotificationChannel } from "./NotificationChannel";
import { notifyGuardians } from "@/lib/parentNotifications";
import { sendNoticeEmail } from "@/lib/emailService";

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
