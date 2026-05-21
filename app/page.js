import Link from "next/link";
import connectDB from "@/lib/db";
import { getPublicFeedItems } from "@/lib/publicFeed";
import { getActiveSchoolPromotions } from "@/lib/schoolPromotions";
import SchoolShowcaseProfile from "@/models/SchoolShowcaseProfile";
import PublicFeedList, {
  SponsoredSchoolCard,
} from "@/components/public/PublicFeedList";
import PublicSiteNav from "@/components/public/PublicSiteNav";
import {
  FaArrowRight,
  FaBell,
  FaCalendarAlt,
  FaSchool,
  FaStar,
  FaTrophy,
  FaUsers,
} from "react-icons/fa";

export const dynamic = "force-dynamic";

async function getFeaturedSchools() {
  const profiles = await SchoolShowcaseProfile.find({ visibility: "PUBLIC" })
    .select("school tagline highlightMetrics updatedAt")
    .sort({ updatedAt: -1 })
    .limit(5)
    .populate({
      path: "school",
      match: {
        role: "SCHOOL_ADMIN",
        status: { $in: ["APPROVED", "SUBSCRIBED"] },
      },
      select: "schoolName schoolLocation",
    })
    .lean();

  return profiles
    .filter((profile) => profile.school)
    .map((profile) => ({
      id: String(profile.school._id),
      schoolName: profile.school.schoolName || "School",
      schoolLocation: profile.school.schoolLocation || "",
      tagline: profile.tagline || "",
    }));
}

async function getHomepageData() {
  await connectDB();

  const [featuredSchools, feed, homeSpotlights] = await Promise.all([
    getFeaturedSchools(),
    getPublicFeedItems({ limit: 8 }),
    getActiveSchoolPromotions("HOME_SPOTLIGHT", 2),
  ]);

  return {
    featuredSchools,
    feed,
    homeSpotlights,
  };
}

export default async function Home() {
  const { featuredSchools, feed, homeSpotlights } = await getHomepageData();
  const primarySpotlight = homeSpotlights[0];
  const inlineSpotlight = homeSpotlights[1] || primarySpotlight;

  return (
    <main className="min-h-screen bg-[#f5f1e8] text-slate-950 selection:bg-[#2f7fdb]/20">
      <PublicSiteNav active="home" />

      <section className="border-b border-[#d7cdbb] bg-[#f8fbff]">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <div className="rounded-[30px] border border-[#d7cdbb] bg-white p-5 shadow-sm sm:p-7">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#eaf2ff] px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-[#0a2f66]">
              <FaBell />
              Public platform
            </div>
            <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              Discover student talent and school achievements
            </h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">
              Pratyo shows selected student writing, event results, public
              events, certificates, and sponsored school promotion in one
              social-style discovery page.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0a2f66] px-5 py-3 text-sm font-black text-white shadow-lg shadow-[#0a2f66]/15 transition hover:bg-[#123f82]"
              >
                Register school
                <FaArrowRight />
              </Link>
              <Link
                href="/events"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[#0a2f66]/15 bg-white px-5 py-3 text-sm font-black text-[#0a2f66] transition hover:bg-[#eaf2ff]"
              >
                Browse events
                <FaCalendarAlt />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[230px_minmax(0,1fr)_330px]">
        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-3">
            {[
              ["Events", "/events", FaCalendarAlt],
              ["Schools", "/schools", FaSchool],
              ["Register", "/register", FaUsers],
            ].map(([label, href, Icon]) => (
              <Link
                key={label}
                href={href}
                className="flex min-h-12 items-center gap-3 rounded-2xl px-4 text-sm font-black text-slate-700 transition hover:bg-white hover:text-[#0a2f66] hover:shadow-sm"
              >
                <Icon className="text-[#0a2f66]" />
                {label}
              </Link>
            ))}
          </div>
        </aside>

        <section className="min-w-0 space-y-4">
          <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#0a2f66]">
              Today on Pratyo
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">
              Student work, school proof, and public events
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Organic stories stay in the main feed. Paid school promotion is
              clearly labeled as sponsored.
            </p>
          </div>

          <PublicFeedList
            initialItems={feed.items}
            initialCursor={feed.nextCursor}
            initialHasMore={feed.hasMore}
            sponsoredPromotion={inlineSpotlight}
          />
        </section>

        <aside className="space-y-5">
          <div className="sticky top-24 space-y-5">
            {primarySpotlight ? (
              <SponsoredSchoolCard promotion={primarySpotlight} compact />
            ) : (
              <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#0a2f66]">
                  Sponsored School
                </p>
                <h2 className="mt-3 text-xl font-black text-slate-950">
                  Paid promotion appears here
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Admin chooses paid schools manually, then active paid
                  campaigns rotate in this space.
                </p>
              </div>
            )}

            <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#0a2f66]">
                Schools to watch
              </p>
              <div className="mt-4 space-y-3">
                {featuredSchools.length === 0 ? (
                  <p className="text-sm leading-6 text-slate-500">
                    Public school profiles will appear here after schools
                    publish them.
                  </p>
                ) : (
                  featuredSchools.slice(0, 4).map((school) => (
                    <Link
                      key={school.id}
                      href={`/schools/${school.id}`}
                      className="block rounded-2xl border border-slate-100 bg-[#f8fbff] p-4 transition hover:border-[#2f7fdb]/25 hover:bg-[#eaf2ff]"
                    >
                      <h3 className="font-black text-slate-950">
                        {school.schoolName}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">
                        {school.tagline ||
                          school.schoolLocation ||
                          "Public school profile"}
                      </p>
                    </Link>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#0a2f66]">
                Why it works
              </p>
              <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                <p className="flex gap-3">
                  <FaStar className="mt-1 shrink-0 text-[#0a2f66]" />
                  Student talent creates real attention for schools.
                </p>
                <p className="flex gap-3">
                  <FaTrophy className="mt-1 shrink-0 text-[#0a2f66]" />
                  Event results and certificates become public proof.
                </p>
                <p className="flex gap-3">
                  <FaSchool className="mt-1 shrink-0 text-[#0a2f66]" />
                  Paid promotion stays clearly labeled and separate.
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <footer className="border-t border-[#d7cdbb] px-4 py-8 text-center text-sm text-slate-500 sm:px-6">
        <p>
          &copy; 2026 Pratyo. Student talent, school recognition, public events,
          and verified certificates.
        </p>
      </footer>
    </main>
  );
}
