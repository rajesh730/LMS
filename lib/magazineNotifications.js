import UserNotification from "@/models/UserNotification";
import { publishRealtimeEvent } from "@/lib/realtimeBus";
import { publishWorkIndicatorsUpdate } from "@/lib/workIndicatorRealtime";

function articleTitle(article) {
  return article?.title ? `"${article.title}"` : "your writing";
}

async function createUserNotification({
  targetRole,
  recipientUser = null,
  recipientStudent = null,
  school,
  title,
  message,
  href,
  article,
  action,
}) {
  if (!targetRole || !school || !title || !message) return null;

  return UserNotification.create({
    targetRole,
    recipientUser,
    recipientStudent,
    school,
    category: "MAGAZINE",
    title,
    message,
    href,
    metadata: {
      articleId: article?._id ? String(article._id) : "",
      action,
      status: article?.status || "",
    },
  });
}

export async function notifySchoolMagazineSubmitted({
  article,
  student,
  schoolId,
}) {
  const notification = await createUserNotification({
    targetRole: "SCHOOL_ADMIN",
    recipientUser: schoolId,
    school: schoolId,
    title: "New school wall post",
    message: `${student?.name || "A student"} posted ${articleTitle(article)} to the school wall.`,
    href: "/school/dashboard?tab=magazine",
    article,
    action: "POSTED",
  });

  publishRealtimeEvent("school-notifications", {
    kind: "school-magazine-submission-notification",
    articleId: String(article?._id || ""),
  });
  publishWorkIndicatorsUpdate("school-magazine-submission-notification", {
    schoolId: String(schoolId || ""),
    studentId: String(student?._id || ""),
    articleId: String(article?._id || ""),
  });

  return notification;
}
