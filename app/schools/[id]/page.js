import connectDB from "@/lib/db";
import User from "@/models/User";
import SchoolShowcaseProfile from "@/models/SchoolShowcaseProfile";
import Event from "@/models/Event";
import Achievement from "@/models/Achievement";
import Club from "@/models/Club";
import Link from "next/link";
import { FaArrowLeft, FaCalendarAlt, FaMapMarkerAlt, FaStar, FaUsers } from "react-icons/fa";

export const dynamic = "force-dynamic";

async function getSchoolData(id) {
  await connectDB();

  const school = await User.findOne({
    _id: id,
    role: "SCHOOL_ADMIN",
    status: { $in: ["APPROVED", "SUBSCRIBED"] },
  })
    .select("schoolName principalName schoolLocation website establishedYear")
    .lean();

  if (!school) return null;

  const [profile, events, achievements, clubs] = await Promise.all([
    SchoolShowcaseProfile.findOne({ school: id, visibility: "PUBLIC" })
      .populate("featuredEvents", "title date eventType visibility")
      .lean(),
    Event.find({
      school: id,
      visibility: "PUBLIC",
      lifecycleStatus: { $ne: "ARCHIVED" },
    })
      .sort({ date: -1 })
      .select("title date description eventType")
      .limit(6)
      .lean(),
    Achievement.find({ school: id, isPublic: true })
      .sort({ awardedAt: -1 })
      .select(
        "title placement level awardedAt totalScore scorePercentage certificateUrl"
      )
      .limit(8)
      .lean(),
    Club.find({ school: id, status: "ACTIVE", isPubliclyListed: true })
      .select("name clubType description")
      .limit(8)
      .lean(),
  ]);

  return { school, profile, events, achievements, clubs };
}

export default async function PublicSchoolPage({ params }) {
  const resolvedParams = await params;
  const data = await getSchoolData(resolvedParams.id);

  if (!data) {
    return (
      <main className="min-h-screen bg-slate-950 text-white p-8">
        <div className="max-w-5xl mx-auto">
          <p className="text-slate-400">School not found.</p>
        </div>
      </main>
    );
  }

  const { school, profile, events, achievements, clubs } = data;
  const metrics = profile?.highlightMetrics || {};

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="border-b border-slate-800 bg-slate-900/50">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition"
          >
            <FaArrowLeft /> Back to platform
          </Link>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid gap-10 lg:grid-cols-[2fr_1fr]">
          <div>
            <div className="mb-8">
              <h1 className="text-5xl font-bold text-white mb-4">{school.schoolName}</h1>
              <p className="text-xl text-slate-300 mb-4">
                {profile?.tagline || "A school building identity through talent, activities, and showcases."}
              </p>
              <div className="flex flex-wrap gap-4 text-sm text-slate-400">
                {school.schoolLocation && (
                  <span className="inline-flex items-center gap-2">
                    <FaMapMarkerAlt /> {school.schoolLocation}
                  </span>
                )}
                {school.establishedYear && <span>Established {school.establishedYear}</span>}
                {school.website && (
                  <a href={school.website} className="text-blue-400 hover:text-blue-300">
                    Visit Website
                  </a>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3 mb-10">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
                <div className="text-slate-400 text-sm mb-2">Events Hosted</div>
                <div className="text-3xl font-bold">{metrics.eventsHosted || 0}</div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
                <div className="text-slate-400 text-sm mb-2">Events Joined</div>
                <div className="text-3xl font-bold">{metrics.eventsParticipated || 0}</div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
                <div className="text-slate-400 text-sm mb-2">Awards</div>
                <div className="text-3xl font-bold">{metrics.awardsCount || 0}</div>
              </div>
            </div>

            <section className="mb-10 rounded-3xl border border-slate-800 bg-slate-900/50 p-8">
              <h2 className="text-2xl font-bold mb-4">School Story</h2>
              <p className="text-slate-300 leading-8">
                {profile?.summary ||
                  "This school has not added a public showcase summary yet. The profile will grow as the school shares more about its clubs, events, and achievements."}
              </p>
            </section>

            <section className="mb-10 rounded-3xl border border-slate-800 bg-slate-900/50 p-8">
              <h2 className="text-2xl font-bold mb-6">Recent Talent Events</h2>
              <div className="grid gap-4">
                {events.length === 0 ? (
                  <p className="text-slate-400">No public events have been published yet.</p>
                ) : (
                  events.map((event) => (
                    <Link
                      key={event._id}
                      href={`/events/${event._id}`}
                      className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 block hover:border-blue-500/40 transition"
                    >
                      <div className="flex items-center justify-between gap-4 mb-2">
                        <h3 className="text-xl font-semibold">{event.title}</h3>
                        <span className="text-xs text-slate-400 uppercase">{event.eventType}</span>
                      </div>
                      <p className="text-slate-400 mb-3">{event.description}</p>
                      <div className="inline-flex items-center gap-2 text-sm text-slate-300">
                        <FaCalendarAlt /> {new Date(event.date).toLocaleDateString()}
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-800 bg-slate-900/50 p-8">
              <h2 className="text-2xl font-bold mb-6">Achievements</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {achievements.length === 0 ? (
                  <p className="text-slate-400">No public achievements published yet.</p>
                ) : (
                  achievements.map((achievement) => (
                    <div key={achievement._id} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
                      <div className="flex items-center gap-3 mb-2">
                        <FaStar className="text-yellow-400" />
                        <h3 className="font-semibold">{achievement.title}</h3>
                      </div>
                      <p className="text-sm text-slate-400 mb-2">
                        {achievement.placement.replaceAll("_", " ")} - {achievement.level}
                      </p>
                      {achievement.totalScore > 0 && (
                        <p className="text-xs text-emerald-300 mb-2">
                          Score: {achievement.totalScore}
                          {achievement.scorePercentage > 0
                            ? ` (${achievement.scorePercentage}%)`
                            : ""}
                        </p>
                      )}
                      <p className="text-xs text-slate-500">
                        {new Date(achievement.awardedAt).toLocaleDateString()}
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
                  ))
                )}
              </div>
            </section>
          </div>

          <aside className="space-y-8">
            <section className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6">
              <h2 className="text-xl font-bold mb-4">Public Highlights</h2>
              <div className="space-y-3">
                {(profile?.publicHighlights || []).length === 0 ? (
                  <p className="text-slate-400 text-sm">No public highlights added yet.</p>
                ) : (
                  profile.publicHighlights.map((highlight, index) => (
                    <div key={`${highlight}-${index}`} className="rounded-2xl bg-slate-950/70 p-4 text-slate-300">
                      {highlight}
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6">
              <h2 className="text-xl font-bold mb-4">Clubs & Activities</h2>
              <div className="space-y-3">
                {clubs.length === 0 ? (
                  <p className="text-slate-400 text-sm">No public clubs listed yet.</p>
                ) : (
                  clubs.map((club) => (
                    <div key={club._id} className="rounded-2xl bg-slate-950/70 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <FaUsers className="text-emerald-400" />
                        <h3 className="font-semibold">{club.name}</h3>
                      </div>
                      <p className="text-xs text-slate-400 uppercase mb-2">{club.clubType}</p>
                      <p className="text-sm text-slate-300">{club.description}</p>
                    </div>
                  ))
                )}
              </div>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}
