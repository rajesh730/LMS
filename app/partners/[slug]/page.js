import Link from "next/link";
import connectDB from "@/lib/db";
import ExternalOrganizer from "@/models/ExternalOrganizer";
import Event from "@/models/Event";
import Achievement from "@/models/Achievement";
import ParticipationRequest from "@/models/ParticipationRequest";

export const dynamic = "force-dynamic";

function label(value) {
  return String(value || "").replaceAll("_", " ");
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
    .sort({ date: -1 })
    .populate("school", "schoolName")
    .populate("targetGroup", "name")
    .lean();

  const eventIds = events.map((event) => event._id);

  const [requests, achievements] = await Promise.all([
    eventIds.length
      ? ParticipationRequest.find({
          event: { $in: eventIds },
          status: { $in: ["PENDING", "APPROVED", "ENROLLED"] },
        })
          .select("school student event")
          .populate("school", "schoolName")
          .lean()
      : [],
    eventIds.length
      ? Achievement.find({
          event: { $in: eventIds },
          isPublic: true,
        })
          .sort({ awardedAt: -1 })
          .limit(12)
          .populate("school", "schoolName")
          .populate("student", "name")
          .populate("event", "title")
          .lean()
      : [],
  ]);

  const schoolMap = new Map();
  requests.forEach((request) => {
    if (request.school?._id) {
      schoolMap.set(String(request.school._id), request.school);
    }
  });

  return {
    partner,
    events,
    achievements,
    metrics: {
      eventCount: events.length,
      studentCount: requests.length,
      schoolCount: schoolMap.size,
    },
    schools: Array.from(schoolMap.values()).slice(0, 10),
  };
}

export default async function PartnerPortfolioPage({ params }) {
  const resolvedParams = await params;
  const data = await getPartnerData(resolvedParams.slug);

  if (!data) {
    return (
      <main className="min-h-screen bg-slate-950 text-white p-8">
        <div className="max-w-5xl mx-auto text-slate-400">
          Partner portfolio not found.
        </div>
      </main>
    );
  }

  const { partner, events, achievements, metrics, schools } = data;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="border-b border-slate-800 bg-slate-900/50">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between gap-4">
          <Link
            href="/partners"
            className="text-slate-400 hover:text-white transition"
          >
            Back to partners
          </Link>
          {partner.website && (
            <a
              href={partner.website}
              className="rounded-full bg-slate-800 hover:bg-slate-700 px-5 py-2 text-sm font-bold"
            >
              Visit website
            </a>
          )}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-14">
        <div className="grid lg:grid-cols-[1.4fr_0.8fr] gap-10 items-start">
          <div>
            <div className="flex items-start gap-5 mb-8">
              <div className="h-24 w-24 rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center shrink-0">
                {partner.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={partner.logoUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-4xl font-black text-emerald-300">
                    {partner.organizationName.charAt(0)}
                  </span>
                )}
              </div>
              <div>
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 px-3 py-1 text-xs">
                    Verified Partner
                  </span>
                  <span className="rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 px-3 py-1 text-xs">
                    {label(partner.organizationType)}
                  </span>
                </div>
                <h1 className="text-4xl md:text-5xl font-black tracking-tight">
                  {partner.organizationName}
                </h1>
                <p className="text-slate-400 mt-3">
                  {(partner.partnerRoles || []).map(label).join(", ")}
                </p>
              </div>
            </div>

            <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8 mb-10">
              <h2 className="text-2xl font-bold mb-4">Partner Story</h2>
              <p className="text-slate-300 leading-8">
                {partner.description ||
                  "This partner has been approved by the platform for student-facing events and school collaboration."}
              </p>
            </section>

            <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8 mb-10">
              <h2 className="text-2xl font-bold mb-6">Partner Events</h2>
              {events.length === 0 ? (
                <p className="text-slate-400">
                  Public partner events will appear here after publishing.
                </p>
              ) : (
                <div className="grid gap-4">
                  {events.map((event) => (
                    <Link
                      key={String(event._id)}
                      href={`/events/${event._id}`}
                      className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 hover:border-blue-500/40 transition"
                    >
                      <div className="flex items-center justify-between gap-4 mb-2">
                        <h3 className="text-xl font-semibold">{event.title}</h3>
                        <span className="text-xs text-slate-400 uppercase">
                          {event.eventType}
                        </span>
                      </div>
                      <p className="text-slate-400 line-clamp-2">
                        {event.description}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-300">
                        <span>{new Date(event.date).toLocaleDateString()}</span>
                        {event.resultsPublished && (
                          <span className="text-yellow-300">
                            Results published
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
              <h2 className="text-2xl font-bold mb-6">Published Recognition</h2>
              {achievements.length === 0 ? (
                <p className="text-slate-400">
                  Public winner recognition from partner events will appear here.
                </p>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {achievements.map((achievement) => (
                    <div
                      key={String(achievement._id)}
                      className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5"
                    >
                      <h3 className="font-semibold">{achievement.title}</h3>
                      <p className="text-sm text-slate-400 mt-2">
                        {achievement.student?.name || "Student"}
                        {achievement.school?.schoolName
                          ? ` - ${achievement.school.schoolName}`
                          : ""}
                      </p>
                      <p className="text-sm text-yellow-300 mt-3">
                        {label(achievement.placement)}
                      </p>
                      {achievement.totalScore > 0 && (
                        <p className="text-xs text-emerald-300 mt-2">
                          Score: {achievement.totalScore}
                          {achievement.scorePercentage > 0
                            ? ` (${achievement.scorePercentage}%)`
                            : ""}
                        </p>
                      )}
                      <p className="text-xs text-slate-500 mt-2">
                        {achievement.event?.title}
                      </p>
                      {achievement.certificateUrl && (
                        <a
                          href={achievement.certificateUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex text-xs text-blue-400 hover:text-blue-300 mt-3"
                        >
                          View certificate
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
              <h2 className="text-xl font-bold mb-4">Impact</h2>
              <div className="grid gap-3">
                {[
                  ["Events", metrics.eventCount],
                  ["Schools reached", metrics.schoolCount],
                  ["Student registrations", metrics.studentCount],
                ].map(([name, value]) => (
                  <div
                    key={name}
                    className="rounded-2xl bg-slate-950/70 border border-slate-800 p-4"
                  >
                    <p className="text-xs text-slate-500 uppercase">{name}</p>
                    <p className="text-3xl font-bold mt-1">{value}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
              <h2 className="text-xl font-bold mb-4">Schools Reached</h2>
              {schools.length === 0 ? (
                <p className="text-sm text-slate-400">
                  School participation will appear after registrations.
                </p>
              ) : (
                <div className="space-y-2">
                  {schools.map((school) => (
                    <div
                      key={String(school._id)}
                      className="rounded-2xl bg-slate-950/70 border border-slate-800 p-4 text-sm text-slate-300"
                    >
                      {school.schoolName}
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-6">
              <h2 className="text-xl font-bold text-emerald-200 mb-3">
                Want to collaborate?
              </h2>
              <p className="text-sm text-emerald-50/80 leading-7 mb-5">
                New organizations can submit an event idea for platform review.
              </p>
              <Link
                href="/organize-event"
                className="inline-flex rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-3 text-sm font-bold"
              >
                Propose an event
              </Link>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}
