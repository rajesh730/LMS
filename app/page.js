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
import PublicExplorePanel from "@/components/public/PublicExplorePanel";
import PublicSiteNav from "@/components/public/PublicSiteNav";
import {
  FaArrowRight,
  FaCalendarAlt,
  FaEllipsisH,
  FaFeatherAlt,
  FaHeart,
  FaMedal,
  FaRegCalendarAlt,
  FaSchool,
  FaShare,
  FaShieldAlt,
  FaStar,
  FaTrophy,
  FaUsers,
} from "react-icons/fa";
import "@/models/PlatformChallenge";
import "@/models/Student";
import "@/models/User";

export const dynamic = "force-dynamic";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1400&q=85";
const NEPAL_FLAG_IMAGE =
  "https://images.unsplash.com/photo-1605649487212-47bdab064df7?auto=format&fit=crop&w=900&q=85";
const FOREST_IMAGE =
  "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=900&q=85";
const BLOSSOM_IMAGE =
  "https://images.unsplash.com/photo-1522383225653-ed111181a951?auto=format&fit=crop&w=900&q=85";
const STUDENT_IMAGE =
  "https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=900&q=85";
const ART_IMAGE =
  "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=900&q=85";

const DEFAULT_STORY = {
  id: "future-of-nepal",
  href: "/student-voices",
  title: "The Future of Nepal",
  content:
    "Nepal's future depends on creativity, hard work, and unity of its young generation. If we are dedicated today, we can build a stronger, happier, and more prosperous tomorrow.",
  author: "Sushmita Neupane",
  schoolName: "Orbit English School",
  category: "Essay",
  date: new Date("2026-05-10"),
  image: NEPAL_FLAG_IMAGE,
  reactionCount: 128,
};

function formatDate(value) {
  if (!value) return "May 10, 2026";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function getPreview(value = "", maxLength = 120) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}...`;
}

function getInitials(value = "P") {
  return String(value)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function getCategoryLabel(value) {
  const label = String(value || "Essay").replaceAll("_", " ").toLowerCase();
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
    .select("title placement awardedAt certificateIssuedAt certificateUrl certificateRecipientName")
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
    schoolHref: achievement.school?._id ? `/schools/${achievement.school._id}` : "",
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
    .limit(5)
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
    image: NEPAL_FLAG_IMAGE,
    reactionCount: 128,
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
    getActiveSchoolPromotions("HOME_SPOTLIGHT", 5, { randomize: true }),
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

function HeroStory({ story, compact = false }) {
  return (
    <section
      className={`relative overflow-hidden rounded-2xl bg-cover bg-center text-white shadow-sm ${
        compact ? "min-h-[210px]" : "min-h-[410px]"
      }`}
      style={{ backgroundImage: `url(${compact ? story.image : HERO_IMAGE})` }}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-[#07111f]/88 via-[#07111f]/35 to-transparent" />
      <div className="relative flex min-h-[inherit] flex-col justify-end p-5 md:p-7">
        <div className="mb-auto flex items-center justify-between">
          <span className="inline-flex items-center gap-2 rounded-lg bg-[#4326e8] px-3 py-1.5 text-xs font-black text-white">
            <FaStar />
            Featured Story
          </span>
        </div>
        <p className="mb-2 inline-flex items-center gap-2 text-xs font-black uppercase text-[#f7b731]">
          <FaTrophy />
          Essay Challenge Winner
        </p>
        <h1 className={`${compact ? "text-2xl" : "text-4xl"} font-black leading-tight text-white`}>
          {story.title}
        </h1>
        <p className="mt-2 text-sm font-bold text-white/90">
          by {story.author}
        </p>
        <p className="mt-1 inline-flex items-center gap-2 text-xs font-bold text-white/85">
          <FaShieldAlt className="text-[#6ea8ff]" />
          {story.schoolName}
        </p>
        {!compact && (
          <p className="mt-4 max-w-sm text-sm leading-6 text-white/86">
            {getPreview(story.content, 150)}
          </p>
        )}
        <Link
          href={story.href}
          className="mt-4 inline-flex w-fit items-center gap-2 text-sm font-black text-white"
        >
          Read Story
          <FaArrowRight />
        </Link>
        <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-2">
          <span className="h-2 w-2 rounded-full bg-[#4326e8]" />
          <span className="h-2 w-2 rounded-full bg-white/80" />
          <span className="h-2 w-2 rounded-full bg-white/55" />
        </div>
      </div>
    </section>
  );
}

function AuthorLine({ name, school, badge = "Published Writing" }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f0edff] text-sm font-black text-[#4326e8]">
        {getInitials(name)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black text-[#111827]">{name}</p>
        <p className="truncate text-xs font-bold text-[#667085]">
          <FaShieldAlt className="mr-1 inline text-[#2f7fdb]" />
          {school}
        </p>
      </div>
      <span className="rounded-full bg-[#f1edff] px-3 py-1 text-[10px] font-black text-[#4326e8]">
        {badge}
      </span>
    </div>
  );
}

function FeedCard({ item, badge = "Published Writing", actions = true }) {
  const voiceHref = item.href || item.schoolHref || "/student-voices";

  return (
    <article className="rounded-2xl border border-[#edf0f7] bg-white p-5 shadow-sm">
      <AuthorLine name={item.author || item.studentLabel || "Student"} school={item.schoolName || "Orbit English School"} badge={badge} />
      <div className="mt-4">
        <div className="min-w-0">
          <h2 className="text-xl font-black leading-tight text-[#111827]">
            {item.title || item.challengeTitle || "Selected student response"}
          </h2>
          <p className="mt-2 line-clamp-3 text-sm leading-6 text-[#4b5565]">
            {getPreview(item.content, 190)}
          </p>
          <Link
            href={voiceHref}
            className="mt-3 inline-flex text-sm font-black text-[#4326e8]"
          >
            Read More
            <FaArrowRight className="ml-2 mt-0.5" />
          </Link>
        </div>
      </div>
      {actions && (
        <div className="mt-5 flex items-center justify-between border-t border-[#f0f2f7] pt-4 text-xs font-bold text-[#4b5565]">
          <span className="inline-flex items-center gap-2">
            <FaHeart className="text-[#ff425f]" />
            {item.reactionCount || 128} Appreciate
          </span>
          <Link href={voiceHref} className="inline-flex items-center gap-2 text-[#3120c9]">
            <FaShare />
            Share Story
          </Link>
        </div>
      )}
    </article>
  );
}

function WinnerCertificateCard({ winner }) {
  return (
    <article className="rounded-2xl border border-[#edf0f7] bg-white p-5 shadow-sm">
      <AuthorLine
        name={winner?.studentName || "Rupak Pandey"}
        school={winner?.schoolName || "Orbit English School"}
        badge="Challenge Winner"
      />
      <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_220px]">
        <div>
          <h2 className="text-xl font-black text-[#111827]">
            {winner?.eventTitle || "Essay Challenge 2026"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#4b5565]">
            {winner?.studentName || "Rupak"} secured First Position in the
            National Essay Challenge 2026 organized by Pratyo.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={winner?.eventHref || "/events"}
              className="inline-flex h-9 items-center rounded-lg border border-[#4326e8] px-3 text-xs font-black text-[#4326e8]"
            >
              Read Winning Essay
            </Link>
            <Link
              href={winner?.certificateHref || "/events"}
              className="inline-flex h-9 items-center rounded-lg bg-[#4326e8] px-3 text-xs font-black text-white"
            >
              View Certificate
            </Link>
          </div>
        </div>
        <div className="rounded-xl border-2 border-[#f3d79b] bg-[#fffaf0] p-4 text-center">
          <p className="text-[10px] font-black uppercase text-[#4326e8]">Pratyo</p>
          <p className="mt-2 text-lg font-black text-[#111827]">Certificate</p>
          <p className="mt-2 text-xs text-[#667085]">of Achievement</p>
          <p className="mt-4 text-base font-black text-[#111827]">
            {winner?.studentName || "Rupak Pandey"}
          </p>
          <FaMedal className="mx-auto mt-4 text-3xl text-[#f7b731]" />
        </div>
      </div>
      <div className="mt-5 flex items-center justify-between border-t border-[#f0f2f7] pt-4 text-xs font-bold text-[#4b5565]">
        <span className="inline-flex items-center gap-2">
          <FaHeart className="text-[#ff425f]" />
          256 Appreciate
        </span>
        <Link
          href={winner?.eventHref || "/events"}
          className="inline-flex items-center gap-2 text-[#3120c9]"
        >
          <FaShare />
          Share Story
        </Link>
      </div>
    </article>
  );
}

function SectionTitle({ title, href = "/" }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-base font-black text-[#111827]">{title}</h2>
      <Link href={href} className="text-xs font-black text-[#4326e8]">
        View all
      </Link>
    </div>
  );
}

function RightColumn({ schools, winners, partner, event }) {
  const topSchools =
    schools.length > 0
      ? schools
      : [
          { id: "orbit", title: "Orbit English School", tagline: "Kathmandu" },
          { id: "unique", title: "Unique Academy", tagline: "Lalitpur" },
          { id: "bright", title: "Bright Future School", tagline: "Pokhara" },
          { id: "hdc", title: "HDC School", tagline: "Chitwan" },
          { id: "little", title: "Little Angels School", tagline: "Bhaktapur" },
        ];

  const recentWinners =
    winners.length > 0
      ? winners
      : [
          { id: "rupak", studentName: "Rupak Pandey", eventTitle: "Essay Challenge 2026" },
          { id: "anisha", studentName: "Anisha Karki", eventTitle: "Science Challenge 2026" },
          { id: "bibek", studentName: "Bibek Shrestha", eventTitle: "Debate Challenge 2026" },
          { id: "prabina", studentName: "Prabina Adhikari", eventTitle: "Poetry Challenge 2026" },
        ];

  return (
    <aside className="hidden space-y-5 lg:block">
      <section className="rounded-2xl border border-[#edf0f7] bg-white p-5 shadow-sm">
        <SectionTitle title="Top Schools This Week" href="/schools" />
        <div className="space-y-4">
          {topSchools.slice(0, 5).map((school, index) => (
            <Link
              key={school.id || school._id || school.title}
              href={school.href || "/schools"}
              className="flex items-center gap-3"
            >
              <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-black ${
                index === 0 ? "bg-[#ffe7a3] text-[#a05a00]" : "bg-[#eef1f8] text-[#667085]"
              }`}>
                {index + 1}
              </span>
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#edf0f7] bg-white text-[#4326e8]">
                <FaSchool />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-black text-[#111827]">
                  {school.title || school.schoolName}
                </span>
                <span className="block truncate text-xs font-bold text-[#667085]">
                  {school.tagline || school.location || "Nepal"}
                </span>
              </span>
              <span className="rounded-full bg-[#f0edff] px-2 py-1 text-[10px] font-black text-[#4326e8]">
                {[125, 98, 76, 64, 52][index]} pts
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-[#edf0f7] bg-white p-5 shadow-sm">
        <SectionTitle title="Recent Winners" href="/winners" />
        <div className="space-y-4">
          {recentWinners.slice(0, 4).map((winner, index) => (
            <Link
              key={winner.id}
              href={winner.eventHref || "/winners"}
              className="flex items-center gap-3"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f2efff] text-sm font-black text-[#4326e8]">
                {getInitials(winner.studentName)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-black text-[#111827]">
                  {winner.studentName}
                </span>
                <span className="block truncate text-xs font-bold text-[#667085]">
                  {winner.eventTitle}
                </span>
              </span>
              <span className={`flex h-8 w-8 items-center justify-center rounded-full ${
                index === 0 ? "bg-[#fff3cf] text-[#c47a00]" : "bg-[#eefaf4] text-[#1f9d64]"
              }`}>
                <FaTrophy />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-2xl bg-[#4326e8] p-6 text-white shadow-xl shadow-[#4326e8]/18">
        <p className="text-sm font-black text-white">Active Challenge</p>
        <div className="mt-5 flex items-start gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/16">
            <FaFeatherAlt className="text-2xl text-white" />
          </span>
          <div>
            <h3 className="font-black text-white">
              {event?.title || "Essay Challenge 2026"}
            </h3>
            <p className="mt-2 text-sm leading-6 text-white/86">
              Write on the theme: Innovation for a Better Tomorrow
            </p>
          </div>
        </div>
        <div className="mt-5 flex items-center justify-between">
          <span className="inline-flex items-center gap-2 text-sm font-bold text-white/88">
            <FaCalendarAlt />
            5 days remaining
          </span>
            <Link
              href={event?.href || "/events"}
            className="inline-flex h-10 items-center rounded-lg bg-white px-5 text-sm font-black text-[#4326e8]"
          >
            Join Challenge
          </Link>
        </div>
      </section>

      <section className="rounded-2xl border border-[#edf0f7] bg-white p-5 shadow-sm">
        <SectionTitle title="Featured Partner" href="/partners" />
        <div className="flex items-center gap-4">
          <div className="text-3xl font-black lowercase text-[#c1262d]">
            {partner?.name?.slice(0, 6) || "vianet"}
          </div>
          <p className="text-sm leading-6 text-[#4b5565]">
            {partner?.description ||
              "Connecting possibilities, empowering education and communities."}
          </p>
        </div>
      </section>
    </aside>
  );
}

function MobileActivityList({ writings, winners, events }) {
  const items = [
    {
      icon: FaTrophy,
      tone: "bg-[#fff6d7] text-[#d98b00]",
      title: winners[0]?.eventTitle || "Won District Debate Competition",
      text: winners[0]
        ? `${winners[0].studentName} won recognition from ${winners[0].schoolName}.`
        : "Our students secured 1st position in the District Level Debate 2026.",
      time: "2h ago",
    },
    {
      icon: FaFeatherAlt,
      tone: "bg-[#f0edff] text-[#4326e8]",
      title: writings[0]?.title ? "Published Essay" : "Published Essay",
      text: writings[0]
        ? `"${writings[0].title}" published by ${writings[0].author}.`
        : '"My Dream Nepal" published by Sushmita Neupane.',
      time: "5h ago",
    },
    {
      icon: FaRegCalendarAlt,
      tone: "bg-[#e9f9ef] text-[#14a05f]",
      title: events[0]?.title || "Science Fair Organized",
      text: events[0]?.description || "Inter School Science Fair successfully hosted.",
      time: "1d ago",
    },
  ];

  return (
    <section>
      <SectionTitle title="Recent Activity" href="/events" />
      <div className="rounded-2xl border border-[#edf0f7] bg-white">
        {items.map((item, index) => {
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              className={`flex gap-3 p-4 ${index > 0 ? "border-t border-[#edf0f7]" : ""}`}
            >
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${item.tone}`}>
                <Icon />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-[#111827]">{item.title}</p>
                <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-[#667085]">
                  {item.text}
                </p>
              </div>
              <span className="text-xs font-bold text-[#667085]">{item.time}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function MobileSchoolScroller({ schools }) {
  const items =
    schools.length > 0
      ? schools
      : [
          { id: "orbit", title: "Orbit English School" },
          { id: "unique", title: "Unique Academy" },
          { id: "bright", title: "Bright Future School" },
          { id: "hdc", title: "HDC School" },
        ];

  return (
    <section>
      <SectionTitle title="Top Schools This Week" href="/schools" />
      <div className="grid grid-cols-4 gap-3">
        {items.slice(0, 4).map((school, index) => (
          <Link
            key={school.id || school.title}
            href={school.href || "/schools"}
            className="relative rounded-xl border border-[#edf0f7] bg-white p-3 text-center shadow-sm"
          >
            <span className={`absolute left-2 top-2 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black ${
              index === 0 ? "bg-[#ffe7a3] text-[#a05a00]" : "bg-[#eef1f8] text-[#667085]"
            }`}>
              {index + 1}
            </span>
            <span className="mx-auto mt-2 flex h-12 w-12 items-center justify-center rounded-full border border-[#edf0f7] text-[#4326e8]">
              <FaSchool />
            </span>
            <p className="mt-2 line-clamp-2 min-h-9 text-xs font-black leading-tight text-[#111827]">
              {school.title}
            </p>
            <span className="mt-2 inline-flex rounded-full bg-[#f0edff] px-2 py-1 text-[10px] font-black text-[#4326e8]">
              {[125, 98, 76, 64][index]} pts
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function MobileWinners({ winners }) {
  const items =
    winners.length > 0
      ? winners
      : [
          { id: "rupak", studentName: "Rupak Pandey" },
          { id: "anisha", studentName: "Anisha Karki" },
          { id: "bibek", studentName: "Bibek Shrestha" },
          { id: "prabina", studentName: "Prabina Adhikari" },
        ];

  return (
    <section>
      <SectionTitle title="Recent Winners" href="/winners" />
      <div className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.slice(0, 5).map((winner) => (
          <Link
            key={winner.id}
            href={winner.eventHref || "/winners"}
            className="shrink-0 text-center"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#f0edff] text-base font-black text-[#4326e8]">
              {getInitials(winner.studentName)}
            </span>
            <p className="mt-2 w-20 truncate text-xs font-black text-[#111827]">
              {winner.studentName}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function MobileVoiceFeed({ story, writings }) {
  const items = [
    story,
    {
      ...DEFAULT_STORY,
      id: "new-beginning",
      title: "A New Beginning",
      author: "Rajesh Shrestha",
      schoolName: "Bright Future School",
      category: "Story",
      image: FOREST_IMAGE,
      content: "Every morning brings new hope and new opportunities to become better.",
      reactionCount: 84,
    },
    {
      ...DEFAULT_STORY,
      id: "hope",
      title: "Hope",
      author: "Prabina Adhikari",
      schoolName: "Creative World School",
      category: "Poem",
      image: BLOSSOM_IMAGE,
      content: "Hope is the light that guides us, even in the darkest times.",
      reactionCount: 72,
    },
    ...(writings || []).slice(1, 2),
  ];

  return (
    <section className="md:hidden">
      <div className="mb-4 flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {["All", "Essay", "Story", "Poem", "Winner"].map((tag, index) => (
          <span
            key={tag}
            className={`shrink-0 rounded-full border px-4 py-2 text-xs font-black ${
              index === 0
                ? "home-primary-action border-[#4326e8] bg-[#4326e8] text-white"
                : "border-[#edf0f7] bg-white text-[#1f2a44]"
            }`}
          >
            {tag}
          </span>
        ))}
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#edf0f7] bg-white">
          <FaEllipsisH />
        </span>
      </div>
      <div className="space-y-4">
        {items.map((item, index) => (
          <article key={item.id || item.title} className="rounded-2xl border border-[#edf0f7] bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <span className="rounded-full bg-[#f0edff] px-3 py-1 text-[10px] font-black text-[#4326e8]">
                {index === 0 ? "Essay Winner" : getCategoryLabel(item.category)}
              </span>
              <span className="text-xs font-bold text-[#667085]">{index === 0 ? "2h ago" : `${index}d ago`}</span>
            </div>
            <AuthorLine name={item.author} school={item.schoolName} badge={getCategoryLabel(item.category)} />
            <h2 className="mt-3 text-lg font-black text-[#111827]">{item.title}</h2>
            <p className="mt-1 line-clamp-2 text-sm leading-6 text-[#4b5565]">
              {getPreview(item.content, 105)}
            </p>
            <div className="mt-3 flex items-center justify-between">
              <Link href={item.href || "/student-voices"} className="text-sm font-black text-[#4326e8]">
                Read Story
              </Link>
              <span className="inline-flex items-center gap-2 text-xs font-bold text-[#4b5565]">
                <FaHeart className="text-[#ff425f]" />
                {item.reactionCount || 84}
              </span>
              <Link
                href={item.href || "/student-voices"}
                className="inline-flex items-center gap-2 text-xs font-bold text-[#3120c9]"
              >
                <FaShare />
                Share
              </Link>
            </div>
          </article>
        ))}
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
  } = await getHomepageData(viewerId);

  const story = latestWritings[0] || DEFAULT_STORY;
  const feedItems =
    latestWritings.length > 0
      ? latestWritings
      : [
          DEFAULT_STORY,
          {
            ...DEFAULT_STORY,
            id: "science-expo",
            title: "Inter School Science Expo 2026",
            author: "Bright Future School",
            schoolName: "Pokhara",
            content:
              "Bright Future School successfully hosted the Inter School Science Expo with participation of 300+ students from 12 schools across Pokhara.",
            image: STUDENT_IMAGE,
            reactionCount: 182,
          },
          {
            ...DEFAULT_STORY,
            id: "young-artists",
            title: "Supporting Young Artists",
            author: "Aastha Kala Kendra",
            schoolName: "Partner",
            content:
              "Aastha Kala Kendra is committed to nurturing creativity and providing a platform for young talents to shine.",
            image: ART_IMAGE,
            reactionCount: 64,
          },
        ];
  const activeEvent = upcomingEvents[0] || null;
  const partner = partnerSpotlights[0] || null;

  return (
    <main className="pratyo-home-shell min-h-screen bg-[#fbfcff] text-[#111827]">
      <PublicSiteNav active="home" />

      <div className="mx-auto grid max-w-[1480px] gap-6 px-4 pb-28 pt-5 md:px-5 md:pb-10 xl:grid-cols-[230px_minmax(0,1fr)]">
        <PublicExplorePanel active="home" variant="home" />

        <div className="min-w-0">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-w-0 space-y-5">
              <div className="hidden md:block">
                <HeroStory story={story} />
              </div>

              <div className="md:hidden">
                <HeroStory story={story} compact />
              </div>

              <div className="hidden space-y-5 md:block">
                <FeedCard item={feedItems[0]} />
                <WinnerCertificateCard winner={winnerHighlights[0]} />
                <FeedCard
                  item={feedItems[1] || featuredResponses[0] || DEFAULT_STORY}
                  badge="School Spotlight"
                />
                <FeedCard
                  item={feedItems[2] || DEFAULT_STORY}
                  badge="Partner Spotlight"
                />
              </div>

              <div className="space-y-6 md:hidden">
                <MobileActivityList
                  writings={latestWritings}
                  winners={winnerHighlights}
                  events={upcomingEvents}
                />
                <section className="rounded-2xl bg-[#4326e8] p-5 text-white shadow-xl shadow-[#4326e8]/18">
                  <div className="flex items-center gap-4">
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/16">
                      <FaFeatherAlt className="text-2xl text-white" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h2 className="font-black text-white">
                        {activeEvent?.title || "Essay Challenge 2026"}
                      </h2>
                      <p className="mt-1 text-xs leading-5 text-white/86">
                        Write on the theme: Innovation for a Better Tomorrow
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="inline-flex items-center gap-2 text-xs font-bold text-white/88">
                      <FaCalendarAlt />
                      5 days remaining
                    </span>
                    <Link
                      href={activeEvent?.href || "/events"}
                      className="inline-flex h-10 items-center rounded-lg bg-white px-5 text-xs font-black text-[#4326e8]"
                    >
                      Join Challenge
                    </Link>
                  </div>
                </section>
                <MobileSchoolScroller schools={homeSpotlights} />
                <MobileWinners winners={winnerHighlights} />
                <MobileVoiceFeed story={story} writings={latestWritings} />
              </div>
            </div>

            <RightColumn
              schools={homeSpotlights}
              winners={winnerHighlights}
              partner={partner}
              event={activeEvent}
            />
          </div>
        </div>
      </div>

    </main>
  );
}
