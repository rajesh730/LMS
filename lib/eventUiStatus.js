export function isDatePast(value, options = {}) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  if (options.endOfDay) {
    date.setHours(23, 59, 59, 999);
  }

  return date < new Date();
}

export function formatShortDate(value) {
  if (!value) return "No date set";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function getEventStage(event = {}, options = {}) {
  const capacityInfo = options.capacityInfo || {};
  const requests = options.requests || {};
  const participationStatus = options.participationStatus || event.participationStatus;
  const invitationStatus = options.invitationStatus || event.schoolInvitationStatus;
  const registrationClosed = isDatePast(event.registrationDeadline || event.deadline, {
    endOfDay: true,
  });
  const eventPassed = isDatePast(event.date, { endOfDay: true });
  const pendingCount =
    capacityInfo.pending ??
    requests.PENDING?.length ??
    event.participants?.filter?.((participant) => participant.status === "PENDING")
      ?.length ??
    0;
  const enrolledCount =
    capacityInfo.filled ??
    event.studentCapacityCount ??
    event.studentCount ??
    event.myParticipation?.studentCount ??
    event.myParticipation?.students?.length ??
    0;

  if ((event.lifecycleStatus || "").toUpperCase() === "ARCHIVED") {
    return {
      label: "Archived",
      tone: "slate",
      nextAction: "Restore only if this event needs more work.",
    };
  }

  if (event.resultsPublished) {
    return {
      label: "Results Published",
      tone: "emerald",
      nextAction: "Review certificates and public result visibility.",
    };
  }

  if ((event.lifecycleStatus || "").toUpperCase() === "COMPLETED") {
    return {
      label: "Completed",
      tone: "emerald",
      nextAction: "Publish results and issue certificates if not already done.",
    };
  }

  if (invitationStatus === "PENDING") {
    return {
      label: "Waiting for School Decision",
      tone: "amber",
      nextAction: "Approve this event before registering students.",
    };
  }

  if (participationStatus === "PENDING") {
    return {
      label: "Registration Pending",
      tone: "amber",
      nextAction: "Wait for approval or review the registered team.",
    };
  }

  if (participationStatus === "REJECTED") {
    return {
      label: "Registration Rejected",
      tone: "rose",
      nextAction: "Check the event notes before trying again.",
    };
  }

  if (participationStatus === "APPROVED") {
    return {
      label: "Team Registered",
      tone: "emerald",
      nextAction: registrationClosed
        ? "Registration is locked. Follow round notices."
        : "You can still update the team before the deadline.",
    };
  }

  if (eventPassed) {
    return {
      label: "Event Date Passed",
      tone: "slate",
      nextAction: "Finalize rounds, results, and certificates.",
    };
  }

  if (registrationClosed) {
    return {
      label: "Registration Closed",
      tone: "rose",
      nextAction: pendingCount > 0
        ? "Review pending participants before rounds begin."
        : "Start rounds or prepare final event operations.",
    };
  }

  if (pendingCount > 0) {
    return {
      label: "Needs Review",
      tone: "amber",
      nextAction: `${pendingCount} request${pendingCount === 1 ? "" : "s"} need approval.`,
    };
  }

  if (enrolledCount > 0) {
    return {
      label: "Registration Open",
      tone: "blue",
      nextAction: "Monitor participants and prepare round schedule.",
    };
  }

  return {
    label: "Registration Open",
    tone: "blue",
    nextAction: "Share the event and start registering eligible students.",
  };
}

export function getStageClasses(tone) {
  const classes = {
    amber: "border-amber-500/30 bg-amber-500/10 text-amber-200",
    blue: "border-blue-500/30 bg-blue-500/10 text-blue-200",
    emerald: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
    rose: "border-rose-500/30 bg-rose-500/10 text-rose-200",
    slate: "border-slate-600 bg-slate-800 text-slate-200",
  };

  return classes[tone] || classes.slate;
}
