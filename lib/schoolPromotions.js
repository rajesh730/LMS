import SchoolPromotion from "@/models/SchoolPromotion";
import SchoolShowcaseProfile from "@/models/SchoolShowcaseProfile";
import "@/models/User";

export const PROMOTION_PLACEMENTS = ["HOME_SPOTLIGHT", "SCHOOLS_SPOTLIGHT"];
export const PROMOTION_STATUSES = ["DRAFT", "ACTIVE", "PAUSED"];
export const PROMOTION_PRIORITIES = ["STANDARD", "PREMIUM"];

export function priorityRank(priority) {
  return priority === "PREMIUM" ? 2 : 1;
}

function shuffleItems(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function formatPromotion(promotion, profileMap = new Map()) {
  const schoolId = String(promotion.school?._id || promotion.school || "");
  const profile = profileMap.get(schoolId);

  return {
    id: String(promotion._id),
    title: promotion.school?.schoolName || promotion.title || "School Spotlight",
    tagline:
      promotion.tagline ||
      profile?.tagline ||
      profile?.summary ||
      "Recognized school activity profile on Pravyo.",
    placement: promotion.placement,
    priority: promotion.priority,
    startsAt: promotion.startsAt,
    endsAt: promotion.endsAt,
    impressionCount: promotion.impressionCount || 0,
    clickCount: promotion.clickCount || 0,
    href: `/api/public/promotions/${promotion._id}/click`,
    school: {
      id: schoolId,
      name: promotion.school?.schoolName || "School",
      location: promotion.school?.schoolLocation || "",
      website: promotion.school?.website || "",
    },
    profile: profile
      ? {
          tagline: profile.tagline || "",
          summary: profile.summary || "",
          coverImageUrl: profile.coverImageUrl || "",
          highlightMetrics: profile.highlightMetrics || {},
        }
      : null,
  };
}

export async function getActiveSchoolPromotions(
  placement,
  limit = 1,
  { trackImpression = true, randomize = false } = {}
) {
  if (!PROMOTION_PLACEMENTS.includes(placement)) return [];

  const candidateLimit = Math.max(limit * 8, limit);

  const candidates = await SchoolPromotion.find({
    placement,
    status: "ACTIVE",
  })
    .populate({
      path: "school",
      match: {
        role: "SCHOOL_ADMIN",
        status: { $in: ["APPROVED", "SUBSCRIBED"] },
      },
      select: "schoolName schoolLocation website",
    })
    .sort({ lastShownAt: 1, createdAt: 1 })
    .limit(candidateLimit)
    .lean();

  const eligibleCandidates = candidates.filter((promotion) => promotion.school);
  const orderedCandidates = randomize
    ? [
        ...shuffleItems(
          eligibleCandidates.filter((promotion) => promotion.priority === "PREMIUM")
        ),
        ...shuffleItems(
          eligibleCandidates.filter((promotion) => promotion.priority !== "PREMIUM")
        ),
      ]
    : eligibleCandidates.sort((a, b) => {
      const priorityDiff = priorityRank(b.priority) - priorityRank(a.priority);
      if (priorityDiff !== 0) return priorityDiff;

      const aShown = a.lastShownAt ? new Date(a.lastShownAt).getTime() : 0;
      const bShown = b.lastShownAt ? new Date(b.lastShownAt).getTime() : 0;
      if (aShown !== bShown) return aShown - bShown;

      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  const eligible = orderedCandidates.slice(0, limit);

  if (eligible.length === 0) return [];

  const schoolIds = eligible.map((promotion) => promotion.school._id);
  const profiles = await SchoolShowcaseProfile.find({
    school: { $in: schoolIds },
    visibility: "PUBLIC",
  })
    .select("school tagline summary coverImageUrl highlightMetrics")
    .lean();
  const profileMap = new Map(
    profiles.map((profile) => [String(profile.school), profile])
  );

  if (trackImpression) {
    const shownAt = new Date();
    await Promise.all(
      eligible.map((promotion) =>
        SchoolPromotion.updateOne(
          { _id: promotion._id },
          { $inc: { impressionCount: 1 }, $set: { lastShownAt: shownAt } }
        )
      )
    );
  }

  return eligible.map((promotion) => formatPromotion(promotion, profileMap));
}
