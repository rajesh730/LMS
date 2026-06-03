import Link from "next/link";
import {
  FaArrowRight,
  FaCalendarAlt,
  FaCheckCircle,
  FaEnvelope,
  FaGlobeAsia,
  FaHandshake,
  FaMapMarkerAlt,
  FaRegBuilding,
  FaSchool,
  FaTrophy,
  FaUsers,
} from "react-icons/fa";
import connectDB from "@/lib/db";
import Achievement from "@/models/Achievement";
import Event from "@/models/Event";
import EventProposal from "@/models/EventProposal";
import ExternalOrganizer from "@/models/ExternalOrganizer";
import ParticipationRequest from "@/models/ParticipationRequest";
import PartnerEventsBrowser from "@/components/public/PartnerEventsBrowser";
import PublicExplorePanel from "@/components/public/PublicExplorePanel";
import PublicSiteNav from "@/components/public/PublicSiteNav";
import { PublicPageShell } from "@/components/public/PublicLayout";

export const dynamic = "force-dynamic";

function label(value) {
  return String(value || "Other")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function PartnerLogo({ partner, className = "" }) {
  return (
    <div
      className={`pratyo-brand-surface flex items-center justify-center overflow-hidden rounded-2xl text-white shadow-lg ${className}`.trim()}
    >
      {partner.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={partner.logoUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="text-4xl font-black">
          {partner.organizationName?.charAt(0)?.toUpperCase() || "P"}
        </span>
      )}
    </div>
  );
}

function HeroArt() {
  return (
    <div className="relative hidden min-h-56 overflow-hidden rounded-2xl lg:block">
      <div className="pratyo-brand-surface absolute inset-0" />
      <div className="absolute bottom-5 left-9 h-24 w-32 -rotate-6 rounded-2xl border border-white/80 bg-white/75 shadow-xl" />
      <div className="absolute bottom-8 right-8 h-28 w-40 rotate-6 rounded-2xl border border-white/80 bg-white/70 shadow-xl" />
      <FaTrophy className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-8xl text-amber-400 drop-shadow" />
      <FaUsers className="absolute bottom-12 left-14 text-4xl text-white/70" />
      <FaHandshake className="absolute right-16 top-12 text-5xl text-white/65" />
    </div>
  );
}

function MetricTile({ icon: Icon, label: title, value, href, cta }) {
  return (
    <Link
      href={href || "#"}
      className="flex min-h-24 items-center gap-4 rounded-2xl border border-[#e6eaf7] bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-purple-200 hover:shadow-md"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-purple-50 text-purple-700">
        <Icon />
      </span>
      <span className="min-w-0">
        <strong className="block text-xl font-black text-[#17120a]">{value}</strong>
        <span className="block text-xs font-bold text-[#52657d]">{title}</span>
        <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-black text-purple-700">
          {cta}
          <FaArrowRight />
        </span>
      </span>
    </Link>
  );
}

function SectionCard({ title, icon: Icon, children, action }) {
  return (
    <section className="rounded-2xl border border-[#e6eaf7] bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="inline-flex items-center gap-2 text-base font-black text-[#17120a]">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-700">
            <Icon />
          </span>
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function ImpactSidebar({ metrics, schools, partner }) {
  return (
    <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
      <section className="rounded-2xl border border-[#e6eaf7] bg-white p-5 shadow-sm">
        <h2 className="text-base font-black text-[#17120a]">Impact Overview</h2>
        <div className="mt-4 space-y-3">
          {[
            ["Events Organized", metrics.eventCount, FaCalendarAlt],
            ["Schools Reached", metrics.schoolCount, FaSchool],
            ["Student Registrations", metrics.studentCount, FaUsers],
            ["Awards & Recognitions", metrics.achievementCount, FaTrophy],
          ].map(([title, value, Icon]) => (
            <div key={title} className="flex items-center justify-between gap-3 rounded-xl border border-[#e6eaf7] bg-[#f8fbff] p-3">
              <span>
                <span className="block text-[10px] font-black uppercase text-[#52657d]">
                  {title}
                </span>
                <strong className="text-xl font-black text-[#17120a]">{value}</strong>
              </span>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-purple-700 shadow-sm">
                <Icon />
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-[#e6eaf7] bg-white p-5 shadow-sm">
        <h2 className="inline-flex items-center gap-2 text-base font-black text-[#17120a]">
          <FaSchool className="text-purple-700" />
          Schools Reached
        </h2>
        {schools.length === 0 ? (
          <p className="mt-4 text-sm leading-6 text-[#52657d]">
            School participation will appear after registrations.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {schools.slice(0, 5).map((school) => (
              <Link
                key={String(school._id)}
                href={`/schools/${school._id}`}
                className="block rounded-xl border border-[#e6eaf7] bg-[#f8fbff] p-3 transition hover:bg-white"
              >
                <strong className="line-clamp-1 text-sm text-[#17120a]">
                  {school.schoolName}
                </strong>
                {school.schoolLocation && (
                  <span className="mt-1 block line-clamp-1 text-xs font-semibold text-[#52657d]">
                    {school.schoolLocation}
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="pratyo-brand-surface overflow-hidden rounded-2xl p-5 text-white shadow-[0_18px_45px_rgba(10,47,102,0.18)]">
        <h2 className="text-base font-black">Want to collaborate?</h2>
        <p className="mt-2 text-sm leading-6 text-white/80">
          New organizations can submit an event idea for platform review.
        </p>
        <Link
          href={`/organize-event?partner=${partner.slug}`}
          className="mt-5 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-black text-purple-700"
        >
          Propose an Event
          <FaArrowRight />
        </Link>
      </section>
    </aside>
  );
}

async function getPartnerData(slug) {
  await connectDB();

  const partner = await ExternalOrganizer.findOne({
    slug,
    verificationStatus: "VERIFIED",
    profileVisibility: "PUBLIC",
  }).lean();

  if (!partner) return null;

  const events = await Event.find({
    "partners.organizer": partner._id,
    partnerBrandingEnabled: true,
    visibility: "PUBLIC",
    status: "APPROVED",
    lifecycleStatus: { $ne: "ARCHIVED" },
  })
    .sort({ date: -1, createdAt: -1 })
    .populate("school", "schoolName schoolLocation")
    .lean();

  const eventIds = events.map((event) => event._id);

  const [announcedProposals, requests, achievements] = await Promise.all([
    EventProposal.find({
      organizer: partner._id,
      status: "APPROVED",
      linkedEvent: null,
    })
      .sort({ preferredDate: 1, createdAt: -1 })
      .lean(),
    eventIds.length
      ? ParticipationRequest.find({
          event: { $in: eventIds },
          status: { $in: ["PENDING", "APPROVED", "ENROLLED"] },
        })
          .select("school student event")
          .populate("school", "schoolName schoolLocation")
          .lean()
      : [],
    eventIds.length
      ? Achievement.find({
          event: { $in: eventIds },
          isPublic: true,
        })
          .sort({ awardedAt: -1 })
          .limit(12)
          .populate("school", "schoolName schoolLocation")
          .populate("student", "name")
          .populate("event", "title")
          .lean()
      : [],
  ]);

  const schoolMap = new Map();
  const studentSet = new Set();
  const eventRegistrationMap = new Map();
  requests.forEach((request) => {
    if (request.school?._id) {
      schoolMap.set(String(request.school._id), request.school);
    }
    if (request.student) {
      studentSet.add(String(request.student));
    }
    if (request.event) {
      const eventId = String(request.event);
      eventRegistrationMap.set(eventId, (eventRegistrationMap.get(eventId) || 0) + 1);
    }
  });

  return {
    partner,
    events,
    announcedProposals,
    achievements,
    eventRegistrationMap,
    metrics: {
      eventCount: events.length,
      studentCount: studentSet.size,
      schoolCount: schoolMap.size,
      achievementCount: achievements.length,
    },
    schools: Array.from(schoolMap.values()).slice(0, 10),
  };
}

export default async function PartnerPortfolioPage({ params }) {
  const resolvedParams = await params;
  const data = await getPartnerData(resolvedParams.slug);

  if (!data) {
    return (
      <PublicPageShell className="bg-[#f8f9fd]">
        <PublicSiteNav active="partners" />
        <div className="mx-auto max-w-5xl p-8 text-[#52657d]">
          Partner portfolio not found.
        </div>
      </PublicPageShell>
    );
  }

  const {
    partner,
    events,
    announcedProposals,
    eventRegistrationMap,
    metrics,
    schools,
  } = data;

  const browsableEvents = events.map((event) => ({
    id: String(event._id),
    title: event.title || "Partner event",
    description: event.description || "",
    eventType: event.eventType || "OTHER",
    date: event.date ? event.date.toISOString() : "",
    schoolName: event.school?.schoolName || "",
    registrations: eventRegistrationMap.get(String(event._id)) || 0,
  }));

  return (
    <PublicPageShell className="bg-[#f8f9fd]">
      <PublicSiteNav active="partners" />

      <section className="mx-auto grid max-w-[1500px] gap-5 px-4 py-5 sm:px-6 xl:grid-cols-[230px_minmax(0,1fr)]">
        <PublicExplorePanel active="partners" variant="partners" />

        <div className="min-w-0 space-y-5">
          <section className="overflow-hidden rounded-2xl border border-[#e6eaf7] bg-white p-5 shadow-sm md:p-7">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_390px] lg:items-center">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                <PartnerLogo partner={partner} className="h-24 w-24 shrink-0" />
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-black text-emerald-700">
                      <FaCheckCircle />
                      Verified Partner
                    </span>
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-black text-blue-700">
                      {label(partner.organizationType)}
                    </span>
                  </div>
                  <h1 className="mt-3 break-words text-4xl font-black leading-tight text-[#17120a] md:text-5xl">
                    {partner.organizationName}
                  </h1>
                  <p className="mt-2 text-sm font-black uppercase text-purple-700">
                    {(partner.partnerRoles || []).map(label).join(" / ")}
                  </p>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-[#52657d]">
                    {partner.description ||
                      "This partner is approved by the platform for student-facing events and school collaboration."}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-5 text-xs font-bold text-[#52657d]">
                    <span className="inline-flex items-center gap-2">
                      <FaMapMarkerAlt className="text-[#0a2f66]" />
                      {partner.location || "Kathmandu, Nepal"}
                    </span>
                    {partner.website && (
                      <a
                        href={partner.website}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 hover:text-purple-700"
                      >
                        <FaGlobeAsia className="text-[#0a2f66]" />
                        {partner.website.replace(/^https?:\/\//, "")}
                      </a>
                    )}
                    {partner.contactEmail && (
                      <span className="inline-flex items-center gap-2">
                        <FaEnvelope className="text-[#0a2f66]" />
                        {partner.contactEmail}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <HeroArt />
            </div>
          </section>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricTile
              icon={FaCalendarAlt}
              label="Events Organized"
              value={metrics.eventCount}
              href="#events"
              cta="View events"
            />
            <MetricTile
              icon={FaSchool}
              label="Schools Reached"
              value={metrics.schoolCount}
              href="#schools"
              cta="View schools"
            />
            <MetricTile
              icon={FaUsers}
              label="Student Registrations"
              value={metrics.studentCount}
              href="#events"
              cta="View registrations"
            />
            <MetricTile
              icon={FaTrophy}
              label="Awards & Recognitions"
              value={metrics.achievementCount}
              href="#events"
              cta="View events"
            />
          </div>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <main className="min-w-0 space-y-5">
              <SectionCard title="About Our Organization" icon={FaRegBuilding}>
                <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_260px] md:items-center">
                  <div>
                    <p className="text-sm leading-7 text-[#52657d]">
                      {partner.description ||
                        "This organization is committed to creating meaningful educational opportunities for students. They support competitions, academic events, and talent showcases that inspire creativity, skill development, and leadership."}
                    </p>
                    <p className="mt-4 text-sm leading-7 text-[#52657d]">
                      Our mission is to help schools and students connect with
                      trusted opportunities where they can learn, compete, and grow.
                    </p>
                  </div>
                  <div className="pratyo-brand-surface relative h-40 overflow-hidden rounded-xl">
                    <FaHandshake className="absolute bottom-8 left-10 text-5xl text-white/70" />
                    <FaTrophy className="absolute right-10 top-8 text-6xl text-white/78" />
                  </div>
                </div>
              </SectionCard>

              <SectionCard
                title="Events Hosted"
                icon={FaCalendarAlt}
                action={
                  <Link href="/events" className="inline-flex items-center gap-2 text-xs font-black text-purple-700">
                    View all events
                    <FaArrowRight />
                  </Link>
                }
              >
                {events.length === 0 && announcedProposals.length === 0 ? (
                  <p className="text-sm leading-6 text-[#52657d]">
                    Public partner events will appear here after publishing.
                  </p>
                ) : (
                  <div id="events" className="space-y-3 scroll-mt-28">
                    {announcedProposals.map((proposal) => (
                      <article
                        key={String(proposal._id)}
                        className="rounded-xl border border-blue-100 bg-blue-50/60 p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <h3 className="text-base font-black text-[#17120a]">
                            {proposal.eventTitle}
                          </h3>
                          <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase text-blue-700">
                            Announced
                          </span>
                        </div>
                        <p className="mt-2 line-clamp-2 text-sm text-[#52657d]">
                          {proposal.eventDescription}
                        </p>
                      </article>
                    ))}
                    {browsableEvents.length > 0 && (
                      <PartnerEventsBrowser events={browsableEvents} />
                    )}
                  </div>
                )}
              </SectionCard>
            </main>

            <div id="schools" className="scroll-mt-28">
              <ImpactSidebar metrics={metrics} schools={schools} partner={partner} />
            </div>
          </div>
        </div>
      </section>
    </PublicPageShell>
  );
}
