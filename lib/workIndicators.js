import User from "@/models/User";
import Student from "@/models/Student";
import Notice from "@/models/Notice";
import EventNotice from "@/models/EventNotice";
import Event from "@/models/Event";
import EventProposal from "@/models/EventProposal";
import EventSchoolInvitation from "@/models/EventSchoolInvitation";
import ParticipationRequest from "@/models/ParticipationRequest";
import SchoolMagazineArticle from "@/models/SchoolMagazineArticle";
import Feedback from "@/models/Feedback";
import { getSchoolNotificationPayload } from "@/lib/schoolNotifications";
import { getStudentNotificationPayload } from "@/lib/studentNotifications";
import SchoolPromotion from "@/models/SchoolPromotion";

function emptyIndicatorMap() {
  return {};
}

function normalizeCount(value) {
  return Math.max(0, Number(value) || 0);
}

function addIndicator(indicators, key, count, meta = {}) {
  const normalizedCount = normalizeCount(count);
  indicators[key] = {
    count: normalizedCount,
    tone: meta.tone || "action",
    label: meta.label || String(normalizedCount),
  };
}

function schoolIdsForSession(session) {
  return Array.from(
    new Set(
      [session?.user?.id, session?.user?.schoolId]
        .filter(Boolean)
        .map((value) => String(value))
    )
  );
}

function buildStudentLookup(session) {
  return {
    isDeleted: { $ne: true },
    status: "ACTIVE",
    $or: [
      { _id: session.user.id },
      { userId: session.user.id },
      { email: session.user.email },
      { username: session.user.email },
    ],
  };
}

async function getSuperAdminIndicators() {
  const indicators = emptyIndicatorMap();

  const [
    pendingSchools,
    pendingEvents,
    pendingProposals,
    newFeedback,
    pendingPromotions,
  ] = await Promise.all([
    User.countDocuments({ role: "SCHOOL_ADMIN", status: "PENDING" }),
    Event.countDocuments({ status: "PENDING", lifecycleStatus: { $ne: "ARCHIVED" } }),
    EventProposal.countDocuments({ status: { $in: ["NEW", "UNDER_REVIEW"] } }),
    Feedback.countDocuments({ status: "NEW" }),
    SchoolPromotion.countDocuments({
      status: { $in: ["PENDING", "DRAFT", "ACTIVE"] },
      paymentStatus: "PENDING",
    }),
  ]);

  addIndicator(indicators, "admin.approvals", pendingSchools);
  addIndicator(indicators, "admin.events", pendingEvents);
  addIndicator(indicators, "admin.partners", pendingProposals);
  addIndicator(indicators, "admin.feedback", newFeedback);
  addIndicator(indicators, "admin.spotlight", pendingPromotions);

  return indicators;
}

async function getSchoolAdminIndicators(session) {
  const indicators = emptyIndicatorMap();
  const schoolIds = schoolIdsForSession(session);
  const schoolNotifications = await getSchoolNotificationPayload(session, 100);

  const [
    magazineReview,
    platformInvitations,
    pendingParticipationRequests,
    activeSchoolEvents,
  ] = await Promise.all([
    SchoolMagazineArticle.countDocuments({
      school: { $in: schoolIds },
      status: "SUBMITTED",
      isDeleted: { $ne: true },
    }),
    EventSchoolInvitation.countDocuments({
      school: { $in: schoolIds },
      status: "PENDING",
    }),
    ParticipationRequest.countDocuments({
      school: { $in: schoolIds },
      status: "PENDING",
    }),
    Event.countDocuments({
      eventScope: "SCHOOL",
      school: { $in: schoolIds },
      lifecycleStatus: { $nin: ["ARCHIVED", "COMPLETED"] },
    }),
  ]);

  addIndicator(indicators, "school.receivedNotices", schoolNotifications.unreadCount, {
    tone: "new",
  });
  addIndicator(indicators, "school.magazine", magazineReview);
  addIndicator(indicators, "school.platformEvents", platformInvitations);
  addIndicator(
    indicators,
    "school.schoolEvents",
    pendingParticipationRequests + activeSchoolEvents
  );
  return indicators;
}

async function getStudentIndicators(session) {
  const indicators = emptyIndicatorMap();
  const student = await Student.findOne(buildStudentLookup(session))
    .select("_id school grade")
    .lean();

  if (!student) return indicators;

  const [
    studentNotifications,
    writings,
    newPublishedArticles,
  ] =
    await Promise.all([
      getStudentNotificationPayload(session, 100),
      SchoolMagazineArticle.countDocuments({
        authorStudent: student._id,
        school: student.school,
        isDeleted: { $ne: true },
        status: { $in: ["REJECTED", "DRAFT"] },
      }),
      SchoolMagazineArticle.countDocuments({
        school: student.school,
        isMagazinePublished: true,
        isDeleted: { $ne: true },
      }),
    ]);

  addIndicator(indicators, "student.notices", studentNotifications.unreadCount, {
    tone: "new",
  });
  addIndicator(indicators, "student.writing", writings);
  const newEventNotices = studentNotifications.notifications.filter(
    (notification) => notification.noticeType === "EVENT"
  ).length;

  addIndicator(indicators, "student.events", newEventNotices, {
    tone: "new",
  });
  addIndicator(indicators, "student.magazine", newPublishedArticles, { tone: "new" });

  return indicators;
}

export async function getWorkIndicators(session) {
  if (!session?.user?.role) return emptyIndicatorMap();

  if (session.user.role === "SUPER_ADMIN") {
    return getSuperAdminIndicators(session);
  }

  if (session.user.role === "SCHOOL_ADMIN") {
    return getSchoolAdminIndicators(session);
  }

  if (session.user.role === "STUDENT") {
    return getStudentIndicators(session);
  }

  return emptyIndicatorMap();
}
