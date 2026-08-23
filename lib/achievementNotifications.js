import UserNotification from "@/models/UserNotification";
import { formatPlacementLabel } from "@/lib/results";
import { notifyGuardians } from "@/lib/parentNotifications";

// Turn FINALIST -> Finalist, WINNER -> Winner, "1st Runner Up" stays as-is.
function nicePlacement(value) {
  return formatPlacementLabel(value).replace(
    /\b[A-Z]{2,}\b/g,
    (word) => word.charAt(0) + word.slice(1).toLowerCase()
  );
}

/**
 * Create one outcome-oriented notification per student when results publish.
 * Speaks to the win ("You earned a Finalist certificate in X"), not the system
 * ("results updated"). Idempotent: re-running for the same event replaces the
 * previous batch so republishing results does not pile up duplicates.
 */
export async function syncAchievementNotifications({ event, achievements = [] } = {}) {
  const eventId = String(event?._id || event?.id || event || "");
  if (!eventId) return 0;

  const eventTitle = event?.title || "an event";

  await UserNotification.deleteMany({
    category: "ACHIEVEMENT",
    "metadata.eventId": eventId,
  });

  const now = new Date();
  const docs = [];

  for (const achievement of achievements) {
    const studentId = achievement?.student;
    const isTeamRecord =
      String(achievement?.recipientType || "STUDENT").toUpperCase() === "TEAM";
    if (!studentId || isTeamRecord) continue;

    const placement = String(achievement.placement || "PARTICIPANT").toUpperCase();
    const isParticipant = placement === "PARTICIPANT";
    const label = nicePlacement(achievement.placement);

    docs.push({
      targetRole: "STUDENT",
      recipientStudent: studentId,
      school: achievement.school,
      category: "ACHIEVEMENT",
      title: isParticipant
        ? "Your certificate is ready"
        : `You earned ${label}!`,
      message: isParticipant
        ? `Your participation certificate for "${eventTitle}" is ready to view, download, and share.`
        : `Congratulations! You earned ${label} in "${eventTitle}". Your verified certificate is ready to view, download, and share.`,
      href: achievement.certificateUrl || "/student/dashboard",
      metadata: {
        eventId,
        achievementId: String(achievement._id || ""),
        placement,
      },
      publishedAt: now,
    });
  }

  if (docs.length > 0) {
    await UserNotification.insertMany(docs);

    // Results matter to the family as much as to the signed-in student. Reuse
    // the guardian fan-out so link permissions, the durable parent inbox and
    // phone push delivery all follow the same policy as messages and notices.
    // One notification is produced per student achievement; TEAM container
    // rows were already excluded above, so families do not receive duplicates.
    await Promise.all(
      docs.map((doc) =>
        notifyGuardians({
          studentId: doc.recipientStudent,
          category: "ACHIEVEMENT",
          priority: "POSITIVE",
          title: doc.title,
          message: doc.message,
          href: "/parent/portfolio",
          metadata: doc.metadata,
        }).catch((error) => {
          // Results are already committed. Alert delivery is a side effect and
          // must not turn a successful publish into an API failure.
          console.error(
            "[achievementNotifications] guardian delivery failed:",
            error.message
          );
          return { sent: 0 };
        })
      )
    );
  }

  return docs.length;
}
