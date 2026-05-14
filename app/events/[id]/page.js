import Link from "next/link";
import connectDB from "@/lib/db";
import Event from "@/models/Event";
import Achievement from "@/models/Achievement";
import ParticipationRequest from "@/models/ParticipationRequest";
import PublicSiteNav from "@/components/public/PublicSiteNav";
import "@/models/Student";
import "@/models/User";
import "@/models/ExternalOrganizer";

export const dynamic = "force-dynamic";

function formatPlacement(value) {
  if (value === "RUNNER_UP") return "Runner Up";
  return String(value || "").replaceAll("_", " ");
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

  const [participatingSchools, achievements] = await Promise.all([
    ParticipationRequest.find({
      event: id,
      status: { $in: ["APPROVED", "ENROLLED"] },
    })
      .populate("school", "schoolName")
      .select("school")
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
  ]);

  const schoolMap = new Map();
  participatingSchools.forEach((request) => {
    if (request.school?._id) {
      schoolMap.set(String(request.school._id), request.school);
    }
  });

  return { event, participatingSchools: Array.from(schoolMap.values()), achievements };
}

export default async function PublicEventPage({ params }) {
  const resolvedParams = await params;
  const data = await getEventData(resolvedParams.id);

  if (!data) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <PublicSiteNav active="events" />
        <div className="max-w-5xl mx-auto p-8 text-slate-400">Public event not found.</div>
      </main>
    );
  }

  const { event, participatingSchools, achievements } = data;
  const visiblePartners = event.partnerBrandingEnabled
    ? (event.partners || []).filter(
        (partner) =>
          partner?.organizer?.profileVisibility === "PUBLIC" ||
          partner?.displayName
      )
    : [];
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
    <main className="min-h-screen bg-slate-950 text-white">
      <PublicSiteNav active="events" />

      <section className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-8">
          <div className="flex items-center gap-3 flex-wrap mb-4">
            <span className="px-3 py-1 rounded-full text-xs bg-blue-500/15 text-blue-300 border border-blue-500/30">
              {event.eventScope === "PLATFORM" ? "Platform Event" : "School Event"}
            </span>
            <span className="px-3 py-1 rounded-full text-xs bg-slate-800 text-slate-300 border border-slate-700">
              {event.eventType}
            </span>
            {visiblePartners.length > 0 && (
              <span className="px-3 py-1 rounded-full text-xs bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                Partner Event
              </span>
            )}
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight">
            {event.title}
          </h1>
          <p className="text-slate-300 mt-5 text-lg leading-8 max-w-4xl">
            {event.description}
          </p>
        </div>

        {visiblePartners.length > 0 && (
          <section className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-6 mb-10">
            <h2 className="text-xl font-bold text-emerald-100 mb-4">
              Event Partners
            </h2>
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              {visiblePartners.map((partner) => {
                const organizer = partner.organizer;
                const name =
                  organizer?.organizationName ||
                  partner.displayName ||
                  "Approved partner";
                const href = organizer?.slug ? `/partners/${organizer.slug}` : null;

                const card = (
                  <div className="rounded-2xl border border-emerald-500/20 bg-slate-950/50 p-4 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center shrink-0">
                      {organizer?.logoUrl || partner.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={organizer?.logoUrl || partner.logoUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="font-black text-emerald-300">
                          {name.charAt(0)}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-white">{name}</p>
                      <p className="text-xs text-emerald-200/80">
                        {partner.role?.replaceAll("_", " ")}
                      </p>
                    </div>
                  </div>
                );

                return href ? (
                  <Link key={name} href={href} className="block">
                    {card}
                  </Link>
                ) : (
                  <div key={name}>{card}</div>
                );
              })}
            </div>
          </section>
        )}

        <div className="grid md:grid-cols-3 gap-4 mb-10">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5">
            <p className="text-slate-500 text-sm uppercase tracking-wide">Date</p>
            <p className="text-xl font-bold mt-2">
              {new Date(event.date).toLocaleDateString()}
            </p>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5">
            <p className="text-slate-500 text-sm uppercase tracking-wide">Organizer</p>
            <p className="text-xl font-bold mt-2">
              {event.eventScope === "PLATFORM"
                ? "Pratyo"
                : event.school?.schoolName || "School"}
            </p>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5">
            <p className="text-slate-500 text-sm uppercase tracking-wide">Visibility</p>
            <p className="text-xl font-bold mt-2">{event.visibility}</p>
          </div>
        </div>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8 mb-10">
          <div className="flex items-center justify-between gap-4 mb-5">
            <div>
              <h2 className="text-2xl font-bold">Published Results</h2>
              <p className="text-sm text-slate-400 mt-2">
                A focused results board built for large student lists.
              </p>
            </div>
            {sortedAchievements.length > 0 && (
              <div className="rounded-full border border-slate-700 bg-slate-950/80 px-4 py-2 text-xs text-slate-300">
                {sortedAchievements.length} result{sortedAchievements.length === 1 ? "" : "s"}
              </div>
            )}
          </div>
          {!event.resultsPublished ? (
            <p className="text-slate-400">
              Results not published yet.
            </p>
          ) : sortedAchievements.length === 0 ? (
            <p className="text-slate-400">
              No public results have been published for this event yet.
            </p>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/50">
              <div className="max-h-[70vh] overflow-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="sticky top-0 z-10 bg-slate-900/95 text-slate-300 backdrop-blur">
                    <tr className="border-b border-slate-800">
                      <th className="px-5 py-4 font-semibold">Student</th>
                      <th className="px-5 py-4 font-semibold">School</th>
                      <th className="px-5 py-4 font-semibold">Placement</th>
                      <th className="px-5 py-4 font-semibold">Level</th>
                      <th className="px-5 py-4 font-semibold">Certificate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedAchievements.map((achievement) => {
                      const studentName =
                        achievement.certificateRecipientName ||
                        achievement.student?.name ||
                        "Student";

                      return (
                        <tr
                          key={String(achievement._id)}
                          className="border-b border-slate-800/80 transition hover:bg-slate-900/60"
                        >
                          <td className="px-5 py-4 font-medium text-white">
                            {studentName}
                          </td>
                          <td className="px-5 py-4 text-slate-300">
                            {achievement.school?.schoolName || "School"}
                          </td>
                          <td className="px-5 py-4">
                            <span className="inline-flex rounded-full border border-yellow-400/20 bg-yellow-400/10 px-2.5 py-1 text-xs font-medium text-yellow-300">
                              {formatPlacement(achievement.placement)}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-slate-300">
                            {achievement.level || "-"}
                          </td>
                          <td className="px-5 py-4">
                            {achievement.certificateUrl ? (
                              <a
                                href={achievement.certificateUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex whitespace-nowrap text-blue-400 hover:text-blue-300"
                              >
                                View certificate
                              </a>
                            ) : (
                              <span className="text-slate-500">-</span>
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

        <div className="grid gap-8 xl:grid-cols-3">
          <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
            <h2 className="text-xl font-bold mb-4">Participation Info</h2>
            <div className="space-y-3 text-sm text-slate-300">
              {event.registrationDeadline && (
                <div>
                  Registration deadline:{" "}
                  {new Date(event.registrationDeadline).toLocaleDateString()}
                </div>
              )}
              {event.maxParticipants && (
                <div>
                  Total {String(event.participationFormat || "INDIVIDUAL").toUpperCase() === "TEAM"
                    ? "team"
                    : "student"} capacity: {event.maxParticipants}
                </div>
              )}
              {event.maxParticipantsPerSchool && (
                <div>
                  Max {String(event.participationFormat || "INDIVIDUAL").toUpperCase() === "TEAM"
                    ? "teams"
                    : "students"} per school: {event.maxParticipantsPerSchool}
                </div>
              )}
              {String(event.participationFormat || "INDIVIDUAL").toUpperCase() === "TEAM" &&
                (event.minTeamSize || event.maxTeamSize) && (
                  <div>
                    Team size: {event.minTeamSize || "No minimum"} to{" "}
                    {event.maxTeamSize || "No maximum"} members
                  </div>
                )}
              {event.eligibleGrades?.length > 0 && (
                <div>Eligible grades: {event.eligibleGrades.join(", ")}</div>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
            <h2 className="text-xl font-bold mb-4">Participating Schools</h2>
            {participatingSchools.length === 0 ? (
              <p className="text-sm text-slate-400">
                No schools are publicly listed for this event yet.
              </p>
            ) : (
              <div className="space-y-2 text-sm text-slate-300">
                {participatingSchools.map((school) => (
                  <div key={String(school._id)}>{school.schoolName}</div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
            <h2 className="text-xl font-bold mb-4">Want to participate?</h2>
            <p className="text-sm text-slate-400 leading-7">
              Schools join through their event dashboard and register eligible students for school-managed participation.
            </p>
            <div className="mt-5 flex flex-col gap-3">
              <Link
                href="/login"
                className="rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-3 text-center font-medium"
              >
                Login to participate
              </Link>
              <Link
                href="/register"
                className="rounded-xl bg-slate-800 hover:bg-slate-700 px-4 py-3 text-center font-medium text-slate-200"
              >
                Register a school
              </Link>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
