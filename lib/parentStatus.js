/**
 * The Red / Yellow / Green status system for the Parent App (§4).
 *
 * One hard rule, enforced by the shape of this module: meaning is NEVER carried
 * by colour alone. Every status is a triple — colour, icon, and a text label —
 * and the UI components take the whole descriptor, so there is no way to render
 * the colour without also rendering the icon and words. That matters for
 * colour-blind guardians, for greyscale/low-brightness phone screens, and for
 * anyone who is scanning rather than reading.
 *
 * Equally important is what this system does NOT describe: it is about what
 * needs the parent's ATTENTION, never about how good the child is. There is no
 * red for "poor student". Learning development uses the separate, always
 * positive LEARNING_STAGES scale below (§4).
 */

export const PARENT_STATUS = {
  // 🔴 Something will go wrong if the parent does nothing.
  ACTION_REQUIRED: {
    key: "ACTION_REQUIRED",
    tone: "red",
    icon: "!",
    emoji: "🔴",
    labelKey: "status.actionRequired",
    defaultLabel: "ACTION REQUIRED",
    // Tailwind classes are resolved here rather than in each component so a
    // status can never be styled inconsistently across screens.
    classes: {
      card: "border-red-200 bg-red-50",
      badge: "bg-red-100 text-red-800",
      dot: "bg-red-600",
      accent: "text-red-700",
      button: "bg-red-600 hover:bg-red-700 text-white",
    },
  },
  // 🟡 Worth a look, but nothing breaks today.
  NEEDS_ATTENTION: {
    key: "NEEDS_ATTENTION",
    tone: "yellow",
    icon: "⏱",
    emoji: "🟡",
    labelKey: "status.needsAttention",
    defaultLabel: "NEEDS ATTENTION",
    classes: {
      card: "border-amber-200 bg-amber-50",
      badge: "bg-amber-100 text-amber-900",
      dot: "bg-amber-500",
      accent: "text-amber-800",
      button: "bg-amber-500 hover:bg-amber-600 text-white",
    },
  },
  // 🟢 Done, confirmed, or something to celebrate.
  COMPLETE: {
    key: "COMPLETE",
    tone: "green",
    icon: "✓",
    emoji: "🟢",
    labelKey: "status.complete",
    defaultLabel: "COMPLETE",
    classes: {
      card: "border-emerald-200 bg-emerald-50",
      badge: "bg-emerald-100 text-emerald-800",
      dot: "bg-emerald-600",
      accent: "text-emerald-700",
      button: "bg-emerald-600 hover:bg-emerald-700 text-white",
    },
  },
  // 🔵 Neutral information. Not part of the RAG triad, but needed so that
  // ordinary updates do not have to be dressed up as "attention".
  INFO: {
    key: "INFO",
    tone: "blue",
    icon: "i",
    emoji: "🔵",
    labelKey: "status.info",
    defaultLabel: "INFORMATION",
    classes: {
      card: "border-sky-200 bg-sky-50",
      badge: "bg-sky-100 text-sky-800",
      dot: "bg-sky-500",
      accent: "text-sky-700",
      button: "bg-sky-600 hover:bg-sky-700 text-white",
    },
  },
};

export function getStatus(key) {
  return PARENT_STATUS[key] || PARENT_STATUS.INFO;
}

/**
 * Learning development scale (§4).
 *
 * Explicitly NOT red/yellow/green. Every stage is affirming — the lowest rung
 * is "Developing", not "Behind" — because a parent-facing product must never
 * hand a family a label that reads as a verdict on their child. There is also
 * no rank, percentile, or comparison with classmates here, by design (§37).
 */
export const LEARNING_STAGES = {
  DEVELOPING: {
    key: "DEVELOPING",
    emoji: "🌱",
    labelKey: "learning.developing",
    defaultLabel: "Developing",
    classes: { badge: "bg-lime-100 text-lime-800" },
  },
  PROGRESSING: {
    key: "PROGRESSING",
    emoji: "📈",
    labelKey: "learning.progressing",
    defaultLabel: "Progressing",
    classes: { badge: "bg-sky-100 text-sky-800" },
  },
  STRONG: {
    key: "STRONG",
    emoji: "⭐",
    labelKey: "learning.strong",
    defaultLabel: "Strong",
    classes: { badge: "bg-violet-100 text-violet-800" },
  },
  ACHIEVEMENT: {
    key: "ACHIEVEMENT",
    emoji: "🏆",
    labelKey: "learning.achievement",
    defaultLabel: "Achievement",
    classes: { badge: "bg-amber-100 text-amber-900" },
  },
};

export function getLearningStage(key) {
  return LEARNING_STAGES[key] || LEARNING_STAGES.DEVELOPING;
}

/**
 * Status for a notice, from the parent's point of view.
 *
 * Order matters: an unanswered consent request outranks an unopened notice,
 * because consent has a deadline and a consequence.
 */
export function noticeStatus(notice, receipt) {
  const needsConsent =
    notice?.requiresConsent &&
    (!receipt || receipt.consentDecision === "PENDING");
  if (needsConsent) return PARENT_STATUS.ACTION_REQUIRED;

  const needsAck = notice?.requiresAcknowledgement && !receipt?.acknowledgedAt;
  if (needsAck) return PARENT_STATUS.ACTION_REQUIRED;

  // An URGENT-priority notice the parent has not opened is action-required even
  // without an explicit acknowledgement flag — "school closed tomorrow" cannot
  // sit in a yellow pile.
  if (!receipt?.openedAt && isUrgentNotice(notice)) {
    return PARENT_STATUS.ACTION_REQUIRED;
  }

  if (!receipt?.openedAt) return PARENT_STATUS.NEEDS_ATTENTION;

  return PARENT_STATUS.COMPLETE;
}

export function isUrgentNotice(notice) {
  return notice?.priority === "URGENT" || notice?.type === "URGENT";
}

/**
 * Status for an event, from the parent's point of view.
 * `registration` is the student's ParticipationRequest, if any.
 */
export function eventStatus(event, registration, now = new Date()) {
  if (registration?.status === "ENROLLED" || registration?.status === "APPROVED") {
    return PARENT_STATUS.COMPLETE;
  }
  if (registration?.status === "PENDING") {
    return PARENT_STATUS.NEEDS_ATTENTION;
  }

  const deadline = event?.registrationDeadline
    ? new Date(event.registrationDeadline)
    : null;

  if (deadline && deadline > now) {
    // Closing within 48h and the child is not registered — this is the case the
    // parent must not miss, so it goes red rather than yellow.
    const hoursLeft = (deadline - now) / (1000 * 60 * 60);
    return hoursLeft <= 48
      ? PARENT_STATUS.ACTION_REQUIRED
      : PARENT_STATUS.NEEDS_ATTENTION;
  }

  return PARENT_STATUS.INFO;
}

/**
 * Map a UserNotification priority to a status descriptor (§17), so the
 * notification list and the home cards speak the same visual language.
 */
export function notificationStatus(priority) {
  if (priority === "URGENT") return PARENT_STATUS.ACTION_REQUIRED;
  if (priority === "ACTION") return PARENT_STATUS.NEEDS_ATTENTION;
  if (priority === "POSITIVE") return PARENT_STATUS.COMPLETE;
  return PARENT_STATUS.INFO;
}
