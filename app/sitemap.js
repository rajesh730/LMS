import connectDB from "@/lib/db";
import Event from "@/models/Event";
import SchoolShowcaseProfile from "@/models/SchoolShowcaseProfile";
import "@/models/User";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://pratyo.infobytesnepal.com";
export const dynamic = "force-dynamic";

export default async function sitemap() {
  const staticRoutes = [
    "",
    "/events",
    "/schools",
    "/partners",
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

  await connectDB();

  const [events, schoolProfiles] = await Promise.all([
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

  return [...staticRoutes, ...eventRoutes, ...schoolRoutes];
}
