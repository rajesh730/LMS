import Link from "next/link";
import {
  FaArrowLeft,
  FaArrowRight,
  FaCalendarAlt,
  FaClipboardList,
  FaMapMarkerAlt,
  FaRegCalendarAlt,
  FaSchool,
  FaUsers,
} from "react-icons/fa";
import connectDB from "@/lib/db";
import { getActiveCertificateFilter } from "@/lib/certificates";
import { formatEventDate } from "@/lib/eventUiStatus";
import Achievement from "@/models/Achievement";
import Event from "@/models/Event";
import EventNotice from "@/models/EventNotice";
import ParticipationRequest from "@/models/ParticipationRequest";
import PublicEventNoticeList from "@/components/events/PublicEventNoticeList";
import PublicExplorePanel from "@/components/public/PublicExplorePanel";
import PublicResultsTable from "@/components/public/PublicResultsTable";
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

function FactItem({ icon: Icon, label: title, value, className = "" }) {
  return (
    <div className={`rounded-lg border border-[#e6eaf7] bg-[#f8f9fd] p-3 sm:p-4 ${className}`}>
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
  const sortedAchievements = [...achievements]
    .sort((a, b) => {
      const order = {
        WINNER: 1,
        RUNNER_UP: 2,
        FINALIST: 3,
        THIRD_PLACE: 4,
        SPECIAL_MENTION: 5,
        PARTICIPANT: 6,
      };
      return (order[a.placement] || 99) - (order[b.placement] || 99);
    })
    .map((achievement) => ({
      _id: String(achievement._id),
      studentName:
        achievement.certificateRecipientName ||
        achievement.student?.name ||
        "Student",
      schoolId: achievement.school?._id ? String(achievement.school._id) : null,
      schoolName: achievement.school?.schoolName || "School",
      placement: achievement.placement || "",
      certificateUrl: achievement.certificateUrl || "",
    }));
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
              <FactItem icon={FaCalendarAlt} label="Event Date" value={formatEventDate(event.date)} />
              <FactItem icon={FaMapMarkerAlt} label="Location" value={location} />
              <FactItem icon={FaRegCalendarAlt} label="Deadline" value={event.registrationDeadline ? formatEventDate(event.registrationDeadline) : "No deadline"} className="hidden sm:block" />
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
            <PublicResultsTable
              achievements={sortedAchievements}
              resultsPublished={Boolean(
                event.resultsPublished && event.publicResultsEnabled
              )}
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
