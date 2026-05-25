import User from "@/models/User";
import Student from "@/models/Student";
import Notice from "@/models/Notice";
import EventNotice from "@/models/EventNotice";
import Event from "@/models/Event";
import EventProposal from "@/models/EventProposal";
import EventSchoolInvitation from "@/models/EventSchoolInvitation";
import ParticipationRequest from "@/models/ParticipationRequest";
import PlatformChallenge from "@/models/PlatformChallenge";
import PlatformChallengeSubmission from "@/models/PlatformChallengeSubmission";
import SchoolMagazineArticle from "@/models/SchoolMagazineArticle";
import SupportTicket from "@/models/SupportTicket";
import UserSurfaceSeenState from "@/models/UserSurfaceSeenState";
import { getSchoolNotificationPayload } from "@/lib/schoolNotifications";
import { getStudentNotificationPayload } from "@/lib/studentNotifications";
import { gradeListContains } from "@/lib/schoolGrades";
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
    submittedChallengeResponses,
    openSupportTickets,
    pendingPromotions,
  ] = await Promise.all([
    User.countDocuments({ role: "SCHOOL_ADMIN", status: "PENDING" }),
    Event.countDocuments({ status: "PENDING", lifecycleStatus: { $ne: "ARCHIVED" } }),
    EventProposal.countDocuments({ status: { $in: ["NEW", "UNDER_REVIEW"] } }),
    PlatformChallengeSubmission.countDocuments({ status: "SUBMITTED" }),
    SupportTicket.countDocuments({
      isDeleted: { $ne: true },
      status: { $in: ["pending", "in-progress"] },
    }),
    SchoolPromotion.countDocuments({
      status: { $in: ["PENDING", "DRAFT", "ACTIVE"] },
      paymentStatus: "PENDING",
    }),
  ]);

  addIndicator(indicators, "admin.approvals", pendingSchools);
  addIndicator(indicators, "admin.events", pendingEvents + pendingProposals);
  addIndicator(indicators, "admin.challenges", submittedChallengeResponses);
  addIndicator(indicators, "admin.support", openSupportTickets);
  addIndicator(indicators, "admin.spotlight", pendingPromotions);

  return indicators;
}

async function getSchoolAdminIndicators(session) {
  const indicators = emptyIndicatorMap();
  const schoolIds = schoolIdsForSession(session);
  const pulseSeenState = await UserSurfaceSeenState.findOne({
    user: session.user.id,
    surface: "school.pratyoPulse",
  })
    .select("seenAt")
    .lean();
  const pulseSeenAt = pulseSeenState?.seenAt || new Date(0);

  const schoolNotifications = await getSchoolNotificationPayload(session, 100);

  const [
    magazineReview,
    pratyoPulse,
    platformInvitations,
    pendingParticipationRequests,
    activeSchoolEvents,
    openSupportTickets,
  ] = await Promise.all([
    SchoolMagazineArticle.countDocuments({
      school: { $in: schoolIds },
      status: "SUBMITTED",
      isDeleted: { $ne: true },
    }),
    PlatformChallengeSubmission.countDocuments({
      school: { $in: schoolIds },
      status: "SELECTED",
      isPublic: true,
      addedToSchoolMagazine: { $ne: true },
      publishedAt: { $gt: pulseSeenAt },
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
    SupportTicket.countDocuments({
      school: { $in: schoolIds },
      isDeleted: { $ne: true },
      status: { $in: ["pending", "in-progress"] },
    }),
  ]);

  addIndicator(indicators, "school.receivedNotices", schoolNotifications.unreadCount, {
    tone: "new",
  });
  addIndicator(indicators, "school.magazine", magazineReview);
  addIndicator(indicators, "school.pratyoPulse", pratyoPulse);
  addIndicator(indicators, "school.platformEvents", platformInvitations);
  addIndicator(
    indicators,
    "school.schoolEvents",
    pendingParticipationRequests + activeSchoolEvents
  );
  addIndicator(indicators, "school.support", openSupportTickets);

  return indicators;
}

async function getStudentIndicators(session) {
  const indicators = emptyIndicatorMap();
  const student = await Student.findOne(buildStudentLookup(session))
    .select("_id school grade")
    .lean();

  if (!student) return indicators;

  const now = new Date();
  const seenStates = await UserSurfaceSeenState.find({
    user: session.user.id,
    surface: {
      $in: ["student.magazine", "student.pratyoPulse", "student.events"],
    },
  })
    .select("surface seenAt")
    .lean();
  const seenStateMap = new Map(
    seenStates.map((state) => [state.surface, state.seenAt])
  );
  const magazineSeenAt = seenStateMap.get("student.magazine") || new Date(0);
  const pulseSeenAt = seenStateMap.get("student.pratyoPulse") || new Date(0);
  const eventsSeenAt = seenStateMap.get("student.events") || new Date(0);

  const [
    studentNotifications,
    writings,
    challenges,
    newPublishedArticles,
    newPulseResponses,
  ] =
    await Promise.all([
      getStudentNotificationPayload(session, 100),
      SchoolMagazineArticle.countDocuments({
        authorStudent: student._id,
        school: student.school,
        isDeleted: { $ne: true },
        status: { $in: ["REJECTED", "DRAFT"] },
      }),
      PlatformChallenge.find({
        status: "PUBLISHED",
        isDeleted: { $ne: true },
        $or: [{ deadline: null }, { deadline: { $gte: now } }],
      })
        .select("_id targetGrades")
        .lean(),
      SchoolMagazineArticle.countDocuments({
        school: student.school,
        isPublished: true,
        isDeleted: { $ne: true },
        publishedAt: { $gt: magazineSeenAt },
      }),
      PlatformChallengeSubmission.countDocuments({
        status: "SELECTED",
        isPublic: true,
        publishedAt: { $gt: pulseSeenAt },
      }),
    ]);

  const visibleChallenges = challenges.filter((challenge) =>
    gradeListContains(challenge.targetGrades || [], student.grade)
  );
  const challengeIds = visibleChallenges.map((challenge) => challenge._id);
  const responses = await PlatformChallengeSubmission.countDocuments({
    student: student._id,
    challenge: { $in: challengeIds },
  });
  const openChallenges = Math.max(0, visibleChallenges.length - responses);

  addIndicator(indicators, "student.notices", studentNotifications.unreadCount, {
    tone: "new",
  });
  addIndicator(indicators, "student.writing", writings + openChallenges);
  const newEventNotices = studentNotifications.notifications.filter(
    (notification) =>
      notification.noticeType === "EVENT" &&
      new Date(notification.publishedAt || 0) > eventsSeenAt
  ).length;

  addIndicator(indicators, "student.events", newEventNotices, {
    tone: "new",
  });
  addIndicator(indicators, "student.magazine", newPublishedArticles, { tone: "new" });
  addIndicator(indicators, "student.pratyoPulse", newPulseResponses, {
    tone: "new",
  });

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
