import Link from "next/link";
import connectDB from "@/lib/db";
import Achievement from "@/models/Achievement";
import { getPublicFeedItems } from "@/lib/publicFeed";
import { getRotatingPartnerSpotlights } from "@/lib/partnerSpotlights";
import { getActiveSchoolPromotions } from "@/lib/schoolPromotions";
import PublicFeedList, {
  SchoolSpotlightCard,
} from "@/components/public/PublicFeedList";
import PublicSiteNav from "@/components/public/PublicSiteNav";
import "@/models/Event";
import "@/models/Student";
import "@/models/User";
import {
  FaArrowRight,
  FaBell,
  FaCalendarAlt,
  FaHandshake,
  FaMedal,
  FaSchool,
  FaStar,
  FaTrophy,
  FaUsers,
} from "react-icons/fa";

export const dynamic = "force-dynamic";

async function getRecentWinnerHighlights() {
  const achievements = await Achievement.find({
    isPublic: true,
    placement: "WINNER",
    recipientType: "STUDENT",
    student: { $ne: null },
    certificateIssuedAt: { $ne: null },
  })
    .select(
      "title awardedAt certificateIssuedAt certificateUrl certificateRecipientName"
    )
    .sort({ awardedAt: -1, createdAt: -1 })
    .limit(4)
    .populate("student", "name grade")
    .populate("school", "schoolName")
    .populate("event", "title")
    .lean();

  return achievements.map((achievement) => ({
    id: String(achievement._id),
    studentName:
      achievement.certificateRecipientName ||
      achievement.student?.name ||
      "Student",
    grade: achievement.student?.grade || "",
    schoolName: achievement.school?.schoolName || "School",
    eventTitle: achievement.event?.title || achievement.title || "Event winner",
    schoolHref: achievement.school?._id
      ? `/schools/${achievement.school._id}`
      : "",
    eventHref: achievement.event?._id ? `/events/${achievement.event._id}` : "",
    certificateHref: achievement.certificateUrl || "",
  }));
}

async function getHomepageData() {
  await connectDB();

  const [winnerHighlights, feed, partnerSpotlights, homeSpotlights] =
    await Promise.all([
      getRecentWinnerHighlights(),
      getPublicFeedItems({ limit: 8, types: ["pulse"] }),
      getRotatingPartnerSpotlights(1),
      getActiveSchoolPromotions("HOME_SPOTLIGHT", 4, { randomize: true }),
    ]);

  return {
    winnerHighlights,
    feed,
    partnerSpotlights,
    homeSpotlights,
  };
}

export default async function Home() {
  const { winnerHighlights, feed, partnerSpotlights, homeSpotlights } =
    await getHomepageData();
  const partnerSpotlight = partnerSpotlights[0] || null;

  return (
    <main className="min-h-screen bg-[#f5f1e8] text-slate-950 selection:bg-[#2f7fdb]/20">
      <PublicSiteNav active="home" />

      <section className="border-b border-[#d7cdbb] bg-[#f8fbff]">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-stretch">
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
                events, certificates, school spotlights, and active event
                organizers in one social-style discovery page.
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
                  href="/partners"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-[#0a2f66]/15 bg-white px-5 py-3 text-sm font-black text-[#0a2f66] transition hover:bg-[#eaf2ff]"
                >
                  Partnership
                  <FaHandshake />
                </Link>
              </div>
            </div>

            {partnerSpotlight ? (
              <Link
                href={`/partners/${partnerSpotlight.slug}`}
                className="group flex h-full flex-col overflow-hidden rounded-[30px] border border-[#d7cdbb] bg-[#0f2c5c] text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="flex flex-1 flex-col justify-between p-6">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-[#d7e9ff]">
                      <FaHandshake />
                      Partner Spotlight
                    </div>
                    <h2 className="mt-4 text-2xl font-black tracking-tight">
                      {partnerSpotlight.name}
                    </h2>
                    <p className="mt-2 text-sm font-semibold text-[#b8d7ff]">
                      {partnerSpotlight.primaryEvent?.title || "Active organizer"}
                    </p>
                    <p className="mt-3 line-clamp-4 text-sm leading-6 text-slate-200">
                      {partnerSpotlight.description}
                    </p>
                  </div>
                  <div className="mt-6">
                    <div className="rounded-2xl bg-white/10 p-4">
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-[#d7e9ff]">
                        Active public events
                      </p>
                      <p className="mt-2 text-sm text-white">
                        {partnerSpotlight.activeEventCount} public event
                        {partnerSpotlight.activeEventCount === 1 ? "" : "s"}
                      </p>
                      <p className="mt-1 text-xs text-slate-200">
                        Rotates across selected partners helping run public
                        events.
                      </p>
                    </div>
                    <span className="mt-4 inline-flex items-center gap-2 text-sm font-black text-white">
                      View partner
                      <FaArrowRight />
                    </span>
                  </div>
                </div>
              </Link>
            ) : (
              <div className="rounded-[30px] border border-[#d7cdbb] bg-white p-6 shadow-sm">
                <div className="inline-flex items-center gap-2 rounded-full bg-[#eaf2ff] px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-[#0a2f66]">
                  <FaHandshake />
                  Partner Spotlight
                </div>
                <h2 className="mt-4 text-2xl font-black text-slate-950">
                  Selected partners appear here
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Admin can highlight verified partners connected to active
                  public events.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:h-[calc(100vh-7rem)] lg:grid-cols-[230px_minmax(0,1fr)_330px] lg:items-start">
        <aside className="hidden lg:sticky lg:top-24 lg:block lg:h-full">
          <div className="flex h-full flex-col gap-5 pr-1">
            <div className="rounded-[26px] border border-slate-200 bg-white p-3 shadow-sm">
              <div className="space-y-2">
                {[
                  ["Events", "/events", FaCalendarAlt],
                  ["Schools", "/schools", FaSchool],
                  ["Partners", "/partners", FaHandshake],
                  ["Register", "/register", FaUsers],
                ].map(([label, href, Icon]) => (
                  <Link
                    key={label}
                    href={href}
                    className="flex min-h-12 items-center gap-3 rounded-2xl px-4 text-sm font-black text-slate-700 transition hover:bg-[#f8fbff] hover:text-[#0a2f66]"
                  >
                    <Icon className="text-[#0a2f66]" />
                    {label}
                  </Link>
                ))}
              </div>
            </div>

            <div className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-[#0a2f66]">
                <FaMedal />
                Congrats winners
              </div>
              <div className="mt-4 space-y-3">
                {winnerHighlights.length === 0 ? (
                  <p className="text-sm leading-6 text-slate-500">
                    Public winners appear here after schools publish event
                    results and certificates.
                  </p>
                ) : (
                  winnerHighlights.map((winner) => (
                      <div
                        key={winner.id}
                        className="block rounded-2xl border border-[#e3ecfb] bg-[#f8fbff] p-4 transition hover:border-[#2f7fdb]/35 hover:bg-[#eef5ff]"
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#0a2f66] text-white">
                            <FaTrophy />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-black text-slate-950">
                              {winner.studentName}
                            </p>
                            <div className="mt-3 grid grid-cols-2 gap-2">
                              {winner.schoolHref && (
                                <Link
                                  href={winner.schoolHref}
                                  title={`View ${winner.schoolName}`}
                                  aria-label={`View ${winner.schoolName}`}
                                  className="flex h-9 w-9 items-center justify-center justify-self-center rounded-full bg-white text-[#0a2f66] ring-1 ring-[#d7e5f7] transition hover:bg-[#eaf2ff]"
                                >
                                  <FaSchool />
                                </Link>
                              )}
                              {winner.eventHref && (
                                <Link
                                  href={winner.eventHref}
                                  title={`View ${winner.eventTitle}`}
                                  aria-label={`View ${winner.eventTitle}`}
                                  className="flex h-9 w-9 items-center justify-center justify-self-center rounded-full bg-white text-[#0a2f66] ring-1 ring-[#d7e5f7] transition hover:bg-[#eaf2ff]"
                                >
                                  <FaCalendarAlt />
                                </Link>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        </aside>

        <section className="min-w-0 space-y-4 lg:h-full lg:overflow-y-auto lg:overscroll-contain lg:pr-2">
          <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#0a2f66]">
              Today on Pratyo
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">
              Student writing
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Selected student responses appear here. Winners and school
              spotlights stay in their own side panels.
            </p>
          </div>

          <PublicFeedList
            initialItems={feed.items}
            initialCursor={feed.nextCursor}
            initialHasMore={feed.hasMore}
            feedType="pulse"
          />
        </section>

        <aside className="lg:sticky lg:top-24 lg:h-full">
          <div className="flex h-full flex-col rounded-[30px] border border-[#0a2f66]/12 bg-[#edf3fb] p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-[#0a2f66]">
              <FaStar />
              School Spotlight
            </div>

            {homeSpotlights.length > 0 ? (
              <div className="space-y-3 overflow-y-auto pr-1">
                {homeSpotlights.map((promotion) => (
                  <SchoolSpotlightCard
                    key={promotion.id}
                    promotion={promotion}
                    compact
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-1 flex-col justify-between rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#0a2f66]">
                  School Spotlight
                </p>
                <h2 className="mt-3 text-xl font-black text-slate-950">
                  Highlighted schools appear here
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Admin chooses which school profiles should be highlighted in
                  this space.
                </p>
              </div>
            )}
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
