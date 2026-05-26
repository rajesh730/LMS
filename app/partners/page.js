import connectDB from "@/lib/db";
import ExternalOrganizer from "@/models/ExternalOrganizer";
import Event from "@/models/Event";
import ParticipationRequest from "@/models/ParticipationRequest";
import PublicExplorePanel from "@/components/public/PublicExplorePanel";
import PublicPartnersDirectory from "@/components/public/PublicPartnersDirectory";
import PublicSiteNav from "@/components/public/PublicSiteNav";
import { PublicPageShell } from "@/components/public/PublicLayout";

export const dynamic = "force-dynamic";

function serializePartner(organizer, events, requests) {
  const schoolIds = new Set(
    requests.map((request) => String(request.school || "")).filter(Boolean)
  );
  const studentIds = new Set(
    requests.map((request) => String(request.student || "")).filter(Boolean)
  );

  return {
    id: String(organizer._id),
    name: organizer.organizationName || "Partner",
    slug: organizer.slug,
    organizationType: organizer.organizationType || "OTHER",
    partnerRoles: organizer.partnerRoles || [],
    description: organizer.description || "",
    logoUrl: organizer.logoUrl || "",
    website: organizer.website || "",
    location: organizer.location || "",
    trustLevel: organizer.trustLevel || "REQUEST_ONLY",
    spotlightStatus: organizer.spotlightStatus || "OFF",
    spotlightPriority: organizer.spotlightPriority || "STANDARD",
    createdAt: organizer.createdAt ? organizer.createdAt.toISOString() : "",
    eventCount: events.length,
    schoolCount: schoolIds.size,
    studentCount: studentIds.size,
    latestEvent: events[0]
      ? {
          id: String(events[0]._id),
          title: events[0].title || "Partner event",
          date: events[0].date ? events[0].date.toISOString() : "",
          eventType: events[0].eventType || "OTHER",
        }
      : null,
  };
}

async function getPartnersData() {
  await connectDB();

  const organizers = await ExternalOrganizer.find({
    verificationStatus: "VERIFIED",
    profileVisibility: "PUBLIC",
  })
    .sort({ trustLevel: 1, organizationName: 1 })
    .lean();

  const allEventIds = new Set();
  const allSchoolIds = new Set();
  const allStudentIds = new Set();
  const recentEventMap = new Map();

  const partners = await Promise.all(
    organizers.map(async (organizer) => {
      const events = await Event.find({
        "partners.organizer": organizer._id,
        partnerBrandingEnabled: true,
        visibility: "PUBLIC",
        status: "APPROVED",
        lifecycleStatus: { $ne: "ARCHIVED" },
      })
        .select("_id title date eventType lifecycleStatus resultsPublished")
        .sort({ date: -1, createdAt: -1 })
        .lean();

      const eventIds = events.map((event) => event._id);
      eventIds.forEach((id) => allEventIds.add(String(id)));

      const requests = eventIds.length
        ? await ParticipationRequest.find({
            event: { $in: eventIds },
            status: { $in: ["PENDING", "APPROVED", "ENROLLED"] },
          })
            .select("school student event")
            .lean()
        : [];

      requests.forEach((request) => {
        if (request.school) allSchoolIds.add(String(request.school));
        if (request.student) allStudentIds.add(String(request.student));
      });

      events.forEach((event) => {
        const eventId = String(event._id);
        const eventRequests = requests.filter(
          (request) => String(request.event) === eventId
        );
        const existing = recentEventMap.get(eventId);
        if (!existing) {
          recentEventMap.set(eventId, {
            id: eventId,
            title: event.title || "Partner event",
            date: event.date ? event.date.toISOString() : "",
            partnerName: organizer.organizationName || "Partner",
            studentCount: new Set(
              eventRequests
                .map((request) => String(request.student || ""))
                .filter(Boolean)
            ).size,
          });
        }
      });

      return serializePartner(organizer, events, requests);
    })
  );

  const recentEvents = Array.from(recentEventMap.values())
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
    .slice(0, 10);

  return {
    partners,
    recentEvents,
    totals: {
      partnerCount: partners.length,
      eventCount: allEventIds.size,
      schoolCount: allSchoolIds.size,
      studentCount: allStudentIds.size,
    },
  };
}

export default async function PartnersPage() {
  const { partners, totals, recentEvents } = await getPartnersData();

  return (
    <PublicPageShell className="bg-[#f8f9fd]">
      <PublicSiteNav active="partners" />

      <div className="mx-auto grid max-w-[1500px] gap-5 px-4 py-5 sm:px-6 xl:grid-cols-[230px_minmax(0,1fr)]">
        <PublicExplorePanel active="partners" variant="partners" />
        <PublicPartnersDirectory
          partners={partners}
          totals={totals}
          recentEvents={recentEvents}
        />
      </div>
    </PublicPageShell>
  );
}
