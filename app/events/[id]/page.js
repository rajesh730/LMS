import Link from "next/link";
import {
  FaArrowLeft,
  FaArrowRight,
  FaCalendarAlt,
  FaClipboardList,
  FaExternalLinkAlt,
  FaMapMarkerAlt,
  FaRegCalendarAlt,
  FaSchool,
  FaTrophy,
  FaUsers,
} from "react-icons/fa";
import connectDB from "@/lib/db";
import { getActiveCertificateFilter } from "@/lib/certificates";
import Achievement from "@/models/Achievement";
import Event from "@/models/Event";
import EventNotice from "@/models/EventNotice";
import ParticipationRequest from "@/models/ParticipationRequest";
import PublicEventNoticeList from "@/components/events/PublicEventNoticeList";
import PublicExplorePanel from "@/components/public/PublicExplorePanel";
import PublicShareButton from "@/components/public/PublicShareButton";
import PublicSiteNav from "@/components/public/PublicSiteNav";
import { PublicPageShell } from "@/components/public/PublicLayout";
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
  if (placement === "WINNER") return "bg-amber-50 text-amber-800";
  if (placement === "RUNNER_UP") return "bg-blue-50 text-blue-800";
  if (placement === "PARTICIPANT") return "bg-emerald-50 text-emerald-800";
  if (placement === "FINALIST") return "bg-purple-50 text-purple-800";
  return "bg-slate-100 text-slate-700";
}

function serializeEventNotice(notice) {
  return {
    _id: String(notice._id),
    event: notice.event ? String(notice.event) : null,
    round: notice.round ? String(notice.round) : null,
    title: notice.title || "",
    message: notice.message || "",
    type: notice.type || "GENERAL",
    targetAudience: notice.targetAudience || "",
    visibility: notice.visibility || "",
    status: notice.status || "",
    publishedAt: notice.publishedAt ? new Date(notice.publishedAt).toISOString() : null,
    isDeleted: Boolean(notice.isDeleted),
    createdAt: notice.createdAt ? new Date(notice.createdAt).toISOString() : null,
    updatedAt: notice.updatedAt ? new Date(notice.updatedAt).toISOString() : null,
  };
}

function FactItem({ icon: Icon, label: title, value }) {
  return (
    <div className="rounded-lg border border-[#e6eaf7] bg-[#f8f9fd] p-3 sm:p-4">
      <div className="flex items-center gap-2 sm:gap-3">
        <span className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg bg-[#f4f1ff] text-[#4326e8] text-sm sm:text-base">
          <Icon />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-[#526071] truncate">
            {title}
          </span>
          <strong className="mt-0.5 block break-words text-xs sm:text-sm text-[#10142f]">
            {value}
          </strong>
        </span>
      </div>
    </div>
  );
}

function ResultsTable({ achievements, resultsPublished }) {
  return (
    <section id="results" className="rounded-xl border border-[#e6eaf7] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="inline-flex items-center gap-2 text-base font-black text-[#10142f]">
          <FaTrophy className="text-[#d98b00]" />
          Results
        </h2>
        {achievements.length > 0 && (
          <span className="rounded-full bg-[#f4f1ff] px-3 py-1 text-xs font-black text-[#4326e8]">
            {achievements.length} published
          </span>
        )}
      </div>

      {!resultsPublished ? (
        <p className="mt-4 rounded-lg bg-[#f8f9fd] p-4 text-sm font-semibold text-[#526071]">
          Results are not published yet.
        </p>
      ) : achievements.length === 0 ? (
        <p className="mt-4 rounded-lg bg-[#f8f9fd] p-4 text-sm font-semibold text-[#526071]">
          No public result records are available yet.
        </p>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden sm:block mt-4 overflow-x-auto rounded-lg border border-[#e6eaf7]">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#f8f9fd] text-[#526071]">
                <tr>
                  <th className="px-4 py-3 font-black">Student</th>
                  <th className="px-4 py-3 font-black">School</th>
                  <th className="px-4 py-3 font-black">Placement</th>
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
                    <tr key={String(achievement._id)}>
                      <td className="px-4 py-3 font-bold text-[#10142f]">
                        {studentName}
                      </td>
                      <td className="px-4 py-3">
                        {achievement.school?._id ? (
                          <Link
                            href={`/schools/${achievement.school._id}`}
                            className="font-semibold text-[#0a2f66] hover:text-[#4326e8]"
                          >
                            {achievement.school.schoolName || "School"}
                          </Link>
                        ) : (
                          <span className="text-[#526071]">School</span>
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
                      <td className="px-4 py-3">
                        {achievement.certificateUrl ? (
                          <a
                            href={achievement.certificateUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-black text-[#4326e8]"
                          >
                            View certificate
                            <FaExternalLinkAlt />
                          </a>
                        ) : (
                          <span className="text-[#8a9ab1]">Not public</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card-based View */}
          <div className="block sm:hidden mt-4 space-y-3">
            {achievements.map((achievement) => {
              const studentName =
                achievement.certificateRecipientName ||
                achievement.student?.name ||
                "Student";

              return (
                <div
                  key={String(achievement._id)}
                  className="rounded-xl border border-[#e6eaf7] p-4 bg-[#f8f9fd] shadow-sm flex flex-col gap-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-[#10142f] text-sm truncate">
                      {studentName}
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[9px] font-black uppercase ${placementTone(
                        achievement.placement
                      )}`}
                    >
                      {formatPlacement(achievement.placement)}
                    </span>
                  </div>
                  <div className="text-xs text-[#526071] flex items-center gap-1.5">
                    <FaSchool className="text-[#4326e8] shrink-0" />
                    {achievement.school?._id ? (
                      <Link
                        href={`/schools/${achievement.school._id}`}
                        className="font-semibold text-[#0a2f66] hover:text-[#4326e8] truncate"
                      >
                        {achievement.school.schoolName || "School"}
                      </Link>
                    ) : (
                      <span className="truncate">School</span>
                    )}
                  </div>
                  {achievement.certificateUrl && (
                    <div className="mt-1.5 pt-2 border-t border-[#e6eaf7] flex justify-end">
                      <a
                        href={achievement.certificateUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-black text-[#4326e8]"
                      >
                        View certificate
                        <FaExternalLinkAlt className="text-[10px]" />
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
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
    event.eventScope === "PLATFORM" &&
    event.resultsPublished &&
    event.publicResultsEnabled
      ? Achievement.find({
          event: id,
          isPublic: true,
          ...getActiveCertificateFilter(),
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
    eventNotices: eventNotices.map(serializeEventNotice),
  };
}

export default async function PublicEventPage({ params }) {
  const resolvedParams = await params;
  const data = await getEventData(resolvedParams.id);

  if (!data) {
    return (
      <PublicPageShell className="bg-[#f8f9fd]">
        <PublicSiteNav active="events" />
        <div className="mx-auto max-w-5xl p-8 text-[#526071]">
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
  const organizer = isInternalEvent
    ? event.school?.schoolName || "School"
    : "Pravyo";
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
  return (
    <PublicPageShell className="bg-[#f8f9fd]">
      <PublicSiteNav active="events" />

      <section className="mx-auto grid max-w-[1500px] gap-5 px-4 py-5 sm:px-6 xl:grid-cols-[230px_minmax(0,1fr)]">
        <PublicExplorePanel active="events" />

        <main className="min-w-0 space-y-5">
          <article className="rounded-xl border border-[#e6eaf7] bg-white p-5 shadow-sm md:p-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Link
                href="/events"
                className="inline-flex items-center gap-2 text-sm font-black text-[#4326e8]"
              >
                <FaArrowLeft />
                Back to Events
              </Link>
              <PublicShareButton
                href={`/events/${event._id}`}
                title={event.title}
                label="Share Event"
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#d9dcf2] bg-white px-4 text-sm font-black text-[#4326e8] transition hover:bg-[#f8f7ff]"
              />
            </div>

            <div className="mt-8 max-w-4xl">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-[#f4f1ff] px-3 py-1 text-xs font-black uppercase text-[#4326e8]">
                  {label(event.eventType)}
                </span>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black uppercase text-emerald-800">
                  Public
                </span>
              </div>
              <h1 className="mt-4 break-words text-4xl font-black leading-tight text-[#10142f] md:text-5xl">
                {event.title}
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-[#526071]">
                {event.description}
              </p>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <FactItem icon={FaCalendarAlt} label="Event Date" value={formatDate(event.date)} />
              <FactItem icon={FaMapMarkerAlt} label="Location" value={location} />
              <FactItem icon={FaRegCalendarAlt} label="Deadline" value={event.registrationDeadline ? formatDate(event.registrationDeadline) : "No deadline"} className="hidden sm:block" />
              <FactItem icon={FaUsers} label="Organizer" value={organizer} className="hidden sm:block" />
            </div>

            <div className="hidden sm:grid mt-6 grid-cols-2 gap-3 md:grid-cols-3">
              <FactItem
                icon={FaClipboardList}
                label="Format"
                value={label(event.participationFormat)}
              />
              <FactItem
                icon={FaUsers}
                label={`Max ${isTeamEvent ? "Teams" : "Students"} per School`}
                value={event.maxParticipantsPerSchool || "Any"}
              />
              <FactItem
                icon={FaSchool}
                label="Participating Schools"
                value={isInternalEvent ? "School event" : participatingSchools.length}
              />
            </div>
          </article>

          <PublicEventNoticeList
            eventId={String(event._id)}
            initialNotices={eventNotices}
          />

          {!isInternalEvent && (
            <ResultsTable
              achievements={sortedAchievements}
              resultsPublished={event.resultsPublished && event.publicResultsEnabled}
            />
          )}

          <section className="hidden sm:block rounded-xl border border-[#e6eaf7] bg-white p-5 shadow-sm">
            <h2 className="inline-flex items-center gap-2 text-base font-black text-[#10142f]">
              <FaSchool className="text-[#4326e8]" />
              Participating Schools
            </h2>
            {isInternalEvent ? (
              <p className="mt-4 text-sm leading-6 text-[#526071]">
                This is a school event managed by {organizer}.
              </p>
            ) : participatingSchools.length === 0 ? (
              <p className="mt-4 text-sm leading-6 text-[#526071]">
                No schools are publicly listed for this event yet.
              </p>
            ) : (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {participatingSchools.map((school) => (
                  <Link
                    key={String(school._id)}
                    href={`/schools/${school._id}`}
                    className="rounded-lg border border-[#e6eaf7] bg-[#f8f9fd] p-4 transition hover:bg-white"
                  >
                    <strong className="line-clamp-1 text-[#10142f]">
                      {school.schoolName}
                    </strong>
                    {school.schoolLocation && (
                      <span className="mt-1 block line-clamp-2 text-sm text-[#526071]">
                        {school.schoolLocation}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-[#e6eaf7] bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-base font-black text-[#10142f]">
                  Interested in this event?
                </h2>
                <p className="mt-1 text-sm leading-6 text-[#526071]">
                  Schools can participate from their Pravyo dashboard.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/login"
                  className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[#d9dcf2] bg-white px-4 text-sm font-black text-[#4326e8] transition hover:bg-[#f8f7ff]"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#4326e8] px-4 text-sm font-black text-white public-primary-action transition hover:bg-[#3217d3]"
                >
                  Register School
                  <FaArrowRight />
                </Link>
              </div>
            </div>
          </section>
        </main>
      </section>
    </PublicPageShell>
  );
}
