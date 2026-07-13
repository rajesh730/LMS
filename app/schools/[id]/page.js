import Link from "next/link";
import connectDB from "@/lib/db";
import User from "@/models/User";
import Student from "@/models/Student";
import Teacher from "@/models/Teacher";
import SchoolShowcaseProfile from "@/models/SchoolShowcaseProfile";
import Event from "@/models/Event";
import Achievement from "@/models/Achievement";
import { getActiveCertificateFilter } from "@/lib/certificates";
import SchoolMagazineArticle from "@/models/SchoolMagazineArticle";
import MagazineIssue from "@/models/MagazineIssue";
import PublicSiteNav from "@/components/public/PublicSiteNav";
import PublicExplorePanel from "@/components/public/PublicExplorePanel";
import PublicShareButton from "@/components/public/PublicShareButton";
import ExpandableStoryText from "@/components/public/ExpandableStoryText";
import { stripWritingMarkup } from "@/components/WritingContent";
import { normalizeImageUrl } from "@/lib/imageUrls";
import { formatPlacement } from "@/lib/displayFormat";
import { getEventPublicStatus } from "@/lib/eventUiStatus";
import {
  FaArrowRight,
  FaBookOpen,
  FaCalendarAlt,
  FaCheckCircle,
  FaEnvelope,
  FaFacebookF,
  FaGlobe,
  FaGraduationCap,
  FaInstagram,
  FaLinkedinIn,
  FaMapMarkerAlt,
  FaMedal,
  FaPenNib,
  FaPhone,
  FaSchool,
  FaStar,
  FaTiktok,
  FaTrophy,
  FaTwitter,
  FaUserTie,
  FaUsers,
  FaYoutube,
} from "react-icons/fa";

export const revalidate = 60;

// Prerender nothing at build; cache each visited school page on demand.
export async function generateStaticParams() {
  return [];
}

function ensureHttp(url) {
  const value = String(url || "").trim();
  if (!value) return "";
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

const SOCIAL_PLATFORMS = [
  { key: "facebook", label: "Facebook", icon: FaFacebookF, hover: "hover:bg-[#1877f2] hover:!text-white hover:border-[#1877f2]" },
  { key: "instagram", label: "Instagram", icon: FaInstagram, hover: "hover:bg-[#e1306c] hover:!text-white hover:border-[#e1306c]" },
  { key: "linkedin", label: "LinkedIn", icon: FaLinkedinIn, hover: "hover:bg-[#0a66c2] hover:!text-white hover:border-[#0a66c2]" },
  { key: "tiktok", label: "TikTok", icon: FaTiktok, hover: "hover:bg-black hover:!text-white hover:border-black" },
  { key: "youtube", label: "YouTube", icon: FaYoutube, hover: "hover:bg-[#ff0000] hover:!text-white hover:border-[#ff0000]" },
  { key: "twitter", label: "X (Twitter)", icon: FaTwitter, hover: "hover:bg-black hover:!text-white hover:border-black" },
];

function getSocialEntries(socialLinks = {}) {
  return SOCIAL_PLATFORMS.map((platform) => ({
    ...platform,
    url: ensureHttp(socialLinks?.[platform.key]),
  })).filter((platform) => platform.url);
}

function formatDate(value) {
  if (!value) return "Date to be announced";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function getPreview(value = "", maxLength = 120) {
  const text = stripWritingMarkup(value).replace(/\s+/g, " ").trim();
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

function gradeSortValue(value) {
  const match = String(value || "").match(/\d+/);
  if (!match) return Number.MAX_SAFE_INTEGER;
  return Number.parseInt(match[0], 10);
}

function formatGradeSummary(grades = []) {
  const normalized = Array.from(
    new Set(grades.map((grade) => String(grade || "").trim()).filter(Boolean))
  ).sort((a, b) => gradeSortValue(a) - gradeSortValue(b) || a.localeCompare(b));

  if (normalized.length === 0) return "";
  if (normalized.length === 1) return normalized[0];

  const first = normalized[0];
  const last = normalized[normalized.length - 1];
  return `${first} to ${last}`;
}

function formatConfiguredGradeRange(config = {}) {
  const level = config.schoolLevel || config;
  const minGrade = Number.parseInt(level.minGrade, 10);
  const maxGrade = Number.parseInt(level.maxGrade, 10);

  if (!Number.isFinite(maxGrade)) return "";

  const safeMinGrade = Number.isFinite(minGrade) ? minGrade : 1;
  if (safeMinGrade === maxGrade) return `Grade ${maxGrade}`;
  return `Grade ${safeMinGrade} to Grade ${maxGrade}`;
}

function formatConfigLabel(value) {
  const text = String(value || "").replaceAll("_", " ").trim();
  if (!text) return "";
  return text.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

async function getSchoolData(id) {
  await connectDB();

  const school = await User.findOne({
    _id: id,
    role: "SCHOOL_ADMIN",
    status: { $in: ["APPROVED", "SUBSCRIBED"] },
  })
    .select(
      "schoolName principalName schoolLocation website establishedYear schoolConfig"
    )
    .lean();

  if (!school) return null;

  const [
    profile,
    events,
    achievements,
    homeMagazines,
    studentCount,
    teacherCount,
    grades,
  ] =
    await Promise.all([
      SchoolShowcaseProfile.findOne({ school: id, visibility: "PUBLIC" })
        .populate("featuredEvents", "title date eventType visibility")
        .lean(),
      Event.find({
        school: id,
        eventScope: "SCHOOL",
        visibility: "PUBLIC",
        lifecycleStatus: { $ne: "ARCHIVED" },
      })
        .sort({ date: -1 })
        .select(
          "title date description eventType eventScope eventWorkflowStatus lifecycleStatus registrationDeadline resultsPublished publicResultsEnabled"
        )
        .limit(4)
        .lean(),
      Achievement.find({
        school: id,
        isPublic: true,
        ...getActiveCertificateFilter(),
      })
        .sort({ awardedAt: -1 })
        .select(
          "title placement level awardedAt totalScore scorePercentage certificateUrl certificateRecipientName recipientType teamName"
        )
        .populate("student", "name grade")
        .populate("event", "eventScope publicResultsEnabled resultsPublished")
        .limit(6)
        .lean(),
      getSchoolHomeMagazines(id),
      Student.countDocuments({
        school: id,
        status: "ACTIVE",
        isDeleted: { $ne: true },
      }),
      Teacher.countDocuments({
        school: id,
        status: "ACTIVE",
        isDeleted: { $ne: true },
      }),
      Student.distinct("grade", {
        school: id,
        status: "ACTIVE",
        isDeleted: { $ne: true },
      }),
    ]);

  return {
    school,
    profile,
    events,
    achievements: achievements.filter(
      (achievement) =>
        achievement.event?.eventScope === "PLATFORM" &&
        achievement.event?.publicResultsEnabled &&
        achievement.event?.resultsPublished
    ),
    magazines: homeMagazines,
    studentCount,
    teacherCount,
    grades,
  };
}

async function getSchoolHomeMagazines(schoolId) {
  const issues = await MagazineIssue.find({
    school: schoolId,
    status: "PUBLISHED",
    showOnHome: true,
  })
    .select("title publishedAt homeShownAt weekStart")
    .sort({ homeShownAt: -1, publishedAt: -1, weekStart: -1, createdAt: -1 })
    .limit(6)
    .lean();

  if (issues.length === 0) return [];

  const issueIds = issues.map((issue) => issue._id);
  const articles = await SchoolMagazineArticle.find({
    school: schoolId,
    magazineIssue: { $in: issueIds },
    isMagazinePublished: true,
    isDeleted: { $ne: true },
  })
    .select("title content magazineIssue")
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

      return {
        _id: String(issue._id),
        type: "MAGAZINE",
        href: `/magazines/${issue._id}`,
        title: issue.title || "School Magazine",
        content:
          issueArticles.length === 1
            ? firstArticle.content
            : `${firstArticle.title}: ${getPreview(firstArticle.content, 100)}`,
        publicDate: issue.homeShownAt || issue.publishedAt || issue.weekStart,
        articleCount: issueArticles.length,
      };
    })
    .filter(Boolean);
}

function HeroFallbackArt() {
  return (
    <div className="pravyo-brand-surface absolute inset-0">
      <div className="absolute bottom-0 left-0 right-0 h-36 bg-gradient-to-t from-black/50 to-transparent" />
      <div className="absolute bottom-10 right-12 hidden h-28 w-48 rounded-2xl border border-white/25 bg-white/12 backdrop-blur-sm md:block" />
      <div className="absolute right-28 top-12 hidden h-16 w-36 -rotate-6 rounded-2xl border border-white/20 bg-white/10 backdrop-blur-sm md:block" />
      <FaSchool className="absolute bottom-14 right-24 hidden text-6xl text-white/60 md:block" />
      <FaGraduationCap className="absolute bottom-16 left-16 hidden text-6xl text-white/55 md:block" />
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, href }) {
  const content = (
    <div className="border border-[#e7dcc8] bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-purple-200 hover:shadow-md sm:rounded-xl">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 text-purple-700">
          <Icon />
        </span>
        <div>
          <p className="text-2xl font-black text-[#17120a]">{value}</p>
          <p className="text-xs font-semibold text-[#52657d]">{label}</p>
        </div>
      </div>
      {href && (
        <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-black text-purple-700">
          View details <FaArrowRight />
        </span>
      )}
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

function EmptyPanel({ icon: Icon, title, description, actionHref, actionLabel }) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center rounded-xl border border-dashed border-[#d7cdbb] bg-[#f8fbff] p-6 text-center">
      <Icon className="text-5xl text-amber-400" />
      <h3 className="mt-4 text-lg font-black text-[#17120a]">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-6 text-[#52657d]">
        {description}
      </p>
      {actionHref && (
        <Link
          href={actionHref}
          className="mt-5 inline-flex items-center gap-2 rounded-lg border border-[#d7cdbb] bg-white px-4 py-2 text-sm font-black text-[#0a2f66] transition hover:bg-[#f8fbff]"
        >
          {actionLabel}
          <FaArrowRight />
        </Link>
      )}
    </div>
  );
}

function AchievementCard({ achievement }) {
  const recipient =
    achievement.certificateRecipientName ||
    achievement.student?.name ||
    achievement.teamName ||
    "Student";
  const isWinner = achievement.placement === "WINNER";

  return (
    <article className="rounded-xl border border-[#e7dcc8] bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
            isWinner ? "bg-amber-50 text-amber-600" : "bg-slate-100 text-slate-500"
          }`}
        >
          {isWinner ? <FaTrophy /> : <FaMedal />}
        </span>
        <div className="min-w-0">
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${
              isWinner
                ? "bg-amber-50 text-amber-700"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {formatPlacement(achievement.placement)}
          </span>
          <h3 className="mt-2 line-clamp-2 text-sm font-black text-[#17120a]">
            {achievement.recipientType !== "TEAM" && achievement.student?._id ? (
              <Link
                href={`/students/${achievement.student._id}`}
                className="hover:text-purple-700"
              >
                {recipient}
              </Link>
            ) : (
              recipient
            )}
          </h3>
          <p className="mt-1 line-clamp-1 text-xs font-semibold text-[#52657d]">
            {achievement.title}
          </p>
          <p className="mt-1 text-xs text-[#75869b]">
            {formatDate(achievement.awardedAt)}
          </p>
          {achievement.certificateUrl && (
            <a
              href={achievement.certificateUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-black text-purple-700"
            >
              View certificate
              <FaArrowRight />
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

function SchoolEventCard({ event }) {
  const status = getEventPublicStatus(event);
  const typeLabel = String(event.eventType || "EVENT").replaceAll("_", " ");

  return (
    <Link
      href={`/events/${event._id}`}
      className="group block rounded-xl border border-[#e7dcc8] bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-purple-200 hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-700">
          <FaCalendarAlt />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${status.className}`}>
              {status.label}
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase text-slate-600">
              {typeLabel}
            </span>
          </div>
          <h3 className="mt-2 line-clamp-2 text-sm font-black text-[#17120a] group-hover:text-purple-700">
            {event.title}
          </h3>
          {event.description ? (
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#52657d]">
              {getPreview(event.description)}
            </p>
          ) : null}
          <p className="mt-1 text-xs text-[#75869b]">{formatDate(event.date)}</p>
        </div>
      </div>
    </Link>
  );
}

function WritingCard({ writing }) {
  const isMagazine = writing.type === "MAGAZINE";

  return (
    <Link
      href={isMagazine ? writing.href || "#writings" : `/writings/${writing._id}`}
      className="block min-w-[190px] rounded-xl border border-[#e6eaf7] bg-white p-3 text-[#17120a] shadow-sm transition hover:-translate-y-0.5 hover:border-white/70 hover:shadow-md"
    >
      <div className="pravyo-writing-art relative h-28 overflow-hidden rounded-lg border">
        <div className="absolute right-8 top-7 h-14 w-24 rounded-2xl border border-white/18 bg-white/10" />
        <FaBookOpen className="absolute right-5 top-5 text-4xl !text-white drop-shadow" />
        <FaPenNib className="absolute bottom-5 left-5 text-2xl !text-white drop-shadow" />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase text-emerald-700">
          Published
        </span>
        <span className="rounded-full bg-purple-50 px-2.5 py-1 text-[10px] font-black uppercase text-purple-700">
          {isMagazine ? "Magazine" : getCategoryLabel(writing.category)}
        </span>
      </div>
      <h3 className="mt-2 line-clamp-2 text-sm font-black text-[#17120a]">
        {writing.title}
      </h3>
      <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#52657d]">
        {getPreview(writing.content)}
      </p>
      <p className="mt-3 text-xs font-semibold text-[#52657d]">
        {isMagazine
          ? `${writing.articleCount || 0} selected writings`
          : `By ${writing.authorStudent?.name || "Student"} - ${getReadTime(
              writing.content
            )} min read`}
      </p>
    </Link>
  );
}

function AtGlance({ school, studentCount, teacherCount, grades }) {
  const config = school.schoolConfig || {};
  const gradeSummary =
    formatConfiguredGradeRange(config) || formatGradeSummary(grades);
  const schoolType =
    formatConfigLabel(config.schoolType) ||
    formatConfigLabel(config.schoolLevel?.type) ||
    formatConfigLabel(config.levelType);
  const medium =
    formatConfigLabel(config.medium) ||
    formatConfigLabel(config.instructionMedium);

  const items = [
    ["Principal", school.principalName],
    ["Grades", gradeSummary],
    ["Total Students", studentCount ? String(studentCount) : ""],
    ["Teachers", teacherCount ? String(teacherCount) : ""],
    ["School Type", schoolType],
    ["Medium", medium],
  ].filter(([, value]) => value);

  return (
    <section className="rounded-2xl border border-[#e7dcc8] bg-white p-5 shadow-sm">
      <h2 className="inline-flex items-center gap-2 text-lg font-black text-[#17120a]">
        <FaSchool className="text-purple-700" />
        School at a Glance
      </h2>
      <div className="mt-4 space-y-3">
        {items.length === 0 ? (
          <p className="text-sm font-semibold text-[#52657d]">
            Public school details are not available yet.
          </p>
        ) : items.map(([label, value]) => {
          const isExcessOnMobile = ["Total Students", "Teachers"].includes(label);
          return (
            <div
              key={label}
              className={`items-center justify-between gap-4 ${
                isExcessOnMobile ? "hidden sm:flex" : "flex"
              }`}
            >
              <span className="text-sm font-semibold text-[#52657d]">{label}</span>
              <strong className="text-right text-sm text-[#17120a]">{value}</strong>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function SocialIconLinks({ entries, variant = "light" }) {
  if (!entries || entries.length === 0) return null;
  const base =
    variant === "dark"
      ? "border-white/30 bg-white/15 text-white backdrop-blur-sm"
      : "border-[#e7dcc8] bg-[#f8fbff] text-[#52657d]";
  return (
    <div className="flex flex-wrap gap-2">
      {entries.map(({ key, label, icon: Icon, url, hover }) => (
        <a
          key={key}
          href={url}
          target="_blank"
          rel="noreferrer"
          aria-label={label}
          title={label}
          className={`flex h-9 w-9 items-center justify-center rounded-full border transition ${base} ${hover}`}
        >
          <Icon />
        </a>
      ))}
    </div>
  );
}

function ConnectCard({ websiteUrl, socialLinks, contactEmail, contactPhone }) {
  const socialEntries = getSocialEntries(socialLinks);
  const links = [
    websiteUrl && {
      icon: FaGlobe,
      label: "Website",
      value: websiteUrl.replace(/^https?:\/\//i, ""),
      href: ensureHttp(websiteUrl),
    },
    contactEmail && {
      icon: FaEnvelope,
      label: "Email",
      value: contactEmail,
      href: `mailto:${contactEmail}`,
    },
    contactPhone && {
      icon: FaPhone,
      label: "Phone",
      value: contactPhone,
      href: `tel:${contactPhone.replace(/\s+/g, "")}`,
    },
  ].filter(Boolean);

  if (links.length === 0 && socialEntries.length === 0) return null;

  return (
    <section className="rounded-2xl border border-[#e7dcc8] bg-white p-5 shadow-sm">
      <h2 className="inline-flex items-center gap-2 text-lg font-black text-[#17120a]">
        <FaGlobe className="text-purple-700" />
        Connect
      </h2>
      {links.length > 0 && (
        <div className="mt-4 space-y-2">
          {links.map(({ icon: Icon, label, value, href }) => (
            <a
              key={label}
              href={href}
              target={href.startsWith("http") ? "_blank" : undefined}
              rel="noreferrer"
              className="flex items-center gap-3 rounded-xl border border-[#eef1f6] bg-[#f8fbff] px-3 py-2.5 transition hover:border-purple-200 hover:bg-purple-50"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-purple-700 shadow-sm">
                <Icon />
              </span>
              <span className="min-w-0">
                <span className="block text-[10px] font-black uppercase tracking-wide text-[#75869b]">
                  {label}
                </span>
                <span className="block truncate text-sm font-bold text-[#17120a]">
                  {value}
                </span>
              </span>
            </a>
          ))}
        </div>
      )}
      {socialEntries.length > 0 && (
        <div className="mt-4 border-t border-[#eef1f6] pt-4">
          <p className="mb-2.5 text-[10px] font-black uppercase tracking-wide text-[#75869b]">
            Follow us
          </p>
          <SocialIconLinks entries={socialEntries} variant="light" />
        </div>
      )}
    </section>
  );
}

export default async function PublicSchoolPage({ params }) {
  const resolvedParams = await params;
  const data = await getSchoolData(resolvedParams.id);

  if (!data) {
    return (
      <main className="min-h-screen bg-[#f5f1e8] pb-32 text-[#17120a] md:pb-0">
        <PublicSiteNav active="schools" />
        <div className="mx-auto max-w-5xl p-0 sm:p-8">
          <p className="rounded-xl border border-[#d7cdbb] bg-white p-6 text-[#52657d]">
            School not found.
          </p>
        </div>
      </main>
    );
  }

  const {
    school,
    profile,
    events,
    achievements,
    magazines,
    studentCount,
    teacherCount,
    grades,
  } = data;
  const metrics = profile?.highlightMetrics || {};
  const coverImage = normalizeImageUrl(profile?.coverImageUrl);
  const socialEntries = getSocialEntries(profile?.socialLinks);
  const websiteUrl = profile?.websiteUrl || school.website || "";
  const motto = profile?.motto || "";
  return (
    <main className="min-h-screen bg-[#f8f9fd] pb-24 text-[#17120a]">
      <PublicSiteNav active="schools" />

      <div className="mx-auto grid max-w-[1500px] gap-5 px-0 py-5 sm:px-6 xl:grid-cols-[230px_minmax(0,1fr)]">
        <PublicExplorePanel active="schools" variant="school" />

        <div className="min-w-0 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-bold text-[#52657d]">
          <div className="flex items-center gap-2">
            <Link href="/" className="hover:text-purple-700">
              Home
            </Link>
            <span>/</span>
            <Link href="/schools" className="hover:text-purple-700">
              Schools
            </Link>
            <span>/</span>
            <span>{school.schoolName}</span>
          </div>
          <div className="flex gap-2">
            <PublicShareButton
              href={`/schools/${school._id}`}
              title={school.schoolName}
              label="Share Profile"
              className="inline-flex items-center gap-2 rounded-lg border border-[#d7cdbb] bg-white px-3 py-2 text-[#0a2f66] transition hover:bg-[#f8fbff]"
            />
          </div>
        </div>

        <section
          id="overview"
          className="scroll-mt-28 relative left-1/2 w-screen -translate-x-1/2 overflow-hidden border border-[#d7cdbb] bg-white shadow-[0_18px_50px_rgba(10,47,102,0.08)] sm:left-auto sm:w-auto sm:translate-x-0 sm:rounded-2xl"
        >
          <div className="relative min-h-[360px]">
            <HeroFallbackArt />
            <div className="absolute inset-0 bg-gradient-to-r from-black/38 via-black/10 to-black/26" />
            <div className="relative z-10 grid min-h-[360px] gap-6 p-6 md:p-8 lg:items-end">
              <div className="self-end rounded-2xl border border-white/20 bg-black/28 p-4 shadow-2xl backdrop-blur-sm md:p-5">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border border-white/70 bg-white text-4xl font-black text-[#3120c9] shadow-xl">
                    {coverImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={coverImage}
                        alt={`${school.schoolName} logo`}
                        className="h-full w-full object-contain p-2"
                      />
                    ) : (
                      (school.schoolName || "S").charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <h1
                      className="text-4xl font-black leading-tight drop-shadow-[0_3px_18px_rgba(0,0,0,0.55)] md:text-5xl"
                      style={{ color: "#ffffff" }}
                    >
                      {school.schoolName}
                      <FaCheckCircle className="ml-3 inline text-2xl text-emerald-300" />
                    </h1>
                    <p
                      className="mt-2 max-w-2xl text-sm font-bold leading-6 drop-shadow md:text-base"
                      style={{ color: "rgba(255,255,255,0.96)" }}
                    >
                      {profile?.tagline ||
                        "A school building identity through talent, activities, and showcases."}
                    </p>
                    {motto && (
                      <p
                        className="mt-1.5 text-sm font-semibold italic drop-shadow"
                        style={{ color: "rgba(255,255,255,0.82)" }}
                      >
                        &ldquo;{motto}&rdquo;
                      </p>
                    )}
                  </div>
                </div>
                <div
                  className="mt-5 flex flex-wrap items-center gap-4 text-sm font-black drop-shadow"
                  style={{ color: "rgba(255,255,255,0.94)" }}
                >
                  {school.principalName && (
                    <span className="inline-flex items-center gap-2">
                      <FaUserTie /> {school.principalName}
                    </span>
                  )}
                  {school.schoolLocation && (
                    <span className="inline-flex items-center gap-2">
                      <FaMapMarkerAlt /> {school.schoolLocation}
                    </span>
                  )}
                  {school.establishedYear && (
                    <span>Established {school.establishedYear}</span>
                  )}
                  {websiteUrl && (
                    <a
                      href={ensureHttp(websiteUrl)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 hover:text-white"
                    >
                      <FaGlobe /> Visit website
                    </a>
                  )}
                </div>

                {socialEntries.length > 0 && (
                  <div className="mt-4">
                    <SocialIconLinks entries={socialEntries} variant="dark" />
                  </div>
                )}
              </div>

            </div>
          </div>
        </section>

        <section className="relative left-1/2 grid w-screen -translate-x-1/2 grid-cols-2 gap-4 sm:left-auto sm:w-auto sm:translate-x-0 md:grid-cols-4">
          <MetricCard
            icon={FaCalendarAlt}
            label="Events Hosted"
            value={metrics.eventsHosted || events.length || 0}
          />
          <div className="hidden sm:block">
            <MetricCard
              icon={FaUsers}
              label="Events Joined"
              value={metrics.eventsParticipated || 0}
              href="/events"
            />
          </div>
          <MetricCard
            icon={FaTrophy}
            label="Awards Earned"
            value={metrics.awardsCount || achievements.length || 0}
            href="#achievements"
          />
          <div className="hidden sm:block">
            <MetricCard
              icon={FaGraduationCap}
              label="Students Recognized"
              value={studentCount || 0}
            />
          </div>
        </section>

        <div className="relative left-1/2 grid w-screen -translate-x-1/2 gap-5 sm:left-auto sm:w-auto sm:translate-x-0 lg:grid-cols-[minmax(0,1fr)_420px]">
          <main className="space-y-5">
            <section
              id="story"
              className="scroll-mt-28 border border-[#e7dcc8] bg-white p-5 shadow-sm sm:rounded-2xl"
            >
              <h2 className="text-lg font-black text-[#17120a]">
                School Story
              </h2>
              <div className="mt-4">
                <ExpandableStoryText
                  text={
                    profile?.summary ||
                    "This school has not added a public showcase summary yet. The profile will grow as verified events, results, and achievements are published."
                  }
                  limit={120}
                />
              </div>
            </section>

            <section
              id="events"
              className="scroll-mt-28 border border-[#e7dcc8] bg-white p-5 shadow-sm sm:rounded-2xl"
            >
              <h2 className="inline-flex items-center gap-2 text-lg font-black text-[#17120a]">
                <FaCalendarAlt className="text-purple-700" />
                School Events
              </h2>
              {events.length === 0 ? (
                <div className="mt-5">
                  <EmptyPanel
                    icon={FaCalendarAlt}
                    title="No public events yet"
                    description="Events organized by this school will appear here once they are published."
                  />
                </div>
              ) : (
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {events.map((event) => (
                    <SchoolEventCard key={String(event._id)} event={event} />
                  ))}
                </div>
              )}
            </section>

            <section
              id="achievements"
              className="scroll-mt-28 border border-[#e7dcc8] bg-white p-5 shadow-sm sm:rounded-2xl"
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="inline-flex items-center gap-2 text-lg font-black text-[#17120a]">
                  <FaTrophy className="text-amber-500" />
                  Achievements
                </h2>
                <Link href="/events" className="text-sm font-black text-purple-700">
                  View all achievements
                </Link>
              </div>
              {achievements.length === 0 ? (
                <div className="mt-5">
                  <EmptyPanel
                    icon={FaTrophy}
                    title="No public achievements yet"
                    description="Published certificates and event results will appear here."
                    actionHref="/events"
                    actionLabel="Explore events"
                  />
                </div>
              ) : (
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {achievements.slice(0, 4).map((achievement) => (
                    <AchievementCard
                      key={achievement._id}
                      achievement={achievement}
                    />
                  ))}
                </div>
              )}
            </section>
          </main>

          <aside className="space-y-5">
            <div id="glance" className="scroll-mt-28">
                  <AtGlance
                    school={school}
                    studentCount={studentCount}
                    teacherCount={teacherCount}
                    grades={grades}
                  />
            </div>
            <ConnectCard
              websiteUrl={websiteUrl}
              socialLinks={profile?.socialLinks}
              contactEmail={profile?.contactEmail}
              contactPhone={profile?.contactPhone}
            />
          </aside>
        </div>

        <section
          id="writings"
          className="pravyo-brand-surface scroll-mt-28 relative left-1/2 w-screen -translate-x-1/2 border border-white/18 p-5 shadow-sm sm:left-auto sm:w-auto sm:translate-x-0 sm:rounded-2xl"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="inline-flex items-center gap-2 text-lg font-black !text-white">
              <FaBookOpen className="!text-white/90" />
              School Magazines
            </h2>
          </div>
          {magazines.length === 0 ? (
            <div className="mt-5">
              <EmptyPanel
                icon={FaBookOpen}
                title="No public magazines yet"
                description="Published school magazine issues will appear here after the school adds them to home."
                actionHref="/student-voices"
                actionLabel="Explore student voices"
              />
            </div>
          ) : (
            <div className="mt-5 flex gap-4 overflow-x-auto pb-2">
              {magazines.map((magazine) => (
                <WritingCard key={magazine._id} writing={magazine} />
              ))}
            </div>
          )}
        </section>

        <section className="pravyo-brand-surface relative left-1/2 w-screen -translate-x-1/2 overflow-hidden p-5 shadow-lg sm:left-auto sm:w-auto sm:translate-x-0 sm:rounded-2xl">
          <div className="absolute inset-0 bg-gradient-to-r from-black/18 via-transparent to-black/10" />
          <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <span
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/16 text-xl shadow-sm"
                style={{ color: "#ffffff" }}
              >
                <FaStar />
              </span>
              <div>
                <h2
                  className="text-lg font-black drop-shadow"
                  style={{ color: "#ffffff" }}
                >
                  Showcase your school to a wider community
                </h2>
                <p
                  className="mt-1 text-sm font-semibold leading-6"
                  style={{ color: "rgba(255,255,255,0.9)" }}
                >
                  Achievements, events, and magazines help more students discover
                  your school story.
                </p>
              </div>
            </div>
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-black shadow-sm transition hover:bg-[#f8fbff]"
              style={{ color: "#3120c9" }}
            >
              Register school
              <FaArrowRight />
            </Link>
          </div>
        </section>
        </div>
      </div>

      <footer className="border-t border-[#d7cdbb] px-4 py-6 text-center text-sm text-[#52657d]">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p>
            &copy; 2026 Pravyo. Student talent, school recognition, public events, and verified certificates.{" "}
            <Link href="/privacy" className="font-bold hover:text-[#1f4e79]">Privacy</Link>
            {" · "}
            <Link href="/terms" className="font-bold hover:text-[#1f4e79]">Terms</Link>
            {" · "}
            <Link href="/contact" className="font-bold hover:text-[#1f4e79]">Contact</Link>
          </p>
          {socialEntries.length > 0 ? (
            <SocialIconLinks entries={socialEntries} variant="light" />
          ) : (
            <div className="flex justify-center gap-4 text-[#0a2f66]">
              <FaFacebookF />
              <FaTwitter />
              <FaInstagram />
              <FaYoutube />
            </div>
          )}
        </div>
      </footer>
    </main>
  );
}
