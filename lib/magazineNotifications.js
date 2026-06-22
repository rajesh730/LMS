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

export async function notifyStudentMagazineReviewed({
  article,
  schoolId,
  status,
}) {
  const approved = status === "APPROVED";
  const notification = await createUserNotification({
    targetRole: "STUDENT",
    recipientStudent: article?.authorStudent,
    school: schoolId,
    title: approved ? "Writing selected" : "Writing moved to private",
    message: approved
      ? `${articleTitle(article)} was selected by your school.`
      : `${articleTitle(article)} is no longer visible on the school wall.`,
    href: "/student/writing",
    article,
    action: approved ? "APPROVED" : "REJECTED",
  });

  publishRealtimeEvent("student-notifications", {
    kind: "student-magazine-review-notification",
    articleId: String(article?._id || ""),
    status,
  });
  publishWorkIndicatorsUpdate("student-magazine-review-notification", {
    schoolId: String(schoolId || ""),
    studentId: String(article?.authorStudent || ""),
    articleId: String(article?._id || ""),
    status,
  });

  return notification;
}
