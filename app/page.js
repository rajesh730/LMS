import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import Event from "@/models/Event";
import SchoolPromotion from "@/models/SchoolPromotion";
import SchoolShowcaseProfile from "@/models/SchoolShowcaseProfile";
import SchoolMagazineArticle from "@/models/SchoolMagazineArticle";
import MagazineIssue from "@/models/MagazineIssue";
import { getActiveSchoolPromotions } from "@/lib/schoolPromotions";
import { diversifyBySchool } from "@/lib/schoolDiversifiedFeed";
import HomepageHeroCarousel from "@/components/public/HomepageHeroCarousel";
import HomeScrollMemory from "@/components/public/HomeScrollMemory";
import PublicExplorePanel from "@/components/public/PublicExplorePanel";
import PublicSiteNav from "@/components/public/PublicSiteNav";
import SchoolLogoMark from "@/components/public/SchoolLogoMark";
import AppDate from "@/components/common/AppDate";
import {
  getWritingPreviewText,
  WritingPreview,
} from "@/components/WritingContent";
import {
  FaArrowRight,
  FaCalendarAlt,
  FaFeatherAlt,
  FaRegCalendarAlt,
  FaShieldAlt,
} from "react-icons/fa";
import "@/models/Student";
import "@/models/User";

export const dynamic = "force-dynamic";

// Logged-in users land straight in their dashboard (Facebook-style) instead of
// the public marketing home. They can still reach public pages via direct links.
const DASHBOARD_BY_ROLE = {
  SUPER_ADMIN: "/admin/dashboard",
  SCHOOL_ADMIN: "/school/dashboard",
  TEACHER: "/teacher/dashboard",
  STUDENT: "/student/dashboard",
};

function dashboardPathForRole(role) {
  return DASHBOARD_BY_ROLE[role] || "/school/dashboard";
}


function getPreview(value = "", maxLength = 120) {
  const text = getWritingPreviewText(value, maxLength, { preserveFormatting: false });
  if (!text) return "";
  return text;
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

async function enrichItemsWithSchoolProfiles(items = []) {
  const schoolIds = [
    ...new Set(
      items
        .map((item) => item.schoolId)
        .filter(Boolean)
        .map(String)
    ),
  ];

  if (schoolIds.length === 0) return items;

  const profiles = await SchoolShowcaseProfile.find({
    school: { $in: schoolIds },
    visibility: "PUBLIC",
  })
    .select("school coverImageUrl")
    .lean();

  const profileMap = new Map(
    profiles.map((profile) => [String(profile.school), profile])
  );

  return items.map((item) => {
    const schoolId = String(item.schoolId || "");
    const profile = profileMap.get(schoolId);
    return {
      ...item,
      schoolHref: item.schoolHref || (schoolId ? `/schools/${schoolId}` : ""),
      schoolLogoUrl: profile?.coverImageUrl || "",
    };
  });
}

async function getLatestStudentWritings() {
  const articles = await SchoolMagazineArticle.find({
    status: "APPROVED",
    isPublished: true,
    isDeleted: { $ne: true },
  })
    .select("title content category publishedAt updatedAt")
    .sort({ publishedAt: -1, updatedAt: -1 })
    .limit(50)
    .populate("authorStudent", "name grade")
    .populate("school", "schoolName")
    .lean();

  const serializedArticles = articles.map((article) => ({
    id: String(article._id),
    href: `/writings/${article._id}`,
    title: article.title,
    content: article.content,
    category: article.category || "WRITING",
    date: article.publishedAt || article.updatedAt,
    author: article.authorStudent?.name || "Student",
    schoolName: article.school?.schoolName || "School",
    schoolHref: article.school?._id ? `/schools/${article.school._id}` : "",
    schoolId: article.school?._id ? String(article.school._id) : "",
  }));

  return diversifyBySchool(serializedArticles, {
    limit: 5,
    getSchoolKey: (article) => article.schoolId || article.schoolName,
    getTime: (article) => article.date,
  });
}

async function getHomeMagazineIssues() {
  const issues = await MagazineIssue.find({
    status: "PUBLISHED",
    showOnHome: true,
  })
    .select("title weekStart publishedAt homeShownAt month year school")
    .sort({ homeShownAt: -1, publishedAt: -1, weekStart: -1, createdAt: -1 })
    .limit(20)
    .populate("school", "schoolName")
    .lean();

  if (issues.length === 0) return [];

  const issueIds = issues.map((issue) => issue._id);
  const articles = await SchoolMagazineArticle.find({
    magazineIssue: { $in: issueIds },
    isMagazinePublished: true,
    isDeleted: { $ne: true },
  })
    .select("title content category magazineIssue magazinePublishedAt updatedAt")
    .sort({ magazinePublishedAt: 1, updatedAt: 1 })
    .lean();

  const articlesByIssue = articles.reduce((map, article) => {
    const key = String(article.magazineIssue);
    const list = map.get(key) || [];
    list.push(article);
    map.set(key, list);
    return map;
  }, new Map());

  return issues
    .map((issue) => {
      const issueArticles = articlesByIssue.get(String(issue._id)) || [];
      if (issueArticles.length === 0) return null;

      const firstArticle = issueArticles[0];
      const schoolId = issue.school?._id ? String(issue.school._id) : "";

      return {
        id: `magazine-${issue._id}`,
        href: `/magazines/${issue._id}`,
        title: issue.title || "School Magazine",
        content:
          issueArticles.length === 1
            ? firstArticle.content
            : `${issueArticles.length} selected student writings published in this school magazine issue.`,
        category: "SCHOOL_MAGAZINE",
        date: issue.homeShownAt || issue.publishedAt || issue.weekStart,
        author: "School Magazine",
        schoolName: issue.school?.schoolName || "School",
        schoolHref: schoolId ? `/schools/${schoolId}` : "",
        schoolId,
      };
    })
    .filter(Boolean);
}

async function getHighRotationSpotlightStudentWritings() {
  const highRotationPromotions = await SchoolPromotion.find({
    placement: "HOME_SPOTLIGHT",
    status: "ACTIVE",
    priority: "PREMIUM",
  })
    .select("school")
    .lean();

  const highRotationSchoolIds = [
    ...new Set(
      highRotationPromotions
        .map((promotion) => promotion.school)
        .filter(Boolean)
        .map((schoolId) => String(schoolId))
    ),
  ];

  if (highRotationSchoolIds.length === 0) return [];

  const articles = await SchoolMagazineArticle.find({
    status: "APPROVED",
    isPublished: true,
    isDeleted: { $ne: true },
    school: { $in: highRotationSchoolIds },
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
    schoolId: article.school?._id ? String(article.school._id) : "",
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
    homeSpotlights,
    spotlightStories,
    latestWritings,
    homeMagazineIssues,
    upcomingEvents,
  ] = await Promise.all([
    getActiveSchoolPromotions("HOME_SPOTLIGHT", 5, { randomize: true }),
    getHighRotationSpotlightStudentWritings(),
    getLatestStudentWritings(),
    getHomeMagazineIssues(),
    getUpcomingEvents(),
  ]);

  const publicFeedItems = diversifyBySchool(
    [...homeMagazineIssues, ...latestWritings],
    {
      limit: 5,
      getSchoolKey: (item) => item.schoolId || item.schoolName,
      getTime: (item) => item.date,
    }
  );

  return {
    homeSpotlights,
    spotlightStories: await enrichItemsWithSchoolProfiles(
      diversifyBySchool(spotlightStories, {
        limit: 5,
        getSchoolKey: (item) => item.schoolId || item.schoolName,
        getTime: (item) => item.date,
      })
    ),
    latestWritings: await enrichItemsWithSchoolProfiles(publicFeedItems),
    upcomingEvents,
  };
}

function EmptyPanel({ title, description, href = "", action = "" }) {
  return (
    <section className="pravyo-empty-state">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--brand-primary-soft)] shadow-sm">
        <FaFeatherAlt className="text-xl text-[var(--brand-primary)]" />
      </div>
      <h2 className="text-lg font-bold text-[#111827]">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#667085]">
        {description}
      </p>
      {href && action && (
        <Link
          href={href}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[var(--brand-primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--button-shadow)] transition hover:bg-[var(--brand-primary-hover)]"
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
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
          onBrand
            ? "border border-white/25 bg-white/20 text-white"
            : "text-white shadow-sm"
        }`}
        style={onBrand ? {} : { background: "linear-gradient(135deg, var(--brand-primary), #6d4af8)" }}
      >
        {getInitials(name)}
      </span>
      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm font-semibold ${onBrand ? "text-white" : "text-[#111827]"}`}>
          {name}
        </p>
        <p className={`mt-0.5 flex items-center gap-1 truncate text-xs font-medium ${onBrand ? "text-white/78" : "text-[#667085]"}`}>
          <FaShieldAlt className={`shrink-0 ${onBrand ? "text-white/60" : "text-[var(--brand-primary)]"}`} />
          <span className="truncate">{school}</span>
        </p>
      </div>
      <span
        className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
          onBrand
            ? "border-white/25 bg-white/15 text-white"
            : "border-[var(--brand-primary-border)] bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]"
        }`}
      >
        {badge}
      </span>
    </div>
  );
}

function FeedCard({ item, badge = "Published Writing" }) {
  const voiceHref = item.href || item.schoolHref || "/student-voices";

  return (
    <article className="feed-card group relative overflow-hidden rounded-2xl border border-[#edf0f7] bg-white p-5 text-[#111827] shadow-sm">
      {/* Accent line at top */}
      <div
        className="absolute inset-x-0 top-0 h-0.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        style={{ background: "linear-gradient(90deg, var(--brand-primary), #6d4af8)" }}
      />
      <AuthorLine
        name={item.author || item.studentLabel || "Student"}
        school={item.schoolName || "School"}
        badge={badge}
      />
      {item.date && (
        <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-[#9aa3b5]">
          <FaRegCalendarAlt className="text-[10px]" />
          <AppDate value={item.date} />
        </div>
      )}
      <div className="mt-3 min-w-0">
        <h2 className="text-lg font-bold leading-snug text-[#111827]">
          {item.title || "Published student writing"}
        </h2>
        <WritingPreview
          content={item.content}
          maxLength={280}
          className="mt-2 line-clamp-4 text-sm leading-5 text-[#4b5565]"
        />
        <Link
          href={voiceHref}
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--brand-primary)] transition hover:gap-2.5"
        >
          Read More
          <FaArrowRight className="text-xs" />
        </Link>
      </div>
    </article>
  );
}

function SectionTitle({ title, href = "/" }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-[15px] font-bold text-[#111827]">{title}</h2>
      <Link
        href={href}
        className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--brand-primary)] transition hover:underline"
      >
        View all
        <FaArrowRight className="text-[10px]" />
      </Link>
    </div>
  );
}

function RightColumn({ schools, event }) {
  return (
    <aside className="hidden space-y-4 lg:block">
      {/* Featured Schools card */}
      {schools.length > 0 && (
        <section className="overflow-hidden rounded-2xl border border-[#edf0f7] bg-white shadow-sm">
          <div className="border-b border-[#edf0f7] px-5 py-4">
            <SectionTitle title="Featured Schools" href="/schools" />
          </div>
          <div className="divide-y divide-[#f4f6fa] px-5">
            {schools.slice(0, 5).map((school) => (
              <Link
                key={school.id || school._id || school.title}
                href={school.href || "/schools"}
                className="group flex items-center gap-3 py-3.5 transition hover:opacity-80"
              >
                <SchoolLogoMark
                  imageUrl={school.profile?.coverImageUrl}
                  name={school.title || school.schoolName}
                  className="h-9 w-9 rounded-xl"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-[#111827]">
                    {school.title || school.schoolName}
                  </span>
                  <span className="block truncate text-xs text-[#667085]">
                    {school.tagline || school.location || "School profile"}
                  </span>
                </span>
                <FaArrowRight className="shrink-0 text-[10px] text-[var(--brand-primary)] opacity-0 transition group-hover:opacity-100" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Upcoming event card */}
      {event && (
        <section
          className="pravyo-brand-surface overflow-hidden rounded-2xl p-5 text-white shadow-lg"
          style={{ boxShadow: "0 8px 32px rgba(67,38,232,0.18)" }}
        >
          <div className="mb-4 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20">
              <FaCalendarAlt className="text-xs text-white" />
            </span>
            <p className="text-xs font-bold uppercase tracking-widest text-white/80">Upcoming Event</p>
          </div>
          <h3 className="font-bold leading-snug text-white">{event.title}</h3>
          <p className="mt-2 text-sm leading-6 text-white/78">
            {getPreview(event.description, 100)}
          </p>
          <div className="mt-5 flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-white/75">
              <FaCalendarAlt className="text-[10px]" />
              <AppDate value={event.date} />
            </span>
            <Link
              href={event.href}
              className="inline-flex h-9 items-center rounded-xl bg-white px-4 text-xs font-semibold text-[var(--brand-primary)] transition hover:bg-white/90"
            >
              View Event
            </Link>
          </div>
        </section>
      )}
    </aside>
  );
}

function MobileSchoolScroller({ schools }) {
  if (schools.length === 0) return null;

  return (
    <section className="home-mobile-bleed">
      <SectionTitle title="Featured Schools" href="/schools" />
      <div className="grid grid-cols-4 gap-2.5">
        {schools.slice(0, 4).map((school) => (
          <Link
            key={school.id || school.title}
            href={school.href || "/schools"}
            className="group flex flex-col items-center rounded-2xl border border-[#edf0f7] bg-white p-3 pt-4 text-center shadow-sm transition hover:border-[var(--brand-primary-border)] hover:shadow-md"
          >
            <SchoolLogoMark
              imageUrl={school.profile?.coverImageUrl}
              name={school.title}
              className="h-11 w-11 rounded-xl"
            />
            <p className="mt-2 line-clamp-1 text-[10px] font-bold leading-tight text-[#111827] w-full truncate px-0.5">
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
    <section className="home-mobile-bleed home-mobile-feed md:hidden">
      <SectionTitle title="Student Writings" href="/student-voices" />
      {/* Category pills */}
      <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tags.map((tag, index) => (
          <span
            key={tag}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
              index === 0
                ? "home-primary-action border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white"
                : "border-[#edf0f7] bg-white text-[#3d4a5c] hover:border-[var(--brand-primary-border)]"
            }`}
          >
            {tag}
          </span>
        ))}
      </div>
      {/* Feed articles */}
      <div className="space-y-3.5">
        {items.map((item) => (
          <article
            key={item.id || item.title}
            className="home-mobile-card mobile-feed-card group relative overflow-hidden rounded-2xl border border-[#edf0f7] bg-white p-4 shadow-sm transition hover:shadow-md"
          >
            {/* Top accent */}
            <div
              className="absolute inset-x-0 top-0 h-0.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
              style={{ background: "linear-gradient(90deg, var(--brand-primary), #6d4af8)" }}
            />
            <div className="mb-3 flex items-center justify-between">
              <span className="inline-flex items-center rounded-full border border-[var(--brand-primary-border)] bg-[var(--brand-primary-soft)] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--brand-primary)]">
                {getCategoryLabel(item.category)}
              </span>
              <span className="text-[11px] text-[#9aa3b5]"><AppDate value={item.date} /></span>
            </div>
            <AuthorLine name={item.author} school={item.schoolName} badge="" />
            <h2 className="mt-2.5 text-base font-bold leading-snug text-[#111827]">{item.title}</h2>
            {item.content && (
              <p className="mt-2 line-clamp-3 text-sm leading-6 text-[#526071]">
                {getPreview(item.content, 180)}
              </p>
            )}
            <div className="mt-3.5 flex items-center justify-between">
              <Link
                href={item.href || "/student-voices"}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--brand-primary)] transition hover:gap-2.5"
              >
                Read Story
                <FaArrowRight className="text-[10px]" />
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default async function Home() {
  // Send authenticated users to their dashboard. A revoked session falls through
  // to the public home (the client will sign them out from there).
  const session = await getServerSession(authOptions);
  if (session?.user?.role && !session.error) {
    redirect(dashboardPathForRole(session.user.role));
  }

  const {
    homeSpotlights,
    spotlightStories,
    latestWritings,
    upcomingEvents,
  } = await getHomepageData();

  const feedItems = latestWritings;
  const activeEvent = upcomingEvents[0] || null;
  const hasMainContent = feedItems.length > 0;

  return (
    <main className="pravyo-home-shell min-h-screen bg-[#fbfcff] text-[#111827]">
      <PublicSiteNav active="home" />
      <HomeScrollMemory />

      <div className="mx-auto grid max-w-[1480px] gap-5 px-1 pb-28 pt-3 sm:px-4 md:px-5 md:pb-10 xl:grid-cols-[230px_minmax(0,1fr)]">
        <PublicExplorePanel active="home" variant="home" />

        <div className="min-w-0">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-w-0 space-y-5">
              <HomepageHeroCarousel stories={spotlightStories} />

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

              <div className="home-mobile-content space-y-6 md:hidden">
                {activeEvent && (
                  <section className="pravyo-brand-surface rounded-2xl p-5 text-white shadow-xl shadow-slate-950/12">
                    <div className="flex items-center gap-4">
                      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/16">
                        <FaCalendarAlt className="text-2xl text-white" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <h2 className="font-black text-white">
                          {activeEvent.title}
                        </h2>
                        <p className="mt-1 line-clamp-1 text-xs text-white/80">
                          {getPreview(activeEvent.description, 80)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="inline-flex items-center gap-2 text-xs font-bold text-white/88">
                        <FaCalendarAlt />
                        <AppDate value={activeEvent.date} />
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
              event={activeEvent}
            />
          </div>
        </div>
      </div>

    </main>
  );
}
