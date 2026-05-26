import Notice from "@/models/Notice";

function eventIdFor(event) {
  return event ? event._id || event.id || event : null;
}

export async function ensureStudentEventNotification({
  event,
  schoolId,
  authorId,
  title,
  content,
} = {}) {
  const eventId = eventIdFor(event);
  const targetSchoolId = schoolId || event?.school || null;

  if (!eventId || !targetSchoolId || !authorId) {
    return null;
  }

  if (event?.status && event.status !== "APPROVED") {
    return null;
  }

  return Notice.findOneAndUpdate(
    {
      scope: "SCHOOL",
      school: targetSchoolId,
      event: eventId,
      type: "EVENT",
      "targetAudience.students": true,
      isDeleted: { $ne: true },
    },
    {
      $set: {
        title: title || `New event: ${event.title || "Event"}`,
        content:
          content ||
          "Your school has published an event. Open Student Events to view the details and follow updates.",
        priority: "NORMAL",
        status: "PUBLISHED",
        visibility: "PRIVATE",
        isActive: true,
        grades: [],
        publishedAt: new Date(),
      },
      $setOnInsert: {
        scope: "SCHOOL",
        school: targetSchoolId,
        author: authorId,
        event: eventId,
        type: "EVENT",
        targetAudience: {
          students: true,
          teachers: false,
          parents: false,
        },
        attachments: [],
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );
}
