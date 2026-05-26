import Link from "next/link";
import { cookies } from "next/headers";
import connectDB from "@/lib/db";
import Achievement from "@/models/Achievement";
import Event from "@/models/Event";
import SchoolMagazineArticle from "@/models/SchoolMagazineArticle";
import User from "@/models/User";
import { getPublicFeedItems } from "@/lib/publicFeed";
import { PUBLIC_FEED_VIEWER_COOKIE } from "@/lib/publicFeedViewer";
import { getRotatingPartnerSpotlights } from "@/lib/partnerSpotlights";
import { getActiveSchoolPromotions } from "@/lib/schoolPromotions";
import PublicSiteNav from "@/components/public/PublicSiteNav";
import {
  FaArrowRight,
  FaAward,
  FaBell,
  FaBookOpen,
  FaCalendarAlt,
  FaCertificate,
  FaCheckCircle,
  FaFeatherAlt,
  FaGraduationCap,
  FaHandshake,
  FaHeart,
  FaMedal,
  FaPenNib,
  FaRegBookmark,
  FaSchool,
  FaStar,
  FaTrophy,
  FaUsers,
} from "react-icons/fa";
import "@/models/PlatformChallenge";
import "@/models/Student";
import "@/models/User";

export const dynamic = "force-dynamic";

function formatDate(value) {
  if (!value) return "Date to be announced";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function getPreview(value = "", maxLength = 120) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}...`;
}

function getReadTime(content = "") {
  const words = String(content || "").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 180));
}

function getCategoryLabel(value) {
  const label = String(value || "Writing").replaceAll("_", " ").toLowerCase();
  return label.charAt(0).toUpperCase() + label.slice(1);
}

async function getRecentWinnerHighlights() {
  const achievements = await Achievement.find({
    isPublic: true,
    placement: "WINNER",
    recipientType: "STUDENT",
    student: { $ne: null },
    certificateIssuedAt: { $ne: null },
  })
    .select(
      "title placement awardedAt certificateIssuedAt certificateUrl certificateRecipientName"
    )
    .sort({ awardedAt: -1, createdAt: -1 })
    .limit(6)
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

async function getLatestStudentWritings() {
  const articles = await SchoolMagazineArticle.find({
    status: "APPROVED",
    isPublished: true,
    isDeleted: { $ne: true },
  })
    .select("title content category publishedAt updatedAt")
    .sort({ publishedAt: -1, updatedAt: -1 })
    .limit(4)
    .populate("authorStudent", "name grade")
    .populate("school", "schoolName")
    .lean();

  return articles.map((article) => ({
    id: String(article._id),
    href: `/writings/${article._id}`,
    title: article.title,
    content: article.content,
    category: article.category || "WRITING",
    date: article.publishedAt || article.updatedAt,
    author: article.authorStudent?.name || "Student",
    schoolName: article.school?.schoolName || "School",
    schoolHref: article.school?._id ? `/schools/${article.school._id}` : "",
  }));
}

async function getUpcomingEvents() {
  const events = await Event.find({
    status: "APPROVED",
    visibility: "PUBLIC",
    lifecycleStatus: { $ne: "ARCHIVED" },
    date: { $gte: new Date() },
  })
    .select("title description date eventScope eventType")
    .sort({ date: 1, updatedAt: -1 })
    .limit(4)
    .lean();

  return events.map((event) => ({
    id: String(event._id),
    title: event.title,
    description: event.description,
    date: event.date,
    eventScope: event.eventScope === "PLATFORM" ? "Platform" : "School",
    href: `/events/${event._id}`,
  }));
}

async function getHomepageStats() {
  const [schools, winners, writings, events] = await Promise.all([
    User.countDocuments({ role: "SCHOOL_ADMIN", status: "APPROVED" }),
    Achievement.countDocuments({
      isPublic: true,
      placement: "WINNER",
      certificateIssuedAt: { $ne: null },
    }),
    SchoolMagazineArticle.countDocuments({
      status: "APPROVED",
      isPublished: true,
      isDeleted: { $ne: true },
    }),
    Event.countDocuments({
      status: "APPROVED",
      visibility: "PUBLIC",
      lifecycleStatus: { $ne: "ARCHIVED" },
    }),
  ]);

  return { schools, winners, writings, events };
}

async function getHomepageData(viewerId = "") {
  await connectDB();

  const [
    winnerHighlights,
    feed,
    partnerSpotlights,
    homeSpotlights,
    latestWritings,
    upcomingEvents,
    stats,
  ] = await Promise.all([
    getRecentWinnerHighlights(),
    getPublicFeedItems({ limit: 6, types: ["pulse"], viewerId }),
    getRotatingPartnerSpotlights(4),
    getActiveSchoolPromotions("HOME_SPOTLIGHT", 4, { randomize: true }),
    getLatestStudentWritings(),
    getUpcomingEvents(),
    getHomepageStats(),
  ]);

  return {
    winnerHighlights,
    featuredResponses: feed.items || [],
    partnerSpotlights,
    homeSpotlights,
    latestWritings,
    upcomingEvents,
    stats,
  };
}

function HeroArt() {
  return (
    <div className="relative min-h-[300px] overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-50 via-white to-amber-50">
      <div className="absolute bottom-8 left-10 h-28 w-28 rounded-full bg-sky-200/50 blur-2xl" />
      <div className="absolute right-10 top-10 h-28 w-28 rounded-full bg-amber-200/60 blur-2xl" />
      <div className="absolute bottom-10 right-16 h-36 w-40 rounded-lg border border-amber-200 bg-white/85 shadow-xl" />
      <div className="absolute bottom-20 right-28 h-32 w-48 rotate-[-8deg] rounded-lg border border-indigo-100 bg-white/90 shadow-xl" />
      <FaTrophy className="absolute right-28 top-14 text-7xl text-amber-400" />
      <FaGraduationCap className="absolute bottom-14 left-16 text-6xl text-indigo-600" />
      <FaCertificate className="absolute bottom-20 right-28 text-6xl text-[#0a2f66]" />
      <FaStar className="absolute left-24 top-16 text-xl text-pink-500" />
      <FaStar className="absolute right-20 top-36 text-lg text-purple-500" />
      <FaPenNib className="absolute left-16 bottom-28 text-3xl text-pink-500" />
    </div>
  );
}

function PartnerSpotlightPanel({ partnerSpotlight }) {
  const portfolioHref =
    partnerSpotlight?.isPortfolioPublic && partnerSpotlight?.slug
      ? `/partners/${partnerSpotlight.slug}`
      : "";
  const Shell = portfolioHref ? Link : "div";
  const shellProps = portfolioHref ? { href: portfolioHref } : {};

  if (!partnerSpotlight) {
    return (
      <div className="rounded-2xl border border-[#d7cdbb] bg-[#0a2f66] p-5 text-white shadow-sm">
        <p className="inline-flex items-center gap-2 text-xs font-black uppercase text-[#d7e9ff]">
          <FaHandshake />
          Partner Spotlight
        </p>
        <h2 className="mt-4 text-2xl font-black">Partner highlights appear here</h2>
        <p className="mt-3 text-sm leading-6 text-[#d7e9ff]">
          Approved organizers can be featured with their public event profile.
        </p>
      </div>
    );
  }

  return (
    <Shell
      {...shellProps}
      className="block rounded-2xl border border-[#244b82] bg-[#0a2f66] p-5 text-white shadow-[0_18px_45px_rgba(10,47,102,0.18)] transition hover:-translate-y-0.5"
    >
      <p className="inline-flex items-center gap-2 text-xs font-black uppercase text-[#d7e9ff]">
        <FaHandshake />
        Partner Spotlight
      </p>
      <h2 className="mt-4 text-2xl font-black">{partnerSpotlight.name}</h2>
      <p className="mt-2 text-sm font-bold text-[#d7e9ff]">
        {partnerSpotlight.primaryEvent?.title || "Approved platform partner"}
      </p>
      <p className="mt-3 line-clamp-4 text-sm leading-6 text-[#eaf2ff]">
        {partnerSpotlight.description}
      </p>
      <div className="mt-5 rounded-xl border border-white/15 bg-white/10 p-4">
        <p className="text-xs font-black uppercase text-[#eaf2ff]">
          Partner status
        </p>
        <p className="mt-2 text-sm font-bold">
          {partnerSpotlight.activeEventCount > 0
            ? `${partnerSpotlight.activeEventCount} active public event${
                partnerSpotlight.activeEventCount === 1 ? "" : "s"
              }`
            : "Selected for homepage visibility"}
        </p>
      </div>
      <span className="mt-5 inline-flex items-center gap-2 rounded-lg bg-white/12 px-4 py-2 text-sm font-black text-white">
        {portfolioHref ? "View portfolio" : "Homepage partner"}
        <FaArrowRight />
      </span>
    </Shell>
  );
}

function StatsStrip({ stats, latestWritings }) {
  const items = [
    [FaUsers, stats.schools, "Schools joined"],
    [FaTrophy, stats.winners, "Winners celebrated"],
    [FaFeatherAlt, stats.writings, "Published writings"],
    [FaCalendarAlt, stats.events, "Events happening soon"],
  ];

  return (
    <section className="rounded-2xl border border-[#d7cdbb] bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="inline-flex items-center gap-2 text-sm font-black text-[#17120a]">
          <FaStar className="text-purple-600" />
          What&apos;s happening today
        </h2>
        <Link
          href="/events"
          className="text-sm font-black text-[#0a2f66] hover:text-purple-700"
        >
          View all activity
        </Link>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-4">
        {items.map(([Icon, value, label]) => (
          <div
            key={label}
            className="flex items-center gap-3 rounded-xl border border-[#e8decd] bg-[#f8fbff] px-4 py-3"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-purple-700 shadow-sm">
              <Icon />
            </span>
            <div>
              <p className="text-xl font-black text-[#17120a]">{value}</p>
              <p className="text-xs font-semibold text-[#52657d]">{label}</p>
            </div>
          </div>
        ))}
      </div>
      {latestWritings.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {["All", "Nepali Events", "Essay", "Leadership", "Science", "Creativity"].map(
            (tag) => (
              <span
                key={tag}
                className="rounded-full bg-purple-50 px-3 py-1.5 text-xs font-bold text-purple-700"
              >
                {tag}
              </span>
            )
          )}
        </div>
      )}
    </section>
  );
}

function FeaturedResponseCard({ item, featured = false }) {
  return (
    <article className="overflow-hidden rounded-xl border border-[#e7dcc8] bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div
        className={`relative bg-gradient-to-br ${
          featured
            ? "from-amber-100 via-white to-sky-100"
            : "from-indigo-100 via-white to-emerald-100"
        } p-4`}
      >
        <div className="h-28 rounded-lg border border-white/80 bg-white/65 shadow-sm" />
        <span className="absolute left-5 top-5 rounded-full bg-amber-400 px-3 py-1 text-[10px] font-black uppercase text-white">
          {featured ? "Featured" : getCategoryLabel(item.category)}
        </span>
        <FaFeatherAlt className="absolute bottom-6 right-7 text-3xl text-purple-600" />
      </div>
      <div className="p-4">
        <h3 className="line-clamp-2 text-base font-black text-[#17120a]">
          {item.title || item.challengeTitle || "Selected student response"}
        </h3>
        <p className="mt-2 line-clamp-3 text-sm leading-6 text-[#52657d]">
          {getPreview(item.content, 140)}
        </p>
        <div className="mt-4 flex items-center justify-between gap-3 text-xs font-semibold text-[#52657d]">
          <span>{item.studentLabel || "Student"}</span>
          <span>{formatDate(item.date)}</span>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <span className="inline-flex items-center gap-2 text-xs font-bold text-[#52657d]">
            <FaHeart className="text-pink-500" />
            {item.reactionCount || 0} likes
          </span>
          {item.schoolHref && (
            <Link
              href={item.schoolHref}
              className="text-sm font-black text-purple-700 hover:text-[#0a2f66]"
            >
              Read more
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

function LatestWritingRow({ writing }) {
  return (
    <Link
      href={writing.href}
      className="grid gap-3 rounded-xl border border-[#e7dcc8] bg-white p-3 transition hover:border-purple-200 hover:bg-[#fffdf8] hover:shadow-sm sm:grid-cols-[96px_1fr_auto]"
    >
      <div className="h-20 rounded-lg bg-gradient-to-br from-rose-100 via-white to-amber-100">
        <FaBookOpen className="ml-auto mr-4 mt-4 text-3xl text-purple-600" />
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase text-emerald-700">
            Published
          </span>
          <span className="rounded-full bg-purple-50 px-2.5 py-1 text-[10px] font-black uppercase text-purple-700">
            {getCategoryLabel(writing.category)}
          </span>
        </div>
        <h3 className="mt-2 line-clamp-1 text-sm font-black text-[#17120a]">
          {writing.title}
        </h3>
        <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#52657d]">
          {getPreview(writing.content, 120)}
        </p>
        <p className="mt-2 text-xs font-semibold text-[#75869b]">
          By {writing.author} - {writing.schoolName} - {formatDate(writing.date)} -{" "}
          {getReadTime(writing.content)} min read
        </p>
      </div>
      <span
        aria-hidden="true"
        className="flex h-10 w-10 items-center justify-center self-start rounded-lg border border-[#e7dcc8] text-[#0a2f66] transition group-hover:bg-[#f8fbff]"
      >
        <FaRegBookmark />
      </span>
    </Link>
  );
}

function WinnerPanel({ winners }) {
  return (
    <section className="rounded-2xl border border-[#e7dcc8] bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="inline-flex items-center gap-2 text-sm font-black text-[#17120a]">
          <FaTrophy className="text-amber-500" />
          Congrats Winners
        </h2>
        <Link href="/events" className="text-xs font-black text-purple-700">
          View all
        </Link>
      </div>
      <div className="mt-4 space-y-3">
        {winners.length === 0 ? (
          <p className="text-sm leading-6 text-[#52657d]">
            Public winners appear here after event results are published.
          </p>
        ) : (
          winners.slice(0, 4).map((winner, index) => (
            <div key={winner.id} className="flex items-start gap-3">
              <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-50 text-xs font-black text-amber-700">
                {index + 1}
              </span>
              <div className="min-w-0">
                <p className="line-clamp-1 text-sm font-black text-[#17120a]">
                  {winner.studentName}
                </p>
                <p className="line-clamp-1 text-xs text-[#52657d]">
                  {winner.eventTitle}
                </p>
                <p className="line-clamp-1 text-xs font-semibold text-[#75869b]">
                  {winner.schoolName}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function SchoolSpotlightPanel({ spotlights }) {
  return (
    <section className="rounded-2xl border border-[#e7dcc8] bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="inline-flex items-center gap-2 text-sm font-black text-[#17120a]">
          <FaSchool className="text-[#0a2f66]" />
          School Spotlight
        </h2>
        <Link href="/schools" className="text-xs font-black text-purple-700">
          View all
        </Link>
      </div>
      <div className="mt-4 space-y-3">
        {spotlights.length === 0 ? (
          <p className="text-sm leading-6 text-[#52657d]">
            Highlighted schools appear here after admin selection.
          </p>
        ) : (
          spotlights.slice(0, 2).map((promotion) => (
            <Link
              key={promotion.id}
              href={promotion.href}
              className="grid gap-3 rounded-xl border border-[#e7dcc8] bg-[#f8fbff] p-3 transition hover:bg-white sm:grid-cols-[84px_1fr]"
            >
              <div
                className="h-20 rounded-lg bg-cover bg-center"
                style={{
                  backgroundImage: promotion.profile?.coverImageUrl
                    ? `linear-gradient(rgba(7,24,51,0.05), rgba(7,24,51,0.2)), url(${promotion.profile.coverImageUrl})`
                    : "linear-gradient(135deg, #eaf2ff, #fef3c7)",
                }}
              />
              <div className="min-w-0">
                <h3 className="line-clamp-1 text-sm font-black text-[#17120a]">
                  {promotion.title}
                </h3>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#52657d]">
                  {promotion.tagline}
                </p>
                <span className="mt-2 inline-flex text-xs font-black text-purple-700">
                  View profile
                </span>
              </div>
            </Link>
          ))
        )}
      </div>
    </section>
  );
}

function UpcomingEventsPanel({ events }) {
  return (
    <section className="rounded-2xl border border-[#e7dcc8] bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="inline-flex items-center gap-2 text-sm font-black text-[#17120a]">
          <FaCalendarAlt className="text-red-500" />
          Upcoming Events
        </h2>
        <Link href="/events" className="text-xs font-black text-purple-700">
          View all
        </Link>
      </div>
      <div className="mt-4 space-y-3">
        {events.length === 0 ? (
          <p className="text-sm leading-6 text-[#52657d]">
            Public events will appear here when registration opens.
          </p>
        ) : (
          events.map((event) => {
            const date = new Date(event.date);
            return (
              <Link
                key={event.id}
                href={event.href}
                className="flex items-center gap-3 rounded-xl border border-[#e7dcc8] bg-[#fffdf8] p-3 transition hover:bg-white"
              >
                <span className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-purple-50 text-purple-700">
                  <strong className="text-base leading-none">
                    {date.getDate()}
                  </strong>
                  <span className="text-[10px] font-black uppercase">
                    {date.toLocaleDateString("en-US", { month: "short" })}
                  </span>
                </span>
                <div className="min-w-0">
                  <h3 className="line-clamp-1 text-sm font-black text-[#17120a]">
                    {event.title}
                  </h3>
                  <p className="line-clamp-1 text-xs text-[#52657d]">
                    {event.eventScope} event
                  </p>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </section>
  );
}

export default async function Home() {
  const viewerId = (await cookies()).get(PUBLIC_FEED_VIEWER_COOKIE)?.value || "";
  const {
    winnerHighlights,
    featuredResponses,
    partnerSpotlights,
    homeSpotlights,
    latestWritings,
    upcomingEvents,
    stats,
  } = await getHomepageData(viewerId);
  const partnerSpotlight = partnerSpotlights[0] || null;

  return (
    <main className="min-h-screen bg-[#f5f1e8] text-[#17120a] selection:bg-purple-200/60">
      <PublicSiteNav active="home" />

      <div className="mx-auto max-w-7xl space-y-5 px-4 py-5 pb-20 sm:px-6 lg:py-6">
        <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="overflow-hidden rounded-2xl border border-[#d7cdbb] bg-white p-5 shadow-sm md:p-7">
            <div className="grid gap-6 lg:grid-cols-[1fr_0.82fr] lg:items-center">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-purple-50 px-3 py-1.5 text-xs font-black uppercase text-purple-700">
                  <FaBell />
                  Public Platform
                </span>
                <h1 className="mt-5 max-w-3xl text-4xl font-black leading-tight text-[#17120a] md:text-5xl">
                  Discover student <span className="text-purple-700">talent</span>{" "}
                  and school achievements
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-[#52657d] md:text-base">
                  Pratyo shows selected student writing, event results, public
                  events, certificates, school spotlights, and active event
                  organizers in one social-style discovery page.
                </p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/register"
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0a2f66] px-5 py-3 text-sm font-black text-white shadow-lg shadow-[#0a2f66]/15 transition hover:bg-[#123f82]"
                  >
                    Register your school
                    <FaArrowRight />
                  </Link>
                  <Link
                    href="/partners"
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#d7cdbb] bg-white px-5 py-3 text-sm font-black text-[#0a2f66] transition hover:bg-[#f8fbff]"
                  >
                    Explore partnership
                    <FaHandshake />
                  </Link>
                </div>
              </div>
              <HeroArt />
            </div>
          </div>

          <PartnerSpotlightPanel partnerSpotlight={partnerSpotlight} />
        </section>

        <StatsStrip stats={stats} latestWritings={latestWritings} />

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_330px]">
          <main className="space-y-5">
            <section className="rounded-2xl border border-[#d7cdbb] bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="inline-flex items-center gap-2 text-lg font-black text-[#17120a]">
                  <FaStar className="text-purple-600" />
                  Featured Responses
                </h2>
                <Link
                  href="/challenges"
                  className="text-sm font-black text-purple-700 hover:text-[#0a2f66]"
                >
                  View all responses
                </Link>
              </div>

              {featuredResponses.length === 0 ? (
                <div className="mt-5 rounded-xl border border-dashed border-[#d7cdbb] bg-[#f8fbff] p-8 text-center text-sm text-[#52657d]">
                  Selected student responses will appear here after Pratyo Pulse
                  publishes them.
                </div>
              ) : (
                <div className="mt-5 grid gap-4 md:grid-cols-3">
                  {featuredResponses.slice(0, 3).map((item, index) => (
                    <FeaturedResponseCard
                      key={item.id}
                      item={item}
                      featured={index === 0}
                    />
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-[#d7cdbb] bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="inline-flex items-center gap-2 text-lg font-black text-[#17120a]">
                  <FaBookOpen className="text-purple-600" />
                  Latest Student Writings
                </h2>
                <Link
                  href="/schools"
                  className="text-sm font-black text-purple-700 hover:text-[#0a2f66]"
                >
                  Explore schools
                </Link>
              </div>

              {latestWritings.length === 0 ? (
                <div className="mt-5 rounded-xl border border-dashed border-[#d7cdbb] bg-[#f8fbff] p-8 text-center text-sm text-[#52657d]">
                  Published school magazine writing will appear here after
                  schools make articles live.
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  {latestWritings.map((writing) => (
                    <LatestWritingRow key={writing.id} writing={writing} />
                  ))}
                </div>
              )}
            </section>
          </main>

          <aside className="space-y-5">
            <WinnerPanel winners={winnerHighlights} />
            <SchoolSpotlightPanel spotlights={homeSpotlights} />
            <UpcomingEventsPanel events={upcomingEvents} />
          </aside>
        </div>

        <section className="grid gap-4 rounded-2xl border border-[#d7cdbb] bg-white p-4 shadow-sm md:grid-cols-3">
          {[
            [FaHeart, "Student First", "We celebrate every student dream with recognition."],
            [FaSchool, "School Empowerment", "We help schools showcase talent and build reputation."],
            [FaUsers, "Community Driven", "Together we create a strong educational ecosystem."],
          ].map(([Icon, title, text]) => (
            <div key={title} className="flex gap-3 rounded-xl bg-[#f8fbff] p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-purple-700 shadow-sm">
                <Icon />
              </span>
              <div>
                <h3 className="text-sm font-black text-[#17120a]">{title}</h3>
                <p className="mt-1 text-xs leading-5 text-[#52657d]">{text}</p>
              </div>
            </div>
          ))}
        </section>
      </div>

      <footer className="border-t border-[#d7cdbb] px-4 py-6 text-center text-sm text-[#52657d]">
        <p>
          &copy; 2026 Pratyo. Student talent, school recognition, public events,
          and verified certificates.
        </p>
      </footer>
    </main>
  );
}
