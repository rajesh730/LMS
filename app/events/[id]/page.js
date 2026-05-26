import Link from "next/link";
import {
  FaArrowRight,
  FaAward,
  FaCalendarAlt,
  FaCheck,
  FaCheckCircle,
  FaClipboardList,
  FaExternalLinkAlt,
  FaGlobeAsia,
  FaHandshake,
  FaInfoCircle,
  FaMapMarkerAlt,
  FaRegCalendarAlt,
  FaSchool,
  FaShareAlt,
  FaTrophy,
  FaUsers,
} from "react-icons/fa";
import connectDB from "@/lib/db";
import Achievement from "@/models/Achievement";
import Event from "@/models/Event";
import EventNotice from "@/models/EventNotice";
import ParticipationRequest from "@/models/ParticipationRequest";
import PublicEventNoticeList from "@/components/events/PublicEventNoticeList";
import PublicExplorePanel from "@/components/public/PublicExplorePanel";
import PublicSiteNav from "@/components/public/PublicSiteNav";
import { PublicPageShell } from "@/components/public/PublicLayout";
import "@/models/ExternalOrganizer";
import "@/models/Student";
import "@/models/User";

export const dynamic = "force-dynamic";

function label(value) {
  return String(value || "Other")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(value) {
  if (!value) return "Date to be announced";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatPlacement(value) {
  if (value === "RUNNER_UP") return "Runner Up";
  return label(value);
}

function placementTone(value) {
  const placement = String(value || "").toUpperCase();
  if (placement === "WINNER") return "bg-amber-50 text-amber-700";
  if (placement === "RUNNER_UP") return "bg-blue-50 text-blue-700";
  if (placement === "PARTICIPANT") return "bg-emerald-50 text-emerald-700";
  if (placement === "FINALIST") return "bg-purple-50 text-purple-700";
  return "bg-slate-100 text-slate-700";
}

function getEventArt(eventType = "") {
  const type = String(eventType || "").toUpperCase();
  if (type.includes("FESTIVAL")) return "from-pink-700 via-purple-700 to-amber-400";
  if (type.includes("WORKSHOP")) return "from-emerald-700 via-teal-600 to-cyan-300";
  if (type.includes("EXHIBITION")) return "from-rose-500 via-orange-400 to-amber-200";
  if (type.includes("SHOWCASE")) return "from-indigo-700 via-purple-600 to-pink-300";
  return "from-[#0a2f66] via-purple-700 to-indigo-300";
}

function EventHeroArt({ event }) {
  return (
    <div
      className={`relative min-h-72 overflow-hidden rounded-2xl bg-gradient-to-br ${getEventArt(
        event.eventType
      )}`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_15%,rgba(255,255,255,0.35),transparent_18%),radial-gradient(circle_at_78%_34%,rgba(251,191,36,0.35),transparent_20%),radial-gradient(circle_at_68%_88%,rgba(255,255,255,0.2),transparent_24%)]" />
      <div className="absolute left-8 top-12 h-28 w-20 rotate-[-10deg] rounded-2xl bg-white/18 shadow-xl" />
      <div className="absolute left-24 top-24 h-36 w-24 rotate-[8deg] rounded-2xl bg-white/16 shadow-xl" />
      <div className="absolute right-10 top-12 h-28 w-28 rounded-full bg-white/16" />
      <FaUsers className="absolute bottom-14 left-12 text-7xl text-white/75" />
      <FaTrophy className="absolute bottom-16 right-14 text-7xl text-amber-300" />
      <span className="absolute left-5 top-5 rounded-full bg-purple-700 px-4 py-2 text-xs font-black uppercase text-white">
        {event.eventType}
      </span>
    </div>
  );
}

function PartnerLogo({ partner, name }) {
  const logo = partner?.organizer?.logoUrl || partner?.logoUrl;
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#e7dcc8] bg-white text-sm font-black text-[#0a2f66]">
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logo} alt="" className="h-full w-full object-cover" />
      ) : (
        name.charAt(0)
      )}
    </div>
  );
}

function PartnerCard({ partner }) {
  const organizer = partner.organizer;
  const name = organizer?.organizationName || partner.displayName || "Approved partner";
  const href = organizer?.slug ? `/partners/${organizer.slug}` : null;
  const content = (
    <div className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-white p-3 shadow-sm transition hover:border-purple-200">
      <PartnerLogo partner={partner} name={name} />
      <div className="min-w-0">
        <p className="line-clamp-1 text-sm font-black text-[#17120a]">{name}</p>
        <p className="line-clamp-1 text-xs font-semibold uppercase text-[#0a2f66]">
          {label(partner.role)}
        </p>
      </div>
    </div>
  );

  return href ? (
    <Link href={href} className="block">
      {content}
    </Link>
  ) : (
    content
  );
}

function StatTile({ icon: Icon, value, label: title }) {
  return (
    <div className="flex min-h-20 items-center gap-4 border-r border-[#e6eaf7] px-4 last:border-r-0">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-purple-50 text-purple-700">
        <Icon />
      </span>
      <span>
        <strong className="block text-xl font-black text-[#17120a]">{value}</strong>
        <span className="text-xs font-bold text-[#52657d]">{title}</span>
      </span>
    </div>
  );
}

function SnapshotCard({ event, organizer, location }) {
  return (
    <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
      <section className="rounded-2xl border border-[#e6eaf7] bg-white p-5 shadow-sm">
        <h2 className="text-base font-black text-[#17120a]">Event Snapshot</h2>
        <div className="mt-4 space-y-3">
          {[
            ["Event Type", label(event.eventType), FaAward],
            ["Visibility", label(event.visibility), FaGlobeAsia],
            ["Organizer", organizer, FaHandshake],
            ["Event Date", formatDate(event.date), FaRegCalendarAlt],
            [
              "Deadline",
              event.registrationDeadline
                ? formatDate(event.registrationDeadline)
                : "No deadline",
              FaClipboardList,
            ],
            ["Location", location, FaMapMarkerAlt],
          ].map(([title, value, Icon]) => (
            <div key={title} className="flex items-center gap-3 rounded-xl bg-[#f8fbff] p-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-700">
                <Icon />
              </span>
              <span className="min-w-0">
                <span className="block text-[10px] font-black uppercase text-[#52657d]">
                  {title}
                </span>
                <strong className="line-clamp-1 text-sm text-[#17120a]">{value}</strong>
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-[#e6eaf7] bg-white p-5 shadow-sm">
        <h2 className="text-base font-black text-[#17120a]">Results Overview</h2>
        <div className="mt-4 flex items-center gap-3 rounded-xl bg-amber-50 p-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-amber-500 shadow-sm">
            <FaTrophy />
          </span>
          <span>
            <strong className="block text-xl font-black text-[#17120a]">
              {event.resultCount}
            </strong>
            <span className="text-xs font-bold text-[#52657d]">Results Published</span>
          </span>
        </div>
        <a
          href="#results"
          className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-purple-200 text-sm font-black text-purple-700 transition hover:bg-purple-50"
        >
          View Results
          <FaArrowRight />
        </a>
      </section>

      <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-purple-700 to-[#0a2f66] p-5 text-white shadow-[0_18px_45px_rgba(88,28,135,0.22)]">
        <h2 className="text-base font-black">How registration works</h2>
        <div className="mt-4 space-y-3">
          {[
            "Schools log in to their dashboard and collect student names.",
            "Teachers or admins submit eligible participants.",
            "Participants are reviewed and published in the results.",
          ].map((item, index) => (
            <div key={item} className="flex gap-3 text-sm leading-5 text-white/85">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/15 text-xs font-black">
                {index + 1}
              </span>
              <span>{item}</span>
            </div>
          ))}
        </div>
        <div className="mt-5 grid gap-2">
          <Link
            href="/login"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-black text-purple-700"
          >
            Login as a school
          </Link>
          <Link
            href="/register"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-white/12 px-4 text-sm font-black text-white ring-1 ring-white/30"
          >
            Register a school
          </Link>
        </div>
      </section>
    </aside>
  );
}

function InfoColumn({ title, icon: Icon, items }) {
  return (
    <div>
      <h3 className="inline-flex items-center gap-2 text-sm font-black text-[#17120a]">
        <Icon className="text-purple-700" />
        {title}
      </h3>
      <ul className="mt-3 space-y-2 text-sm leading-5 text-[#52657d]">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <FaCheck className="mt-1 shrink-0 text-purple-700" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ResultsTable({ achievements, resultsPublished }) {
  return (
    <section id="results" className="scroll-mt-28 rounded-2xl border border-[#e6eaf7] bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="inline-flex items-center gap-2 text-base font-black text-[#17120a]">
            <FaTrophy className="text-amber-500" />
            Published Results
          </h2>
          <p className="mt-1 text-sm text-[#52657d]">
            A focused results board built for large student lists.
          </p>
        </div>
        {achievements.length > 0 && (
          <span className="rounded-full border border-[#e6eaf7] px-3 py-1 text-xs font-black text-[#52657d]">
            {achievements.length} result{achievements.length === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {!resultsPublished ? (
        <p className="rounded-xl bg-[#f8fbff] p-4 text-sm text-[#52657d]">
          Results not published yet.
        </p>
      ) : achievements.length === 0 ? (
        <p className="rounded-xl bg-[#f8fbff] p-4 text-sm text-[#52657d]">
          No public results have been published for this event yet.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[#e6eaf7]">
          <div className="max-h-[70vh] overflow-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-white text-[#52657d] shadow-sm">
                <tr>
                  <th className="px-4 py-3 font-black">Student</th>
                  <th className="px-4 py-3 font-black">School</th>
                  <th className="px-4 py-3 font-black">Placement</th>
                  <th className="px-4 py-3 font-black">Level</th>
                  <th className="px-4 py-3 font-black">Certificate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e6eaf7]">
                {achievements.map((achievement) => {
                  const studentName =
                    achievement.certificateRecipientName ||
                    achievement.student?.name ||
                    "Student";

                  return (
                    <tr key={String(achievement._id)} className="transition hover:bg-[#f8fbff]">
                      <td className="px-4 py-3 font-bold text-[#17120a]">{studentName}</td>
                      <td className="px-4 py-3">
                        {achievement.school?._id ? (
                          <Link
                            href={`/schools/${achievement.school._id}`}
                            className="font-semibold text-[#0a2f66] transition hover:text-purple-700"
                          >
                            {achievement.school.schoolName || "School"}
                          </Link>
                        ) : (
                          <span className="text-[#52657d]">School</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-black ${placementTone(
                            achievement.placement
                          )}`}
                        >
                          {formatPlacement(achievement.placement)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#52657d]">
                        {achievement.level || "-"}
                      </td>
                      <td className="px-4 py-3">
                        {achievement.certificateUrl ? (
                          <a
                            href={achievement.certificateUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-black text-purple-700"
                          >
                            View certificate
                            <FaExternalLinkAlt />
                          </a>
                        ) : (
                          <span className="text-[#8a9ab1]">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

async function getEventData(id) {
  await connectDB();

  const event = await Event.findOne({
    _id: id,
    visibility: "PUBLIC",
    status: "APPROVED",
    lifecycleStatus: { $ne: "ARCHIVED" },
  })
    .populate("school", "schoolName schoolLocation")
    .populate(
      "partners.organizer",
      "organizationName slug logoUrl website verificationStatus profileVisibility"
    )
    .lean();

  if (!event) return null;

  const [participationRequests, achievements, eventNotices] = await Promise.all([
    ParticipationRequest.find({
      event: id,
      status: { $in: ["APPROVED", "ENROLLED"] },
    })
      .populate("school", "schoolName schoolLocation")
      .select("school student teamName")
      .lean(),
    event.resultsPublished
      ? Achievement.find({
          event: id,
          isPublic: true,
          certificateIssuedAt: { $ne: null },
        })
          .sort({ awardedAt: -1 })
          .populate("school", "schoolName")
          .populate("student", "name")
          .lean()
      : [],
    EventNotice.find({
      event: id,
      round: null,
      status: "PUBLISHED",
      visibility: "PUBLIC",
      isDeleted: { $ne: true },
    })
      .sort({ publishedAt: -1, createdAt: -1 })
      .lean(),
  ]);

  const schoolMap = new Map();
  const studentSet = new Set();
  participationRequests.forEach((request) => {
    if (request.school?._id) schoolMap.set(String(request.school._id), request.school);
    if (request.student) studentSet.add(String(request.student));
  });

  return {
    event,
    participationRequests,
    participatingSchools: Array.from(schoolMap.values()),
    participantCount: studentSet.size || participationRequests.length,
    achievements,
    eventNotices,
  };
}

export default async function PublicEventPage({ params }) {
  const resolvedParams = await params;
  const data = await getEventData(resolvedParams.id);

  if (!data) {
    return (
      <PublicPageShell className="bg-[#f8f9fd]">
        <PublicSiteNav active="events" />
        <div className="mx-auto max-w-5xl p-8 text-[#52657d]">
          Public event not found.
        </div>
      </PublicPageShell>
    );
  }

  const {
    event,
    participationRequests,
    participatingSchools,
    participantCount,
    achievements,
    eventNotices,
  } = data;
  const isInternalEvent = event.eventScope === "SCHOOL";
  const isTeamEvent =
    String(event.participationFormat || "INDIVIDUAL").toUpperCase() === "TEAM";
  const visiblePartners = event.partnerBrandingEnabled
    ? (event.partners || []).filter(
        (partner) =>
          partner?.organizer?.profileVisibility === "PUBLIC" ||
          partner?.displayName
      )
    : [];
  const organizer = isInternalEvent
    ? event.school?.schoolName || "School"
    : "Pratyo";
  const location = event.school?.schoolLocation || "Online Event";
  const sortedAchievements = [...achievements].sort((a, b) => {
    const order = {
      WINNER: 1,
      RUNNER_UP: 2,
      FINALIST: 3,
      THIRD_PLACE: 4,
      SPECIAL_MENTION: 5,
      PARTICIPANT: 6,
    };
    return (order[a.placement] || 99) - (order[b.placement] || 99);
  });
  const snapshotEvent = { ...event, resultCount: sortedAchievements.length };

  return (
    <PublicPageShell className="bg-[#f8f9fd]">
      <PublicSiteNav active="events" />

      <section className="mx-auto grid max-w-[1500px] gap-5 px-4 py-5 sm:px-6 xl:grid-cols-[230px_minmax(0,1fr)]">
        <PublicExplorePanel active="events" />

        <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <main className="min-w-0 space-y-5">
            <section className="grid overflow-hidden rounded-2xl border border-[#e6eaf7] bg-white p-5 shadow-sm lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-6">
              <EventHeroArt event={event} />
              <div className="min-w-0 p-1 lg:p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-purple-50 px-3 py-1 text-[11px] font-black text-purple-700">
                      {event.eventScope === "PLATFORM" ? "Platform Event" : "School Event"}
                    </span>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-black text-emerald-700">
                      {label(event.visibility)}
                    </span>
                  </div>
                  <button
                    type="button"
                    aria-label="Share event"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f8fbff] text-[#0a2f66]"
                  >
                    <FaShareAlt />
                  </button>
                </div>
                <h1 className="mt-5 break-words text-4xl font-black leading-tight text-[#061a44] md:text-5xl">
                  {event.title}
                </h1>
                <p className="mt-3 max-w-2xl text-base leading-7 text-[#52657d]">
                  {event.description}
                </p>
                <div className="mt-5 grid gap-3 text-sm font-bold text-[#52657d]">
                  <span className="inline-flex items-center gap-2">
                    <FaCalendarAlt className="text-purple-700" />
                    {formatDate(event.date)}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <FaMapMarkerAlt className="text-purple-700" />
                    {location}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <FaRegCalendarAlt className="text-purple-700" />
                    Organized by
                    <strong className="text-[#17120a]">{organizer}</strong>
                  </span>
                </div>
              </div>
            </section>

            {visiblePartners.length > 0 && (
              <section className="rounded-2xl border border-[#e6eaf7] bg-white p-5 shadow-sm">
                <h2 className="text-base font-black text-[#17120a]">Event Partners</h2>
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {visiblePartners.map((partner) => (
                    <PartnerCard
                      key={
                        partner.organizer?._id?.toString() ||
                        partner.displayName ||
                        partner.role
                      }
                      partner={partner}
                    />
                  ))}
                </div>
              </section>
            )}

            <section className="grid overflow-hidden rounded-2xl border border-[#e6eaf7] bg-white shadow-sm md:grid-cols-4">
              <StatTile
                icon={FaClipboardList}
                value={
                  event.registrationDeadline
                    ? formatDate(event.registrationDeadline)
                    : "No deadline"
                }
                label="Registration Deadline"
              />
              <StatTile
                icon={FaUsers}
                value={event.maxParticipantsPerSchool || "Any"}
                label={`Max ${isTeamEvent ? "Teams" : "Students"} per School`}
              />
              <StatTile
                icon={FaUsers}
                value={event.maxParticipants || "Open"}
                label={`Total ${isTeamEvent ? "Team" : "Student"} Capacity`}
              />
              <StatTile
                icon={FaSchool}
                value={isInternalEvent ? "-" : participatingSchools.length}
                label="Participating Schools"
              />
            </section>

            <section className="rounded-2xl border border-[#e6eaf7] bg-white shadow-sm">
              <nav className="grid border-b border-[#e6eaf7] text-sm font-black text-[#52657d] md:grid-cols-4">
                {[
                  ["#about", "About Event", FaInfoCircle],
                  ["#results", "Results", FaTrophy],
                  ["#schools", "Participating Schools", FaSchool],
                  ["#info", "Important Info", FaClipboardList],
                ].map(([href, title, Icon]) => (
                  <a
                    key={href}
                    href={href}
                    className="inline-flex min-h-12 items-center justify-center gap-2 border-b-2 border-transparent px-3 transition hover:border-purple-700 hover:bg-purple-50 hover:text-purple-700"
                  >
                    <Icon />
                    {title}
                  </a>
                ))}
              </nav>
              <div id="about" className="scroll-mt-28 p-5">
                <h2 className="text-lg font-black text-[#17120a]">About this event</h2>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-[#52657d]">
                  {event.description}
                </p>
                <div className="mt-6 grid gap-6 md:grid-cols-3">
                  <InfoColumn
                    title="Event Highlights"
                    icon={FaInfoCircle}
                    items={[
                      event.eligibleGrades?.length
                        ? `Open for ${event.eligibleGrades.join(", ")}`
                        : "Open to all listed grades",
                      event.publicResultsEnabled
                        ? "Public results can be published"
                        : "Results managed by organizers",
                      "Certificates can be issued from final results",
                    ]}
                  />
                  <InfoColumn
                    title="Who can participate?"
                    icon={FaUsers}
                    items={[
                      event.eligibleGrades?.length
                        ? `Registration grades: ${event.eligibleGrades.join(", ")}`
                        : "All grades may be eligible",
                      isTeamEvent
                        ? `Team size: ${event.minTeamSize || "No minimum"} to ${
                            event.maxTeamSize || "No maximum"
                          }`
                        : "Individual participation format",
                      event.maxParticipantsPerSchool
                        ? `Each school can submit up to ${event.maxParticipantsPerSchool}`
                        : "No per-school limit listed",
                    ]}
                  />
                  <InfoColumn
                    title="Judging & Results"
                    icon={FaTrophy}
                    items={[
                      event.resultsPublished
                        ? "Results have been published"
                        : "Results are not published yet",
                      `Event date: ${formatDate(event.date)}`,
                      "Certificates remain available when issued",
                    ]}
                  />
                </div>
              </div>
            </section>

            <PublicEventNoticeList
              eventId={String(event._id)}
              initialNotices={eventNotices}
            />

            <ResultsTable
              achievements={sortedAchievements}
              resultsPublished={event.resultsPublished}
            />

            <section id="schools" className="scroll-mt-28 rounded-2xl border border-[#e6eaf7] bg-white p-5 shadow-sm">
              <h2 className="inline-flex items-center gap-2 text-base font-black text-[#17120a]">
                <FaSchool className="text-purple-700" />
                Participating Schools
              </h2>
              {isInternalEvent ? (
                <p className="mt-4 text-sm leading-6 text-[#52657d]">
                  This is a school event managed internally by {organizer}.
                </p>
              ) : participatingSchools.length === 0 ? (
                <p className="mt-4 text-sm leading-6 text-[#52657d]">
                  No schools are publicly listed for this event yet.
                </p>
              ) : (
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {participatingSchools.map((school) => (
                    <Link
                      key={String(school._id)}
                      href={`/schools/${school._id}`}
                      className="rounded-xl border border-[#e6eaf7] bg-[#f8fbff] p-4 transition hover:bg-white"
                    >
                      <strong className="line-clamp-1 text-[#17120a]">
                        {school.schoolName}
                      </strong>
                      {school.schoolLocation && (
                        <span className="mt-1 block line-clamp-1 text-sm text-[#52657d]">
                          {school.schoolLocation}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </section>

            <section id="info" className="scroll-mt-28 rounded-2xl border border-[#e6eaf7] bg-white p-5 shadow-sm">
              <h2 className="inline-flex items-center gap-2 text-base font-black text-[#17120a]">
                <FaClipboardList className="text-purple-700" />
                Important Info
              </h2>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                {[
                  ["Participation Format", label(event.participationFormat)],
                  ["Total Requests", participationRequests.length],
                  ["Approved Participants", participantCount],
                ].map(([title, value]) => (
                  <div key={title} className="rounded-xl bg-[#f8fbff] p-4">
                    <p className="text-xs font-black uppercase text-[#52657d]">{title}</p>
                    <p className="mt-2 text-lg font-black text-[#17120a]">{value}</p>
                  </div>
                ))}
              </div>
            </section>
          </main>

          <SnapshotCard event={snapshotEvent} organizer={organizer} location={location} />
        </div>
      </section>
    </PublicPageShell>
  );
}
