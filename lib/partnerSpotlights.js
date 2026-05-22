import Event from "@/models/Event";
import ExternalOrganizer from "@/models/ExternalOrganizer";

function priorityRank(value) {
  if (value === "FEATURED") return 2;
  return 1;
}

function trustRank(value) {
  if (value === "FEATURED_PARTNER") return 2;
  if (value === "APPROVED_PARTNER") return 1;
  return 0;
}

function rotateItems(items, limit = 1) {
  if (!items.length) return [];

  const bucket = Math.floor(Date.now() / (1000 * 60 * 30));
  const startIndex = bucket % items.length;

  return Array.from({ length: Math.min(limit, items.length) }, (_, offset) => {
    const index = (startIndex + offset) % items.length;
    return items[index];
  });
}

function formatPartnerSpotlight(organizer, organizerEvents = []) {
  const events = organizerEvents.sort((a, b) => {
    const dateA = a.date ? new Date(a.date).getTime() : Number.MAX_SAFE_INTEGER;
    const dateB = b.date ? new Date(b.date).getTime() : Number.MAX_SAFE_INTEGER;
    return dateA - dateB;
  });
  const primaryEvent = events[0];

  return {
    id: String(organizer._id),
    name: organizer.organizationName || "Event Partner",
    slug: organizer.slug || "",
    logoUrl: organizer.logoUrl || "",
    website: organizer.website || "",
    location: organizer.location || "",
    isPortfolioPublic: organizer.profileVisibility === "PUBLIC",
    description:
      organizer.description ||
      primaryEvent?.description ||
      "Selected Pratyo partner helping schools create student opportunities.",
    roles: organizer.partnerRoles || [],
    trustLevel: organizer.trustLevel || "REQUEST_ONLY",
    spotlightPriority: organizer.spotlightPriority || "STANDARD",
    activeEventCount: events.length,
    primaryEvent: primaryEvent
      ? {
          id: String(primaryEvent._id),
          title: primaryEvent.title,
          date: primaryEvent.date,
          eventType: primaryEvent.eventType || "EVENT",
        }
      : null,
    sortDate: primaryEvent?.date ? new Date(primaryEvent.date).getTime() : 0,
  };
}

async function getEventsByOrganizer(organizerIds) {
  if (!organizerIds.length) return new Map();

  const events = await Event.find({
    status: "APPROVED",
    visibility: "PUBLIC",
    lifecycleStatus: "ACTIVE",
    partnerBrandingEnabled: true,
    "partners.organizer": { $in: organizerIds },
  })
    .select("title description date eventType partners")
    .sort({ date: 1, updatedAt: -1 })
    .lean();

  const eligibleIds = new Set(organizerIds.map(String));
  const eventMap = new Map();

  for (const event of events) {
    for (const partner of event.partners || []) {
      const organizerId = partner.organizer ? String(partner.organizer) : "";
      if (!eligibleIds.has(organizerId)) continue;

      if (!eventMap.has(organizerId)) {
        eventMap.set(organizerId, []);
      }
      eventMap.get(organizerId).push(event);
    }
  }

  return eventMap;
}

async function getAdminSelectedSpotlights(limit) {
  const organizers = await ExternalOrganizer.find({
    spotlightStatus: "ACTIVE",
    verificationStatus: "VERIFIED",
  })
    .select(
      "organizationName slug logoUrl website location description trustLevel profileVisibility partnerRoles spotlightPriority spotlightLastShownAt spotlightImpressionCount updatedAt"
    )
    .sort({ updatedAt: -1 })
    .limit(100)
    .lean();

  if (!organizers.length) return [];

  const eventsByOrganizer = await getEventsByOrganizer(
    organizers.map((organizer) => organizer._id)
  );

  const eligible = organizers
    .map((organizer) =>
      formatPartnerSpotlight(
        organizer,
        eventsByOrganizer.get(String(organizer._id)) || []
      )
    )
    .filter((spotlight) => spotlight.id && spotlight.name)
    .sort((a, b) => {
      const priorityDiff =
        priorityRank(b.spotlightPriority) - priorityRank(a.spotlightPriority);
      if (priorityDiff !== 0) return priorityDiff;

      const sourceA = organizers.find((item) => String(item._id) === a.id);
      const sourceB = organizers.find((item) => String(item._id) === b.id);
      const shownA = sourceA?.spotlightLastShownAt
        ? new Date(sourceA.spotlightLastShownAt).getTime()
        : 0;
      const shownB = sourceB?.spotlightLastShownAt
        ? new Date(sourceB.spotlightLastShownAt).getTime()
        : 0;
      if (shownA !== shownB) return shownA - shownB;

      return (a.sortDate || 0) - (b.sortDate || 0);
    });

  const selected = eligible.slice(0, Math.min(limit, eligible.length));

  if (selected.length) {
    await ExternalOrganizer.updateMany(
      { _id: { $in: selected.map((spotlight) => spotlight.id) } },
      {
        $set: { spotlightLastShownAt: new Date() },
        $inc: { spotlightImpressionCount: 1 },
      }
    );
  }

  return selected;
}

async function getAutomaticPartnerSpotlights(limit) {
  const events = await Event.find({
    status: "APPROVED",
    visibility: "PUBLIC",
    lifecycleStatus: "ACTIVE",
    partnerBrandingEnabled: true,
    "partners.0": { $exists: true },
  })
    .select("title description date eventType partners")
    .populate(
      "partners.organizer",
      "organizationName slug logoUrl website location description trustLevel verificationStatus profileVisibility partnerRoles"
    )
    .sort({ date: 1, updatedAt: -1 })
    .lean();

  const organizerMap = new Map();

  for (const event of events) {
    for (const partner of event.partners || []) {
      const organizer = partner.organizer;
      if (!organizer?._id) continue;
      if (organizer.verificationStatus !== "VERIFIED") continue;
      if (organizer.profileVisibility !== "PUBLIC") continue;

      const key = String(organizer._id);
      const existing = organizerMap.get(key);
      const nextEventDate = event.date ? new Date(event.date).getTime() : 0;

      if (!existing) {
        organizerMap.set(key, {
          id: key,
          name: organizer.organizationName || "Event Partner",
          slug: organizer.slug || "",
          logoUrl: organizer.logoUrl || "",
          website: organizer.website || "",
          location: organizer.location || "",
          isPortfolioPublic: organizer.profileVisibility === "PUBLIC",
          description:
            organizer.description ||
            event.description ||
            "Verified event partner on the platform.",
          roles: organizer.partnerRoles || [],
          trustLevel: organizer.trustLevel || "REQUEST_ONLY",
          activeEventCount: 1,
          primaryEvent: {
            id: String(event._id),
            title: event.title,
            date: event.date,
            eventType: event.eventType || "EVENT",
          },
          sortDate: nextEventDate,
        });
        continue;
      }

      existing.activeEventCount += 1;
      if (nextEventDate && (!existing.sortDate || nextEventDate < existing.sortDate)) {
        existing.primaryEvent = {
          id: String(event._id),
          title: event.title,
          date: event.date,
          eventType: event.eventType || "EVENT",
        };
        existing.sortDate = nextEventDate;
      }
    }
  }

  const eligible = Array.from(organizerMap.values()).sort((a, b) => {
    const trustDiff = trustRank(b.trustLevel) - trustRank(a.trustLevel);
    if (trustDiff !== 0) return trustDiff;

    const countDiff = b.activeEventCount - a.activeEventCount;
    if (countDiff !== 0) return countDiff;

    return (a.sortDate || 0) - (b.sortDate || 0);
  });

  return rotateItems(eligible, limit);
}

export async function getRotatingPartnerSpotlights(limit = 1) {
  const selectedSpotlights = await getAdminSelectedSpotlights(limit);
  if (selectedSpotlights.length) return selectedSpotlights;

  return getAutomaticPartnerSpotlights(limit);
}
