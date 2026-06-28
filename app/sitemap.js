import connectDB from "@/lib/db";
import Event from "@/models/Event";
import SchoolShowcaseProfile from "@/models/SchoolShowcaseProfile";
import SchoolMagazineArticle from "@/models/SchoolMagazineArticle";
import "@/models/User";
import "@/models/Student";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://pravyo.infobytesnepal.com";
export const dynamic = "force-dynamic";

export default async function sitemap() {
  const staticRoutes = [
    "",
    "/events",
    "/schools",
    "/notices",
    "/login",
    "/register",
    "/student/login",
  ].map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "" ? "weekly" : "daily",
    priority: path === "" ? 1 : 0.7,
  }));

  const otherStaticRoutes = ["/student-voices", "/winners"].map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 0.7,
  }));

  await connectDB();

  const [events, schoolProfiles, writings] = await Promise.all([
    Event.find({
      visibility: "PUBLIC",
      status: "APPROVED",
      lifecycleStatus: { $ne: "ARCHIVED" },
    })
      .select("_id updatedAt")
      .lean(),
    SchoolShowcaseProfile.find({ visibility: "PUBLIC" })
      .select("school updatedAt")
      .lean(),
    // Approved, publicly-published writing — the core "student voice" content,
    // plus the authors who therefore have a public, indexable portfolio.
    SchoolMagazineArticle.find({
      status: "APPROVED",
      isPublished: true,
      isDeleted: { $ne: true },
    })
      .select("_id authorStudent publishedAt updatedAt")
      .lean(),
  ]);

  const eventRoutes = events.map((event) => ({
    url: `${siteUrl}/events/${event._id}`,
    lastModified: event.updatedAt || new Date(),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const schoolRoutes = schoolProfiles
    .filter((profile) => profile.school)
    .map((profile) => ({
      url: `${siteUrl}/schools/${profile.school}`,
      lastModified: profile.updatedAt || new Date(),
      changeFrequency: "weekly",
      priority: 0.75,
    }));

  const writingRoutes = writings.map((writing) => ({
    url: `${siteUrl}/writings/${writing._id}`,
    lastModified: writing.publishedAt || writing.updatedAt || new Date(),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  // One portfolio entry per distinct author who has public published writing.
  const portfolioRoutes = Array.from(
    new Map(
      writings
        .filter((writing) => writing.authorStudent)
        .map((writing) => [
          String(writing.authorStudent),
          {
            url: `${siteUrl}/students/${writing.authorStudent}`,
            lastModified: writing.publishedAt || writing.updatedAt || new Date(),
            changeFrequency: "weekly",
            priority: 0.8,
          },
        ])
    ).values()
  );

  return [
    ...staticRoutes,
    ...otherStaticRoutes,
    ...eventRoutes,
    ...schoolRoutes,
    ...writingRoutes,
    ...portfolioRoutes,
  ];
}
