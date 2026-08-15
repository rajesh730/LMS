/**
 * The delivery-channel contract (§34).
 *
 * One rule motivates this whole abstraction: **a school publishes once**
 * (§24, §70). Staff must never retype the same message into Pravyo, then an
 * email tool, then a paper notice. A single `Notice` record is the source of
 * truth, and channels are how that one record reaches families through
 * whatever path each family can actually use.
 *
 * The second motivation is §33: SMS must be addable later WITHOUT rewriting
 * notice routes. Every channel behind this interface means enabling SMS is a
 * new file plus a config flag, not a change to how notices work.
 *
 * A channel must never throw. Delivery is best-effort by design — a failing
 * email transport must not prevent the in-app notice, and must not fail the
 * school's publish action. Errors are returned as data.
 */

/**
 * @typedef {object} DeliveryResult
 * @property {string}  channel     Channel key, e.g. "IN_APP".
 * @property {"SENT"|"QUEUED"|"SKIPPED"|"FAILED"|"UNAVAILABLE"} status
 * @property {string}  [reason]    Why it was skipped or failed. Never a secret.
 * @property {number}  [count]     Recipients handled.
 */

export class NotificationChannel {
  /** Stable key stored on delivery records. */
  get key() {
    throw new Error("NotificationChannel subclasses must define a key");
  }

  /**
   * Is this channel usable at all right now?
   *
   * Distinct from `canReach`: a channel can be configured but unable to reach a
   * particular guardian (no email address), or reachable in principle but not
   * configured (SMS). Keeping the two separate is what lets the school UI say
   * "SMS not configured" rather than "guardian unreachable" (§36).
   */
  isConfigured() {
    return false;
  }

  /**
   * Can this channel reach THIS guardian?
   * @param {object} recipient - { parent, link, student }
   */
  canReach() {
    return false;
  }

  /**
   * Should this channel be used for a notice of this priority (§35)?
   * Default: only urgent and important traffic escalates beyond in-app.
   */
  shouldSendFor(priority) {
    return priority === "URGENT" || priority === "IMPORTANT";
  }

  /**
   * Deliver to a batch of recipients.
   * MUST resolve — never reject.
   * @returns {Promise<DeliveryResult>}
   */
  async send() {
    return {
      channel: this.key,
      status: "UNAVAILABLE",
      reason: "Channel not implemented",
    };
  }
}

/**
 * Notice priorities (§26), ordered most to least urgent.
 * Mapped from `Notice.priority` / `Notice.type` by lib/notifications/service.
 */
export const NOTICE_PRIORITIES = ["URGENT", "IMPORTANT", "GENERAL", "POSITIVE"];

export function normalizeNoticePriority(notice) {
  if (!notice) return "GENERAL";

  if (notice.priority === "URGENT" || notice.type === "URGENT") return "URGENT";
  if (notice.requiresConsent || notice.requiresAcknowledgement) {
    return "IMPORTANT";
  }
  if (notice.priority === "HIGH") return "IMPORTANT";
  if (notice.type === "SHOWCASE") return "POSITIVE";

  return "GENERAL";
}
