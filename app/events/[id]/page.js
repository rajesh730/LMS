import Link from "next/link";
import connectDB from "@/lib/db";
import Event from "@/models/Event";
import TalentSubmission from "@/models/TalentSubmission";
import Achievement from "@/models/Achievement";
import "@/models/ExternalOrganizer";

export const dynamic = "force-dynamic";

function formatPlacement(value) {
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
    .populate("targetGroup", "name")
    .populate(
      "partners.organizer",
      "organizationName slug logoUrl website verificationStatus profileVisibility"
    )
    .lean();

  if (!event) return null;

  const [submissions, achievements] = await Promise.all([
    TalentSubmission.find({
      event: id,
      status: "PUBLISHED",
    })
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(12)
      .populate("school", "schoolName")
      .populate("student", "name")
      .lean(),
    Achievement.find({
      event: id,
      isPublic: true,
    })
      .sort({ awardedAt: -1 })
      .limit(12)
      .populate("school", "schoolName")
      .populate("student", "name")
      .lean(),
  ]);

  return { event, submissions, achievements };
}

export default async function PublicEventPage({ params }) {
  const resolvedParams = await params;
  const data = await getEventData(resolvedParams.id);

  if (!data) {
    return (
      <main className="min-h-screen bg-slate-950 text-white p-8">
        <div className="max-w-5xl mx-auto text-slate-400">Public event not found.</div>
      </main>
    );
  }

  const { event, submissions, achievements } = data;
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
      THIRD_PLACE: 3,
      MERIT: 4,
      SPECIAL_MENTION: 5,
      PARTICIPANT: 6,
    };
    return (order[a.placement] || 99) - (order[b.placement] || 99);
  });

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="border-b border-slate-800 bg-slate-900/50">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <Link
            href="/events"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition"
          >
            Back to public events
          </Link>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid lg:grid-cols-[2fr_1fr] gap-10">
          <div>
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
              <p className="text-slate-300 mt-5 text-lg leading-8">
                {event.description}
              </p>
            </div>

            {visiblePartners.length > 0 && (
              <section className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-6 mb-10">
                <h2 className="text-xl font-bold text-emerald-100 mb-4">
                  Event Partners
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
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
                    ? "E-Grantha Talent"
                    : event.school?.schoolName || "School"}
                </p>
              </div>
              <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5">
                <p className="text-slate-500 text-sm uppercase tracking-wide">Visibility</p>
                <p className="text-xl font-bold mt-2">{event.visibility}</p>
              </div>
            </div>

            <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8 mb-10">
              <h2 className="text-2xl font-bold mb-5">Published Showcase Entries</h2>
              {submissions.length === 0 ? (
                <p className="text-slate-400">
                  No public submissions have been published for this event yet.
                </p>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {submissions.map((submission) => (
                    <article
                      key={String(submission._id)}
                      className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5"
                    >
                      <h3 className="text-lg font-semibold">{submission.title}</h3>
                      <p className="text-sm text-slate-400 mt-2">
                        {submission.school?.schoolName || "School showcase"}
                        {submission.student?.name ? ` - ${submission.student.name}` : ""}
                      </p>
                      {submission.description && (
                        <p className="text-sm text-slate-300 mt-3">
                          {submission.description}
                        </p>
                      )}
                      {submission.assets?.length > 0 && (
                        <div className="mt-4 space-y-2">
                          {submission.assets.map((asset, index) => (
                            <a
                              key={`${submission._id}-${asset.url}-${index}`}
                              href={asset.url}
                              className="block text-sm text-blue-400 hover:text-blue-300 underline"
                            >
                              {asset.label || asset.url}
                            </a>
                          ))}
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8">
              <h2 className="text-2xl font-bold mb-5">Published Results & Recognition</h2>
              {sortedAchievements.length === 0 ? (
                <p className="text-slate-400">
                  Results have not been published for this event yet.
                </p>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {sortedAchievements.map((achievement) => (
                    <div
                      key={String(achievement._id)}
                      className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5"
                    >
                      <h3 className="text-lg font-semibold">{achievement.title}</h3>
                      <p className="text-sm text-slate-400 mt-2">
                        {achievement.school?.schoolName || "School"}
                        {achievement.student?.name ? ` - ${achievement.student.name}` : ""}
                      </p>
                      <p className="text-sm text-yellow-300 mt-3">
                        {formatPlacement(achievement.placement)} - {achievement.level}
                      </p>
                      {achievement.totalScore > 0 && (
                        <p className="text-sm text-emerald-300 mt-2">
                          Score: {achievement.totalScore}
                          {achievement.scorePercentage > 0
                            ? ` (${achievement.scorePercentage}%)`
                            : ""}
                        </p>
                      )}
                      {achievement.description && (
                        <p className="text-sm text-slate-300 mt-3">
                          {achievement.description}
                        </p>
                      )}
                      {achievement.certificateUrl && (
                        <a
                          href={achievement.certificateUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex text-sm text-blue-400 hover:text-blue-300 mt-3"
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

          <aside className="space-y-8">
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
                  <div>Max participants: {event.maxParticipants}</div>
                )}
                {event.maxParticipantsPerSchool && (
                  <div>Max per school: {event.maxParticipantsPerSchool}</div>
                )}
                {event.targetGroup?.name && (
                  <div>School group: {event.targetGroup.name}</div>
                )}
                {event.eligibleGrades?.length > 0 && (
                  <div>Eligible grades: {event.eligibleGrades.join(", ")}</div>
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
              <h2 className="text-xl font-bold mb-4">Want to participate?</h2>
              <p className="text-sm text-slate-400 leading-7">
                Students can log in to build their talent profile and submit entries.
                Schools can also join through their event dashboard for school-managed participation.
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
          </aside>
        </div>
      </section>
    </main>
  );
}
