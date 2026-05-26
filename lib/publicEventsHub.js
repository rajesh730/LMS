import connectDB from "@/lib/db";
import Event from "@/models/Event";
import Achievement from "@/models/Achievement";
import ParticipationRequest from "@/models/ParticipationRequest";
import "@/models/User";

function toIso(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function getPartnerName(event) {
  if (!event.partnerBrandingEnabled || !Array.isArray(event.partners)) return "";
  const partner = event.partners.find(
    (entry) =>
      entry?.organizer?.profileVisibility === "PUBLIC" || entry?.displayName
  );
  return (
    partner?.organizer?.organizationName ||
    partner?.displayName ||
    ""
  );
}

function serializeEvent(event, stats = {}) {
  return {
    id: String(event._id),
    title: event.title,
    description: event.description,
    date: toIso(event.date),
    registrationDeadline: toIso(event.registrationDeadline),
    eventType: event.eventType || "COMPETITION",
    eventScope: event.eventScope || "PLATFORM",
    schoolName: event.school?.schoolName || "",
    schoolId: event.school?._id ? String(event.school._id) : "",
    eligibleGrades: event.eligibleGrades || [],
    resultsPublished: Boolean(event.resultsPublished),
    featuredOnLanding: Boolean(event.featuredOnLanding),
    partnerName: getPartnerName(event),
    schoolCount: stats.schoolCount || 0,
    participantCount: stats.participantCount || 0,
    href: `/events/${event._id}`,
  };
}

export async function getPublicEventsHubData() {
  await connectDB();

  const events = await Event.find({
    visibility: "PUBLIC",
    status: "APPROVED",
    lifecycleStatus: { $ne: "ARCHIVED" },
  })
    .sort({ featuredOnLanding: -1, date: 1, updatedAt: -1 })
    .populate("school", "schoolName")
    .populate(
      "partners.organizer",
      "organizationName slug logoUrl verificationStatus profileVisibility"
    )
    .lean();

  const eventIds = events.map((event) => event._id);
  const [requests, publicResults] = await Promise.all([
    eventIds.length
      ? ParticipationRequest.find({
          event: { $in: eventIds },
          status: { $in: ["APPROVED", "ENROLLED"] },
        })
          .select("event school status")
          .populate("school", "schoolName")
          .lean()
      : [],
    Achievement.find({
      isPublic: true,
      certificateIssuedAt: { $ne: null },
      event: { $in: eventIds },
    })
      .select("event school title placement certificateRecipientName")
      .populate("school", "schoolName")
      .limit(24)
      .lean(),
  ]);

  const eventStats = new Map();
  const schoolStats = new Map();

  requests.forEach((request) => {
    const eventId = String(request.event);
    const schoolId = String(request.school?._id || request.school || "");
    const current = eventStats.get(eventId) || {
      participantCount: 0,
      schoolIds: new Set(),
    };
    current.participantCount += 1;
    if (schoolId) current.schoolIds.add(schoolId);
    eventStats.set(eventId, current);

    if (schoolId) {
      const school = schoolStats.get(schoolId) || {
        id: schoolId,
        schoolName: request.school?.schoolName || "School",
        eventIds: new Set(),
      };
      school.eventIds.add(eventId);
      schoolStats.set(schoolId, school);
    }
  });

  const serializedEvents = events.map((event) => {
    const stats = eventStats.get(String(event._id)) || {
      participantCount: 0,
      schoolIds: new Set(),
    };
    return serializeEvent(event, {
      participantCount: stats.participantCount,
      schoolCount: stats.schoolIds.size,
    });
  });

  const now = Date.now();
  const upcomingEvents = serializedEvents.filter(
    (event) => event.date && new Date(event.date).getTime() >= now
  );
  const resultsEvents = serializedEvents.filter((event) => event.resultsPublished);
  const schoolEvents = serializedEvents.filter(
    (event) => event.eventScope === "SCHOOL"
  );
  const featuredEvent =
    serializedEvents.find((event) => event.featuredOnLanding) ||
    upcomingEvents[0] ||
    serializedEvents[0] ||
    null;

  const topSchools = Array.from(schoolStats.values())
    .map((school) => ({
      id: school.id,
      schoolName: school.schoolName,
      eventCount: school.eventIds.size,
      href: `/schools/${school.id}`,
    }))
    .sort((a, b) => b.eventCount - a.eventCount)
    .slice(0, 5);

  return {
    featuredEvent,
    upcomingEvents: upcomingEvents.slice(0, 8),
    resultsEvents: resultsEvents.slice(0, 8),
    schoolEvents: schoolEvents.slice(0, 8),
    topSchools,
    publicResults: publicResults.slice(0, 6).map((result) => ({
      id: String(result._id),
      title: result.title,
      placement: result.placement,
      schoolName: result.school?.schoolName || "School",
      recipientName: result.certificateRecipientName || "Winner",
    })),
    stats: {
      events: serializedEvents.length,
      upcoming: upcomingEvents.length,
      results: resultsEvents.length,
      schools: topSchools.length,
    },
    updatedAt: new Date().toISOString(),
  };
}
