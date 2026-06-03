import Link from "next/link";
import connectDB from "@/lib/db";
import Event from "@/models/Event";
import SchoolPromotion from "@/models/SchoolPromotion";
import SchoolMagazineArticle from "@/models/SchoolMagazineArticle";
import { getRotatingPartnerSpotlights } from "@/lib/partnerSpotlights";
import { getActiveSchoolPromotions } from "@/lib/schoolPromotions";
import HomepageHeroCarousel from "@/components/public/HomepageHeroCarousel";
import HomeScrollMemory from "@/components/public/HomeScrollMemory";
import PublicExplorePanel from "@/components/public/PublicExplorePanel";
import PublicSiteNav from "@/components/public/PublicSiteNav";
import SchoolLogoMark from "@/components/public/SchoolLogoMark";
import {
  FaArrowRight,
  FaCalendarAlt,
  FaFeatherAlt,
  FaRegCalendarAlt,
  FaSchool,
  FaShieldAlt,
} from "react-icons/fa";
import "@/models/Student";
import "@/models/User";

export const dynamic = "force-dynamic";

function formatDate(value) {
  if (!value) return "";
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
  const label = String(value || "Writing").replaceAll("_", " ").toLowerCase();
  return label.charAt(0).toUpperCase() + label.slice(1);
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
  }));
}

async function getPremiumSpotlightStudentWritings() {
  const premiumPromotions = await SchoolPromotion.find({
    placement: "HOME_SPOTLIGHT",
    status: "ACTIVE",
    paymentStatus: "PAID",
    priority: "PREMIUM",
  })
    .select("school")
    .lean();

  const premiumSchoolIds = [
    ...new Set(
      premiumPromotions
        .map((promotion) => promotion.school)
        .filter(Boolean)
        .map((schoolId) => String(schoolId))
    ),
  ];

  if (premiumSchoolIds.length === 0) return [];

  const articles = await SchoolMagazineArticle.find({
    status: "APPROVED",
    isPublished: true,
    isDeleted: { $ne: true },
    school: { $in: premiumSchoolIds },
  })
    .select("title content category publishedAt updatedAt")
    .sort({ publishedAt: -1, updatedAt: -1 })
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

async function getHomepageData() {
  await connectDB();

  const [
    partnerSpotlights,
    homeSpotlights,
    premiumSpotlightWritings,
    latestWritings,
    upcomingEvents,
  ] = await Promise.all([
    getRotatingPartnerSpotlights(1),
    getActiveSchoolPromotions("HOME_SPOTLIGHT", 5, { randomize: true }),
    getPremiumSpotlightStudentWritings(),
    getLatestStudentWritings(),
    getUpcomingEvents(),
  ]);

  return {
    partnerSpotlights,
    homeSpotlights,
    premiumSpotlightWritings,
    latestWritings,
    upcomingEvents,
  };
}

function EmptyPanel({ title, description, href = "", action = "" }) {
  return (
    <section className="rounded-2xl border border-[#edf0f7] bg-white p-6 text-center shadow-sm">
      <FaFeatherAlt className="mx-auto text-2xl text-[#4326e8]" />
      <h2 className="mt-3 text-lg font-black text-[#111827]">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#667085]">
        {description}
      </p>
      {href && action && (
        <Link
          href={href}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#4326e8] px-4 py-2 text-sm font-black text-white"
        >
          {action}
          <FaArrowRight />
        </Link>
      )}
    </section>
  );
}

function AuthorLine({ name, school, badge = "Published Writing", onBrand = false }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-black ${
          onBrand
            ? "border border-white/25 bg-white/14 text-white"
            : "bg-[#f0edff] text-[#4326e8]"
        }`}
      >
        {getInitials(name)}
      </span>
      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm font-black ${onBrand ? "text-white" : "text-[#111827]"}`}>
          {name}
        </p>
        <p className={`truncate text-xs font-bold ${onBrand ? "text-white/78" : "text-[#667085]"}`}>
          <FaShieldAlt className={`mr-1 inline ${onBrand ? "text-white/72" : "text-[#2f7fdb]"}`} />
          {school}
        </p>
      </div>
      <span
        className={`rounded-full px-3 py-1 text-[10px] font-black ${
          onBrand ? "bg-white text-[#0d3d47]" : "bg-[#f1edff] text-[#4326e8]"
        }`}
      >
        {badge}
      </span>
    </div>
  );
}

function FeedCard({ item, badge = "Published Writing", actions = true }) {
  const voiceHref = item.href || item.schoolHref || "/student-voices";

  return (
    <article className="rounded-2xl border border-[#edf0f7] bg-white p-5 text-[#111827] shadow-sm">
      <AuthorLine
        name={item.author || item.studentLabel || "Student"}
        school={item.schoolName || "School"}
        badge={badge}
      />
      <div className="mt-4">
        <div className="min-w-0">
          <h2 className="text-xl font-black leading-tight text-[#111827]">
            {item.title || "Published student writing"}
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
          <span>{formatDate(item.date)}</span>
          <Link href={voiceHref} className="inline-flex items-center gap-2 text-[#3120c9]">
            Open
            <FaArrowRight />
          </Link>
        </div>
      )}
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

function RightColumn({ schools, partner, event }) {
  return (
    <aside className="hidden space-y-5 lg:block">
      {schools.length > 0 && (
        <section className="rounded-2xl border border-[#edf0f7] bg-white p-5 shadow-sm">
          <SectionTitle title="Featured Schools" href="/schools" />
          <div className="space-y-4">
            {schools.slice(0, 5).map((school) => (
              <Link
                key={school.id || school._id || school.title}
                href={school.href || "/schools"}
                className="flex items-center gap-3"
              >
                <SchoolLogoMark
                  imageUrl={school.profile?.coverImageUrl}
                  name={school.title || school.schoolName}
                  className="h-10 w-10"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-black text-[#111827]">
                    {school.title || school.schoolName}
                  </span>
                  <span className="block truncate text-xs font-bold text-[#667085]">
                    {school.tagline || school.location || "School profile"}
                  </span>
                </span>
                <FaArrowRight className="text-xs text-[#4326e8]" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {event && (
        <section className="pratyo-brand-surface rounded-2xl p-6 text-white shadow-xl shadow-slate-950/12">
          <p className="text-sm font-black text-white">Upcoming Event</p>
          <div className="mt-5 flex items-start gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/16">
              <FaCalendarAlt className="text-2xl text-white" />
            </span>
            <div>
              <h3 className="font-black text-white">{event.title}</h3>
              <p className="mt-2 text-sm leading-6 text-white/86">
                {getPreview(event.description, 110)}
              </p>
            </div>
          </div>
          <div className="mt-5 flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-sm font-bold text-white/88">
              <FaCalendarAlt />
              {formatDate(event.date)}
            </span>
            <Link
              href={event.href}
              className="inline-flex h-10 items-center rounded-lg bg-white px-5 text-sm font-black text-[#4326e8]"
            >
              View Event
            </Link>
          </div>
        </section>
      )}

      {partner && (
        <section className="rounded-2xl border border-[#edf0f7] bg-white p-5 shadow-sm">
          <SectionTitle title="Featured Partner" href="/partners" />
          <div className="flex items-center gap-4">
            <div className="text-3xl font-black text-[#c1262d]">
              {partner.name}
            </div>
            <p className="text-sm leading-6 text-[#4b5565]">
              {partner.description}
            </p>
          </div>
        </section>
      )}
    </aside>
  );
}

function MobileActivityList({ writings, events }) {
  const items = [];

  if (writings[0]) {
    items.push({
      icon: FaFeatherAlt,
      tone: "bg-[#f0edff] text-[#4326e8]",
      title: writings[0].title,
      text: `Published by ${writings[0].author}.`,
      time: formatDate(writings[0].date),
    });
  }

  if (events[0]) {
    items.push({
      icon: FaRegCalendarAlt,
      tone: "bg-[#e9f9ef] text-[#14a05f]",
      title: events[0].title,
      text: events[0].description,
      time: formatDate(events[0].date),
    });
  }

  if (items.length === 0) return null;

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
  if (schools.length === 0) return null;

  return (
    <section>
      <SectionTitle title="Featured Schools" href="/schools" />
      <div className="grid grid-cols-4 gap-3">
        {schools.slice(0, 4).map((school) => (
          <Link
            key={school.id || school.title}
            href={school.href || "/schools"}
            className="relative rounded-xl border border-[#edf0f7] bg-white p-3 text-center shadow-sm"
          >
            <SchoolLogoMark
              imageUrl={school.profile?.coverImageUrl}
              name={school.title}
              className="mx-auto mt-2 h-12 w-12"
            />
            <p className="mt-2 line-clamp-2 min-h-9 text-xs font-black leading-tight text-[#111827]">
              {school.title}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function MobileVoiceFeed({ writings }) {
  const items = writings;
  if (items.length === 0) return null;
  const tags = ["All", ...new Set(items.map((item) => getCategoryLabel(item.category)))];

  return (
    <section className="md:hidden">
      <div className="mb-4 flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tags.map((tag, index) => (
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
      </div>
      <div className="space-y-4">
        {items.map((item, index) => (
          <article key={item.id || item.title} className="rounded-2xl border border-[#edf0f7] bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <span className="rounded-full bg-[#f0edff] px-3 py-1 text-[10px] font-black text-[#4326e8]">
                {getCategoryLabel(item.category)}
              </span>
              <span className="text-xs font-bold text-[#667085]">{formatDate(item.date)}</span>
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
              <Link
                href={item.href || "/student-voices"}
                className="inline-flex items-center gap-2 text-xs font-bold text-[#3120c9]"
              >
                Open
                <FaArrowRight />
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default async function Home() {
  const {
    partnerSpotlights,
    homeSpotlights,
    premiumSpotlightWritings,
    latestWritings,
    upcomingEvents,
  } = await getHomepageData();

  const feedItems = latestWritings;
  const activeEvent = upcomingEvents[0] || null;
  const partner = partnerSpotlights[0] || null;
  const hasMainContent = feedItems.length > 0;

  return (
    <main className="pratyo-home-shell min-h-screen bg-[#fbfcff] text-[#111827]">
      <PublicSiteNav active="home" />
      <HomeScrollMemory />

      <div className="mx-auto grid max-w-[1480px] gap-6 px-4 pb-28 pt-5 md:px-5 md:pb-10 xl:grid-cols-[230px_minmax(0,1fr)]">
        <PublicExplorePanel active="home" variant="home" />

        <div className="min-w-0">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-w-0 space-y-5">
              <HomepageHeroCarousel stories={premiumSpotlightWritings} />

              <div className="hidden space-y-5 md:block">
                {feedItems.map((item) => (
                  <FeedCard
                    key={item.id}
                    item={item}
                    badge={getCategoryLabel(item.category)}
                  />
                ))}
                {!hasMainContent && (
                  <EmptyPanel
                    title="No public posts yet"
                    description="Published magazine articles, public results, and public events will appear here after schools add them."
                    href="/schools"
                    action="Explore schools"
                  />
                )}
              </div>

              <div className="space-y-6 md:hidden">
                <MobileActivityList
                  writings={latestWritings}
                  events={upcomingEvents}
                />
                {activeEvent && (
                  <section className="pratyo-brand-surface rounded-2xl p-5 text-white shadow-xl shadow-slate-950/12">
                    <div className="flex items-center gap-4">
                      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/16">
                        <FaCalendarAlt className="text-2xl text-white" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <h2 className="font-black text-white">
                          {activeEvent.title}
                        </h2>
                        <p className="mt-1 text-xs leading-5 text-white/86">
                          {getPreview(activeEvent.description, 100)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="inline-flex items-center gap-2 text-xs font-bold text-white/88">
                        <FaCalendarAlt />
                        {formatDate(activeEvent.date)}
                      </span>
                      <Link
                        href={activeEvent.href}
                        className="inline-flex h-10 items-center rounded-lg bg-white px-5 text-xs font-black text-[#4326e8]"
                      >
                        View Event
                      </Link>
                    </div>
                  </section>
                )}
                {!hasMainContent && !activeEvent && (
                  <EmptyPanel
                    title="Homepage is ready"
                    description="Real school activity will appear here once writing, events, and results are published."
                  />
                )}
                <MobileSchoolScroller schools={homeSpotlights} />
                <MobileVoiceFeed writings={latestWritings} />
              </div>
            </div>

            <RightColumn
              schools={homeSpotlights}
              partner={partner}
              event={activeEvent}
            />
          </div>
        </div>
      </div>

    </main>
  );
}
