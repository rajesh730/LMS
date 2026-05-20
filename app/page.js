import Link from "next/link";
import connectDB from "@/lib/db";
import User from "@/models/User";
import SchoolShowcaseProfile from "@/models/SchoolShowcaseProfile";
import Achievement from "@/models/Achievement";
import Event from "@/models/Event";
import "@/models/Student";
import PublicSiteNav from "@/components/public/PublicSiteNav";
import PratyoLogo from "@/components/brand/PratyoLogo";
import {
  FaArrowRight,
  FaAward,
  FaCalendarAlt,
  FaCertificate,
  FaCheckCircle,
  FaSchool,
  FaShieldAlt,
  FaTrophy,
  FaUsers,
} from "react-icons/fa";

export const dynamic = "force-dynamic";

function formatPlacement(value) {
  return String(value || "PARTICIPANT").replaceAll("_", " ");
}

function formatDate(value) {
  if (!value) return "Date to be announced";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

async function getFeaturedSchools() {
  const profiles = await SchoolShowcaseProfile.find({ visibility: "PUBLIC" })
    .select("school tagline highlightMetrics updatedAt")
    .sort({ updatedAt: -1 })
    .limit(3)
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
      ...profile.school,
      showcase: profile,
    }));
}

async function getFeaturedEvents() {
  return Event.find({
    status: "APPROVED",
    visibility: "PUBLIC",
    lifecycleStatus: { $ne: "ARCHIVED" },
  })
    .select(
      "title description date eventType eventScope school eligibleGrades maxParticipantsPerSchool resultsPublished publicResultsEnabled featuredOnLanding"
    )
    .populate("school", "schoolName")
    .sort({ featuredOnLanding: -1, date: 1, updatedAt: -1 })
    .limit(3)
    .lean();
}

async function getRecentResults() {
  return Achievement.find({ isPublic: true, certificateIssuedAt: { $ne: null } })
    .sort({ awardedAt: -1 })
    .limit(4)
    .populate("school", "schoolName")
    .populate("student", "name")
    .populate("event", "title")
    .lean();
}

async function getHomepageData() {
  await connectDB();

  const [featuredSchools, featuredEvents, recentResults, stats] =
    await Promise.all([
      getFeaturedSchools(),
      getFeaturedEvents(),
      getRecentResults(),
      Promise.all([
        User.countDocuments({
          role: "SCHOOL_ADMIN",
          status: { $in: ["APPROVED", "SUBSCRIBED"] },
        }),
        Event.countDocuments({
          status: "APPROVED",
          visibility: "PUBLIC",
          lifecycleStatus: { $ne: "ARCHIVED" },
        }),
        Achievement.countDocuments({
          isPublic: true,
          certificateIssuedAt: { $ne: null },
        }),
      ]),
    ]);

  return {
    featuredSchools,
    featuredEvents,
    recentResults,
    stats: {
      schools: stats[0],
      publicEvents: stats[1],
      certificates: stats[2],
    },
  };
}

const flowSteps = [
  {
    title: "Schools join events",
    text: "Platform or school events open to the right grades with clear limits.",
    icon: FaSchool,
  },
  {
    title: "Teams move through rounds",
    text: "Auditions, notices, selection, and qualification stay inside the event.",
    icon: FaUsers,
  },
  {
    title: "Results become records",
    text: "Winners, certificates, and public outcomes remain connected to the event.",
    icon: FaCertificate,
  },
];

function TalentOrbitArtwork() {
  return (
    <svg
      viewBox="0 0 760 560"
      role="img"
      aria-label="Students, schools, rounds, results, and certificates connected in one event platform"
      className="h-full w-full"
    >
      <defs>
        <linearGradient id="orbitMain" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#2f7fdb" />
          <stop offset="42%" stopColor="#2f7fdb" />
          <stop offset="78%" stopColor="#0a2f66" />
          <stop offset="100%" stopColor="#2f7fdb" />
        </linearGradient>
        <linearGradient id="orbitWarm" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#eaf2ff" />
          <stop offset="100%" stopColor="#2f7fdb" />
        </linearGradient>
        <filter id="softGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="12" result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="0 0 0 0 0.96 0 0 0 0 0.65 0 0 0 0 0.14 0 0 0 .55 0"
          />
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect width="760" height="560" rx="34" fill="#1a120e" />
      <path
        d="M50 115C170 44 320 44 443 106c113 57 188 57 267 10v395H50Z"
        fill="#241813"
      />
      <path
        d="M112 386c133-137 244-159 337-70 70 67 136 82 226 17"
        fill="none"
        stroke="url(#orbitMain)"
        strokeLinecap="round"
        strokeWidth="7"
        opacity=".9"
      />
      <path
        d="M105 188c113-44 204-35 273 26 79 70 166 78 263 22"
        fill="none"
        stroke="#60a5fa"
        strokeDasharray="12 14"
        strokeLinecap="round"
        strokeWidth="4"
        opacity=".65"
      />
      <g filter="url(#softGlow)">
        <circle cx="380" cy="276" r="82" fill="#07111f" stroke="url(#orbitMain)" strokeWidth="6" />
        <circle cx="380" cy="276" r="47" fill="#111a35" stroke="#a78bfa" strokeWidth="3" />
        <path d="M355 277h50M380 252v50" stroke="#ecfeff" strokeLinecap="round" strokeWidth="8" />
      </g>
      <g>
        {[
          [148, 166, "#38bdf8"],
          [635, 185, "#a78bfa"],
          [161, 408, "#34d399"],
          [595, 415, "#60a5fa"],
        ].map(([cx, cy, color], index) => (
          <g key={`${cx}-${cy}`}>
            <circle cx={cx} cy={cy} r="54" fill="#0b1526" stroke={color} strokeWidth="4" />
            <circle cx={cx} cy={cy - 12} r="15" fill={color} />
            <path
              d={`M${cx - 27} ${cy + 27}c7-24 47-24 54 0`}
              fill="none"
              stroke="#e2e8f0"
              strokeLinecap="round"
              strokeWidth="7"
            />
            <text
              x={cx}
              y={cy + 72}
              textAnchor="middle"
              fill="#cbd5e1"
              fontSize="13"
              fontWeight="700"
            >
              {["School", "Round", "Team", "Award"][index]}
            </text>
          </g>
        ))}
      </g>
      <g transform="translate(492 84)">
        <rect width="168" height="92" rx="18" fill="#07111f" stroke="#334155" />
        <path d="M26 32h116M26 55h76" stroke="#94a3b8" strokeLinecap="round" strokeWidth="8" />
        <circle cx="132" cy="58" r="18" fill="url(#orbitWarm)" />
      </g>
      <g transform="translate(92 268)">
        <rect width="158" height="92" rx="18" fill="#07111f" stroke="#334155" />
        <path d="M24 34h110M24 58h70" stroke="#94a3b8" strokeLinecap="round" strokeWidth="8" />
        <path d="M118 22l18 15-18 15" fill="none" stroke="#34d399" strokeLinecap="round" strokeLinejoin="round" strokeWidth="7" />
      </g>
      <g transform="translate(487 314)">
        <rect width="166" height="100" rx="20" fill="#07111f" stroke="#334155" />
        <path d="M30 34h104M30 58h86" stroke="#94a3b8" strokeLinecap="round" strokeWidth="8" />
        <path d="M66 78l14 12 28-34" fill="none" stroke="#34d399" strokeLinecap="round" strokeLinejoin="round" strokeWidth="8" />
      </g>
    </svg>
  );
}

function EventDiscoveryArtwork() {
  return (
    <svg viewBox="0 0 520 330" aria-hidden="true" className="h-full w-full">
      <defs>
        <linearGradient id="eventDiscoveryAccent" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="55%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#34d399" />
        </linearGradient>
      </defs>
      <rect width="520" height="330" rx="28" fill="#0f1b2d" />
      <path d="M54 74h252M54 118h180M54 246h410" stroke="#334155" strokeLinecap="round" strokeWidth="14" />
      <g transform="translate(50 150)">
        {[0, 1, 2].map((index) => (
          <g key={index} transform={`translate(${index * 136} 0)`}>
            <rect width="112" height="76" rx="16" fill="#07111f" stroke="#334155" />
            <circle cx="28" cy="28" r="12" fill={index === 0 ? "#38bdf8" : index === 1 ? "#34d399" : "#a78bfa"} />
            <path d="M50 28h40M24 52h62" stroke="#94a3b8" strokeLinecap="round" strokeWidth="7" />
          </g>
        ))}
      </g>
      <circle cx="407" cy="95" r="54" fill="#07111f" stroke="url(#eventDiscoveryAccent)" strokeWidth="6" />
      <path d="M385 96h44M407 74v44" stroke="#ecfeff" strokeLinecap="round" strokeWidth="8" />
      <path d="M359 141l-34 34M451 141l32 32" stroke="url(#eventDiscoveryAccent)" strokeLinecap="round" strokeWidth="7" />
      <circle cx="323" cy="177" r="9" fill="#34d399" />
      <circle cx="485" cy="176" r="9" fill="#38bdf8" />
    </svg>
  );
}

function ProofFlowArtwork() {
  return (
    <svg viewBox="0 0 520 300" aria-hidden="true" className="h-full w-full">
      <defs>
        <linearGradient id="proofAccent" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="50%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#60a5fa" />
        </linearGradient>
      </defs>
      <rect width="520" height="300" rx="28" fill="#0f1b2d" />
      <path d="M82 150h356" stroke="#1e3a5f" strokeLinecap="round" strokeWidth="18" />
      {[
        [92, "01", "#38bdf8"],
        [220, "02", "#34d399"],
        [348, "03", "#c084fc"],
        [444, "OK", "#60a5fa"],
      ].map(([cx, label, color]) => (
        <g key={label}>
          <circle cx={cx} cy="150" r="42" fill="#07111f" stroke={color} strokeWidth="5" />
          <text x={cx} y="159" textAnchor="middle" fill="#f8fafc" fontSize="21" fontWeight="900">
            {label}
          </text>
        </g>
      ))}
      <rect x="70" y="54" width="156" height="54" rx="14" fill="#07111f" stroke="#334155" />
      <rect x="292" y="198" width="156" height="54" rx="14" fill="#07111f" stroke="#334155" />
      <path d="M96 82h94M318 226h86" stroke="#94a3b8" strokeLinecap="round" strokeWidth="8" />
      <path d="M409 222l17 16 34-42" fill="none" stroke="url(#proofAccent)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="8" />
    </svg>
  );
}

function SchoolShowcaseArtwork() {
  return (
    <svg viewBox="0 0 520 320" aria-hidden="true" className="h-full w-full">
      <defs>
        <linearGradient id="schoolShowcaseAccent" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#c084fc" />
          <stop offset="55%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#34d399" />
        </linearGradient>
      </defs>
      <rect width="520" height="320" rx="28" fill="#0f1b2d" />
      <path d="M92 238V112l168-78 168 78v126" fill="#12243a" stroke="#334155" strokeWidth="7" strokeLinejoin="round" />
      <path d="M122 122l138-62 138 62" fill="none" stroke="url(#schoolShowcaseAccent)" strokeLinecap="round" strokeWidth="9" />
      <rect x="202" y="176" width="116" height="62" rx="13" fill="#07111f" stroke="#64748b" strokeWidth="6" />
      <circle cx="260" cy="125" r="28" fill="url(#schoolShowcaseAccent)" />
      <path d="M141 166h54M326 166h54" stroke="#94a3b8" strokeLinecap="round" strokeWidth="12" />
      <g transform="translate(74 244)">
        {[0, 1, 2].map((index) => (
          <g key={index} transform={`translate(${index * 128} 0)`}>
            <rect width="98" height="42" rx="12" fill="#07111f" stroke="#334155" />
            <circle cx="24" cy="21" r="8" fill={index === 0 ? "#a78bfa" : index === 1 ? "#34d399" : "#60a5fa"} />
            <path d="M42 21h36" stroke="#94a3b8" strokeLinecap="round" strokeWidth="7" />
          </g>
        ))}
      </g>
    </svg>
  );
}

function CertificateRibbonArtwork() {
  return (
    <svg viewBox="0 0 520 320" aria-hidden="true" className="h-full w-full">
      <defs>
        <linearGradient id="certificateAccent" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="52%" stopColor="#2f7fdb" />
          <stop offset="100%" stopColor="#a78bfa" />
        </linearGradient>
      </defs>
      <rect width="520" height="320" rx="28" fill="#f8fafc" />
      <rect x="70" y="48" width="300" height="224" rx="22" fill="#ffffff" stroke="#cbd5e1" strokeWidth="6" />
      <path d="M114 104h176M114 142h134M114 204h204" stroke="#94a3b8" strokeLinecap="round" strokeWidth="12" />
      <circle cx="388" cy="116" r="46" fill="url(#certificateAccent)" />
      <path d="M366 119l17 17 37-46" fill="none" stroke="#fff7ed" strokeLinecap="round" strokeLinejoin="round" strokeWidth="9" />
      <path d="M365 154l-24 72 45-20 40 29-20-78" fill="#2f7fdb" opacity=".9" />
      <circle cx="123" cy="236" r="10" fill="#34d399" />
      <path d="M146 236h102" stroke="#0f172a" strokeLinecap="round" strokeWidth="8" />
    </svg>
  );
}

function SectionGraphicDivider({ tone = "brand" }) {
  const accent = tone === "light" ? "#0a2f66" : "#2f7fdb";
  const soft = tone === "light" ? "#bfdbfe" : "#1f4f8f";

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6" aria-hidden="true">
      <svg viewBox="0 0 1200 52" className="h-12 w-full">
        <path
          d="M8 26h410c46 0 58-18 96-18h172c38 0 50 18 96 18h410"
          fill="none"
          stroke={soft}
          strokeLinecap="round"
          strokeWidth="2"
        />
        <circle cx="514" cy="8" r="5" fill={accent} />
        <circle cx="686" cy="8" r="5" fill={accent} />
        <rect x="552" y="18" width="96" height="16" rx="8" fill={accent} opacity=".18" />
        <path d="M574 26h52" stroke={accent} strokeLinecap="round" strokeWidth="4" />
      </svg>
    </div>
  );
}

export default async function Home() {
  const { featuredSchools, featuredEvents, recentResults, stats } =
    await getHomepageData();

  return (
    <main className="min-h-screen bg-[#071833] text-white selection:bg-[#2f7fdb]/25">
      <PublicSiteNav active="home" />

      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 opacity-30">
          <div className="h-full w-full bg-[linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,.06)_1px,transparent_1px)] bg-[size:72px_72px]" />
        </div>
        <div className="absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_20%_18%,rgba(47,127,219,.16),transparent_30%),radial-gradient(circle_at_58%_12%,rgba(47,127,219,.2),transparent_32%),radial-gradient(circle_at_82%_24%,rgba(10,47,102,.2),transparent_30%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[.95fr_1.05fr] lg:items-center lg:py-18">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-lg border border-[#2f7fdb]/30 bg-[#2f7fdb]/10 px-3 py-2 text-sm font-semibold text-[#0a2f66] shadow-lg shadow-[#2f7fdb]/10">
              <FaShieldAlt className="text-[#0a2f66]" />
              Verified school competitions, rounds, results, and certificates
            </div>
            <div className="mb-5">
              <PratyoLogo
                variant="wordmark"
                withSurface
                className="max-w-fit"
                imageClassName="w-[180px] sm:w-[220px] lg:w-[260px]"
              />
            </div>
            <p className="text-sm font-bold uppercase tracking-[0.28em] text-[#8fc4ff]">
              Events, Results, Certificates
            </p>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300 sm:text-xl">
              A public-facing talent platform where schools discover events,
              register the right students, move through rounds, publish results,
              and issue digital certificates from one connected record.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0a2f66] px-6 py-3 font-bold text-white shadow-lg shadow-[#0a2f66]/20 hover:bg-[#123f82]"
              >
                Register school
                <FaArrowRight />
              </Link>
              <Link
                href="/events"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#2f7fdb]/30 px-6 py-3 font-bold text-white hover:bg-[#2f7fdb]/10"
              >
                Browse public events
              </Link>
            </div>
          </div>

          <div className="relative min-h-[360px] overflow-hidden rounded-[28px] border border-[#2f7fdb]/20 bg-[#2f7fdb]/[0.04] p-3 shadow-2xl shadow-black/40">
            <TalentOrbitArtwork />
          </div>

          <div className="lg:col-span-2 grid gap-4 lg:grid-cols-[1.3fr_.7fr]">
            <div className="rounded-lg border border-white/10 bg-slate-950/70 p-4 shadow-2xl shadow-black/30">
              <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                    Live Event Flow
                  </p>
                  <p className="mt-1 font-semibold text-slate-200">
                    Registration to certificate, without leaving the event
                  </p>
                </div>
                <span className="rounded-lg bg-[#2f7fdb]/10 px-3 py-1 text-xs font-bold uppercase text-[#0a2f66]">
                  Active
                </span>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {flowSteps.map((step, index) => {
                  const Icon = step.icon;

                  return (
                    <div
                      key={step.title}
                      className="rounded-lg border border-white/10 bg-white/[0.04] p-4"
                    >
                      <div className="mb-4 flex items-center justify-between">
                        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#2f7fdb]/10 text-[#0a2f66]">
                          <Icon />
                        </span>
                        <span className="text-xs font-bold text-slate-500">
                          0{index + 1}
                        </span>
                      </div>
                      <h2 className="text-base font-bold text-white">
                        {step.title}
                      </h2>
                      <p className="mt-2 text-sm leading-6 text-slate-400">
                        {step.text}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              {[
                ["Schools", stats.schools],
                ["Public events", stats.publicEvents],
                ["Certificates", stats.certificates],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-lg border border-white/10 bg-slate-950/70 p-5"
                >
                  <p className="text-sm font-semibold text-slate-400">
                    {label}
                  </p>
                  <p className="mt-2 text-3xl font-black text-white">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <SectionGraphicDivider />

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="mb-8 grid gap-8 lg:grid-cols-[1fr_380px] lg:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#8fc4ff]">
              Public Events
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-white">
              Competitions schools can discover and follow
            </h2>
            <p className="mt-3 max-w-2xl text-slate-400">
              Featured event cards are supported by the same registration,
              grade, capacity, and result records used inside the dashboard.
            </p>
          </div>
          <div className="rounded-2xl border border-[#2f7fdb]/20 bg-[#2f7fdb]/[0.04] p-3">
            <EventDiscoveryArtwork />
            <Link
              href="/events"
              className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-[#d7e9ff] hover:text-white"
            >
              View all events
              <FaArrowRight />
            </Link>
          </div>
        </div>

        {featuredEvents.length === 0 ? (
          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-6 text-slate-300">
            Public platform and school events will appear here after approval.
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-3">
            {featuredEvents.map((event) => (
              <Link
                key={String(event._id)}
                href={`/events/${event._id}`}
                className="group rounded-lg border border-white/10 bg-white/[0.04] p-5 transition hover:border-[#2f7fdb]/50 hover:bg-[#2f7fdb]/[0.07]"
              >
                <div className="mb-4 flex flex-wrap gap-2">
                  <span className="rounded-md bg-[#2f7fdb]/10 px-2.5 py-1 text-xs font-bold uppercase text-[#d7e9ff]">
                    {event.eventScope === "PLATFORM"
                      ? "Platform"
                      : "School"}
                  </span>
                  <span className="rounded-md bg-white/10 px-2.5 py-1 text-xs font-bold uppercase text-slate-300">
                    {event.eventType}
                  </span>
                </div>
                <h3 className="text-xl font-black text-white group-hover:text-[#0a2f66]">
                  {event.title}
                </h3>
                <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-400">
                  {event.description}
                </p>
                <div className="mt-5 space-y-2 text-sm text-slate-300">
                  <div className="flex items-center gap-2">
                    <FaCalendarAlt className="text-slate-500" />
                    {formatDate(event.date)}
                  </div>
                  <div className="flex items-center gap-2">
                    <FaUsers className="text-slate-500" />
                    {event.eligibleGrades?.length
                      ? event.eligibleGrades.join(", ")
                      : "All eligible school grades"}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <SectionGraphicDivider />

      <section className="border-y border-white/10 bg-slate-950/45">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[.8fr_.95fr_1.05fr] lg:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#8fc4ff]">
              Why it feels cleaner
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-white">
              Every public proof connects back to the event
            </h2>
            <p className="mt-4 leading-7 text-slate-300">
              The homepage now reflects the product flow: schools participate
              through events, students progress through rounds, and certificates
              are issued as part of the same competition record.
            </p>
          </div>

          <div className="rounded-2xl border border-[#2f7fdb]/20 bg-[#2f7fdb]/[0.04] p-3">
            <ProofFlowArtwork />
          </div>

          <div className="grid gap-3">
            {[
              ["Grade-aware registration", "Schools only see relevant students for the event."],
              ["Round-based decisions", "Selected, not selected, notices, and next rounds stay organized."],
              ["Event-linked certificates", "Recognition is visible from the event, school, and certificate pages."],
            ].map(([title, text]) => (
              <div
                key={title}
                className="flex gap-4 rounded-lg border border-white/10 bg-white/[0.04] p-4"
              >
                <FaCheckCircle className="mt-1 shrink-0 text-[#0a2f66]" />
                <div>
                  <h3 className="font-bold text-white">{title}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-400">
                    {text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <SectionGraphicDivider />

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="mb-8 grid gap-8 lg:grid-cols-[380px_1fr] lg:items-end">
          <div className="rounded-2xl border border-[#2f7fdb]/20 bg-[#2f7fdb]/[0.04] p-3">
            <SchoolShowcaseArtwork />
          </div>
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#8fc4ff]">
              Featured Schools
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-white">
              Schools building visible activity culture
            </h2>
            <p className="mt-3 max-w-2xl text-slate-400">
              School profiles become stronger as their events, certificates,
              and achievements are published from verified activity records.
            </p>
            <Link
              href="/schools"
              className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[#d7e9ff] hover:text-white"
            >
              Browse schools
              <FaArrowRight />
            </Link>
          </div>
        </div>

        {featuredSchools.length === 0 ? (
          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-6 text-slate-300">
            Public school showcase profiles will appear here after schools publish
            them.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {featuredSchools.map((school) => (
              <Link
                key={school._id.toString()}
                href={`/schools/${school._id}`}
                className="rounded-lg border border-white/10 bg-white/[0.04] p-5 transition hover:border-[#2f7fdb]/50 hover:bg-white/[0.07]"
              >
                <FaSchool className="mb-4 text-2xl text-[#0a2f66]" />
                <h3 className="text-xl font-black text-white">
                  {school.schoolName}
                </h3>
                <p className="mt-2 min-h-12 text-sm leading-6 text-slate-400">
                  {school.showcase?.tagline || "Public school showcase profile"}
                </p>
                <div className="mt-5 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-md bg-white/10 p-3">
                    <p className="text-slate-500">Events</p>
                    <p className="mt-1 font-black text-white">
                      {school.showcase?.highlightMetrics?.eventsHosted || 0}
                    </p>
                  </div>
                  <div className="rounded-md bg-white/10 p-3">
                    <p className="text-slate-500">Awards</p>
                    <p className="mt-1 font-black text-white">
                      {school.showcase?.highlightMetrics?.awardsCount || 0}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <SectionGraphicDivider />

      <section className="border-y border-white/10 bg-slate-950/45 px-4 py-14 text-white sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 grid gap-8 lg:grid-cols-[1fr_380px] lg:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#8fc4ff]">
                Published Outcomes
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight">
                Recent certificates and results
              </h2>
              <p className="mt-3 max-w-2xl text-slate-400">
                Certificates are not isolated files; they are tied back to the
                event, school, student, and final outcome.
              </p>
            </div>
            <div className="rounded-2xl border border-[#2f7fdb]/20 bg-[#2f7fdb]/[0.04] p-3">
              <CertificateRibbonArtwork />
              <Link
                href="/events"
                className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-[#d7e9ff] hover:text-white"
              >
                Explore event records
                <FaArrowRight />
              </Link>
            </div>
          </div>

          {recentResults.length === 0 ? (
            <div className="rounded-lg border border-white/10 bg-white/[0.04] p-6 text-slate-300">
              Published event results will appear here as competitions conclude.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {recentResults.map((achievement) => (
                <div
                  key={achievement._id.toString()}
                  className="rounded-lg border border-white/10 bg-white/[0.04] p-5 transition hover:border-[#2f7fdb]/50 hover:bg-[#2f7fdb]/[0.07]"
                >
                  <div className="inline-flex items-center gap-2 rounded-md bg-amber-100 px-2.5 py-1 text-xs font-black uppercase text-amber-800">
                    <FaTrophy />
                    {formatPlacement(achievement.placement)}
                  </div>
                  <h3 className="mt-4 text-lg font-black text-white">
                    {achievement.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-slate-400">
                    {achievement.school?.schoolName || "School"}
                    {achievement.certificateRecipientName || achievement.student?.name
                      ? ` - ${achievement.certificateRecipientName || achievement.student?.name}`
                      : ""}
                  </p>
                  <p className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                    <FaAward />
                    {achievement.event?.title || "Published event result"}
                  </p>
                  {achievement.certificateUrl && (
                    <a
                      href={achievement.certificateUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[#d7e9ff] hover:text-white"
                    >
                      View certificate
                      <FaArrowRight />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <footer className="border-t border-white/10 px-4 py-8 text-center text-sm text-slate-500 sm:px-6">
        <p>&copy; 2026 Pratyo. School events, public results, and digital certificates.</p>
      </footer>
    </main>
  );
}
