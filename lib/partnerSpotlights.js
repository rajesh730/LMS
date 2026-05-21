import Event from "@/models/Event";
import "@/models/ExternalOrganizer";

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

export async function getRotatingPartnerSpotlights(limit = 1) {
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
