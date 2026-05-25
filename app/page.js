import Link from "next/link";
import { cookies } from "next/headers";
import connectDB from "@/lib/db";
import Achievement from "@/models/Achievement";
import { getPublicFeedItems } from "@/lib/publicFeed";
import { PUBLIC_FEED_VIEWER_COOKIE } from "@/lib/publicFeedViewer";
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

async function getHomepageData(viewerId = "") {
  await connectDB();

  const [winnerHighlights, feed, partnerSpotlights, homeSpotlights] =
    await Promise.all([
      getRecentWinnerHighlights(),
      getPublicFeedItems({ limit: 8, types: ["pulse"], viewerId }),
      getRotatingPartnerSpotlights(5),
      getActiveSchoolPromotions("HOME_SPOTLIGHT", 4, { randomize: true }),
    ]);

  return {
    winnerHighlights,
    feed,
    partnerSpotlights,
    homeSpotlights,
  };
}

function PartnerSpotlightPanel({ partnerSpotlight }) {
  const portfolioHref =
    partnerSpotlight.isPortfolioPublic && partnerSpotlight.slug
      ? `/partners/${partnerSpotlight.slug}`
      : "";
  const Shell = portfolioHref ? Link : "div";
  const shellProps = portfolioHref ? { href: portfolioHref } : {};
  const partnerLabel =
    partnerSpotlight.primaryEvent?.title || "Approved platform partner";
  const hasEvents = partnerSpotlight.activeEventCount > 0;

  return (
    <Shell
      {...shellProps}
      className={`group flex h-full flex-col overflow-hidden rounded-[30px] border border-[#c5d8f4] bg-[linear-gradient(180deg,#12386f_0%,#0d2a57_100%)] text-[#f9fbff] shadow-[0_18px_40px_rgba(8,24,51,0.18)] ${
        portfolioHref
          ? "transition hover:-translate-y-0.5 hover:shadow-lg"
          : ""
      }`}
    >
      <div className="flex flex-1 flex-col justify-between p-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/12 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-[#eef6ff] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            <FaHandshake />
            Partner Spotlight
          </div>
          <h2
            className="mt-4 text-2xl font-black tracking-tight"
            style={{ color: "#f9fbff" }}
          >
            {partnerSpotlight.name}
          </h2>
          <p className="mt-2 text-sm font-semibold text-[#cfe2ff]">
            {partnerLabel}
          </p>
          <p className="mt-3 line-clamp-4 text-sm leading-6 text-[#e3ecf9]">
            {partnerSpotlight.description}
          </p>
        </div>
        <div className="mt-6">
          <div className="rounded-2xl border border-[#3c5f93] bg-[#315182] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#f1f6ff]">
              {hasEvents ? "Active public events" : "Partner status"}
            </p>
            <p className="mt-2 text-sm font-semibold text-[#ffffff]">
              {hasEvents
                ? `${partnerSpotlight.activeEventCount} public event${
                    partnerSpotlight.activeEventCount === 1 ? "" : "s"
                  }`
                : "Selected for homepage visibility"}
            </p>
            <p className="mt-2 text-xs leading-5 text-[#dce7f7]">
              {hasEvents
                ? "Shown by admin selection with event context when available."
                : "This partner can be highlighted before a public event is attached."}
            </p>
          </div>
          <span className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/8 px-3 py-2 text-sm font-black text-[#f7fbff]">
            {portfolioHref ? "View portfolio" : "Homepage partner"}
            {portfolioHref && <FaArrowRight />}
          </span>
        </div>
      </div>
    </Shell>
  );
}

function MobileSectionHeader({ eyebrow, title, href, cta }) {
  return (
    <div className="flex items-end justify-between gap-3 px-1">
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#0a2f66]">
          {eyebrow}
        </p>
        <h2 className="mt-1 text-xl font-black text-slate-950">{title}</h2>
      </div>
      {href && cta ? (
        <Link
          href={href}
          className="inline-flex items-center gap-2 text-sm font-black text-[#0a2f66]"
        >
          {cta}
          <FaArrowRight className="text-xs" />
        </Link>
      ) : null}
    </div>
  );
}

function MobileSchoolRailCard({ promotion }) {
  const image = promotion.profile?.coverImageUrl;
  const location = promotion.school.location || "";
  const summary =
    promotion.profile?.tagline || promotion.tagline || "Recognized on Pratyo";

  return (
    <Link
      href={promotion.href}
      className="group relative block h-[210px] w-[142px] shrink-0 overflow-hidden rounded-[24px] border border-[#cfe0f6] bg-[#0a2f66] shadow-[0_14px_28px_rgba(10,47,102,0.16)]"
    >
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: image
            ? `linear-gradient(180deg, rgba(7,24,51,0.06) 0%, rgba(7,24,51,0.12) 34%, rgba(7,24,51,0.88) 100%), url(${image})`
            : "linear-gradient(180deg, #2f7fdb 0%, #174488 48%, #0a2f66 100%)",
        }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0)_24%,rgba(255,255,255,0)_100%)]" />
      <div className="top-school-badge absolute left-3 top-3 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em]">
        Top school
      </div>
      <div className="absolute inset-x-0 bottom-0 p-3.5 text-white">
        <div className="pt-8">
          <h3 className="line-clamp-2 text-[17px] font-black leading-[1.08] text-white">
            {promotion.title}
          </h3>
          <p className="mt-2 line-clamp-1 text-[11px] font-semibold text-[#d8e8ff]">
            {location || summary}
          </p>
        </div>
      </div>
    </Link>
  );
}

export default async function Home() {
  const viewerId = (await cookies()).get(PUBLIC_FEED_VIEWER_COOKIE)?.value || "";
  const { winnerHighlights, feed, partnerSpotlights, homeSpotlights } =
    await getHomepageData(viewerId);
  const partnerSpotlight = partnerSpotlights[0] || null;

  return (
    <main className="min-h-screen bg-[#f5f1e8] text-slate-950 selection:bg-[#2f7fdb]/20">
      <PublicSiteNav active="home" />

      <section className="lg:hidden">
        <div className="mx-auto max-w-7xl space-y-2 py-4 pb-32">
          <div>
            <div className="px-4 sm:px-6">
              <MobileSectionHeader
                eyebrow="Discover"
                title="Top Schools"
                href="/schools"
                cta="See all"
              />
            </div>
            <div className="mt-4 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-4 pb-1 sm:px-6">
              {homeSpotlights.length > 0 ? (
                homeSpotlights.map((promotion) => (
                  <div key={promotion.id} className="snap-start">
                    <MobileSchoolRailCard promotion={promotion} />
                  </div>
                ))
              ) : (
                <div className="w-full rounded-[24px] border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
                  Highlighted schools will appear here after admin selection.
                </div>
              )}
            </div>
          </div>

          <div className="w-full">
            <PublicFeedList
              initialItems={feed.items}
              initialCursor={feed.nextCursor}
              initialHasMore={feed.hasMore}
              feedType="pulse"
            />
          </div>
        </div>
      </section>

      <section className="hidden border-b border-[#d7cdbb] bg-[#f8fbff] lg:block">
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
              <PartnerSpotlightPanel partnerSpotlight={partnerSpotlight} />
            ) : (
              <div className="rounded-[30px] border border-[#d7cdbb] bg-white p-6 shadow-sm">
                <div className="inline-flex items-center gap-2 rounded-full bg-[#eaf2ff] px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-[#0a2f66]">
                  <FaHandshake />
                  Partner Spotlight
                </div>
                <h2 className="mt-4 text-2xl font-black text-slate-950">
                  Partner highlights appear here
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Admin can highlight approved event partners here. Public
                  portfolio and event links stay optional.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto hidden max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid lg:h-[calc(100vh-7rem)] lg:grid-cols-[230px_minmax(0,1fr)_330px] lg:items-start">
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

      <footer className="hidden border-t border-[#d7cdbb] px-4 py-8 pb-28 text-center text-sm text-slate-500 sm:px-6 lg:block lg:pb-8">
        <p>
          &copy; 2026 Pratyo. Student talent, school recognition, public events,
          and verified certificates.
        </p>
      </footer>
    </main>
  );
}
