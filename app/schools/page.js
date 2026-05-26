import connectDB from "@/lib/db";
import User from "@/models/User";
import Student from "@/models/Student";
import SchoolShowcaseProfile from "@/models/SchoolShowcaseProfile";
import { getActiveSchoolPromotions } from "@/lib/schoolPromotions";
import PublicExplorePanel from "@/components/public/PublicExplorePanel";
import PublicSchoolsDirectory from "@/components/public/PublicSchoolsDirectory";
import PublicSiteNav from "@/components/public/PublicSiteNav";
import { PublicPageShell } from "@/components/public/PublicLayout";

export const dynamic = "force-dynamic";

function serializeProfile(profile) {
  return {
    tagline: profile?.tagline || "",
    summary: profile?.summary || "",
    coverImageUrl: profile?.coverImageUrl || "",
    highlightMetrics: {
      eventsHosted: profile?.highlightMetrics?.eventsHosted || 0,
      eventsParticipated: profile?.highlightMetrics?.eventsParticipated || 0,
      awardsCount: profile?.highlightMetrics?.awardsCount || 0,
      studentParticipationRate:
        profile?.highlightMetrics?.studentParticipationRate || 0,
    },
  };
}

function parseLocationParts(location = "") {
  const parts = String(location || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const postalIndex = parts.findIndex((part) => /^postal code/i.test(part));
  const cleanParts = postalIndex >= 0 ? parts.slice(0, postalIndex) : parts;
  const wardIndex = cleanParts.findIndex((part) => /^ward\s+/i.test(part));

  return {
    province: cleanParts.at(-1) || "",
    district: cleanParts.at(-2) || "",
    municipality:
      wardIndex > 0 ? cleanParts[wardIndex - 1] : cleanParts.at(-3) || "",
    ward: wardIndex >= 0 ? cleanParts[wardIndex] : "",
  };
}

function serializePromotion(promotion, studentCountMap) {
  const schoolId = promotion.school?.id || promotion.schoolId || promotion.school?.schoolId;
  return {
    id: promotion.id,
    schoolId,
    title: promotion.title,
    href: promotion.href,
    location: promotion.school?.location || "",
    priority: promotion.priority,
    studentCount: studentCountMap.get(String(schoolId)) || 0,
    profile: serializeProfile(promotion.profile),
  };
}

export default async function PublicSchoolsPage() {
  await connectDB();

  const [schools, spotlights] = await Promise.all([
    User.find({
      role: "SCHOOL_ADMIN",
      status: { $in: ["APPROVED", "SUBSCRIBED"] },
    })
      .select(
        "schoolName schoolLocation province district municipality ward tole streetAddress postalCode principalName establishedYear createdAt"
      )
      .sort({ createdAt: -1 })
      .lean(),
    getActiveSchoolPromotions("SCHOOLS_SPOTLIGHT", 4),
  ]);

  const schoolIds = schools.map((school) => school._id);

  const [profiles, studentCounts] = await Promise.all([
    SchoolShowcaseProfile.find({
      school: { $in: schoolIds },
      visibility: "PUBLIC",
    })
      .select("school tagline summary coverImageUrl highlightMetrics")
      .lean(),
    Student.aggregate([
      {
        $match: {
          school: { $in: schoolIds },
          isDeleted: { $ne: true },
          status: { $in: ["ACTIVE", "ALUMNI"] },
        },
      },
      { $group: { _id: "$school", count: { $sum: 1 } } },
    ]),
  ]);

  const profileMap = new Map(
    profiles.map((profile) => [String(profile.school), profile])
  );
  const studentCountMap = new Map(
    studentCounts.map((item) => [String(item._id), item.count])
  );

  const publicSchools = schools
    .map((school) => {
      const profile = profileMap.get(String(school._id));
      if (!profile) return null;
      const parsedLocation = parseLocationParts(school.schoolLocation);

      return {
        id: String(school._id),
        name: school.schoolName || "School",
        location: school.schoolLocation || "",
        province: school.province || parsedLocation.province,
        district: school.district || parsedLocation.district,
        municipality: school.municipality || parsedLocation.municipality,
        ward: school.ward || parsedLocation.ward,
        tole: school.tole || "",
        streetAddress: school.streetAddress || "",
        postalCode: school.postalCode || "",
        principalName: school.principalName || "",
        establishedYear: school.establishedYear || null,
        createdAt: school.createdAt ? school.createdAt.toISOString() : "",
        studentCount: studentCountMap.get(String(school._id)) || 0,
        profile: serializeProfile(profile),
      };
    })
    .filter(Boolean);

  const totals = publicSchools.reduce(
    (summary, school) => ({
      schoolCount: summary.schoolCount + 1,
      hostedEventCount:
        summary.hostedEventCount +
        (school.profile?.highlightMetrics?.eventsHosted || 0),
      joinedEventCount:
        summary.joinedEventCount +
        (school.profile?.highlightMetrics?.eventsParticipated || 0),
      eventCount:
        summary.eventCount +
        (school.profile?.highlightMetrics?.eventsHosted || 0) +
        (school.profile?.highlightMetrics?.eventsParticipated || 0),
      awardCount:
        summary.awardCount + (school.profile?.highlightMetrics?.awardsCount || 0),
      studentCount: summary.studentCount + (school.studentCount || 0),
    }),
    {
      schoolCount: 0,
      hostedEventCount: 0,
      joinedEventCount: 0,
      eventCount: 0,
      awardCount: 0,
      studentCount: 0,
    }
  );

  const serializedSpotlights = spotlights
    .map((promotion) => serializePromotion(promotion, studentCountMap))
    .filter((promotion) => promotion.schoolId);

  return (
    <PublicPageShell className="bg-[#f8f9fd]">
      <PublicSiteNav active="schools" />

      <div className="mx-auto grid max-w-[1500px] gap-5 px-4 py-5 sm:px-6 xl:grid-cols-[230px_minmax(0,1fr)]">
        <PublicExplorePanel active="schools" variant="schools" />
        <PublicSchoolsDirectory
          schools={publicSchools}
          spotlights={serializedSpotlights}
          totals={totals}
        />
      </div>
    </PublicPageShell>
  );
}
