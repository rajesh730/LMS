import Link from "next/link";
import connectDB from "@/lib/db";
import User from "@/models/User";
import SchoolShowcaseProfile from "@/models/SchoolShowcaseProfile";

export const dynamic = "force-dynamic";

export default async function PublicSchoolsPage() {
  await connectDB();

  const schools = await User.find({
    role: "SCHOOL_ADMIN",
    status: { $in: ["APPROVED", "SUBSCRIBED"] },
  })
    .select("schoolName schoolLocation principalName")
    .lean();

  const schoolIds = schools.map((school) => school._id);

  const profiles = await SchoolShowcaseProfile.find({
    school: { $in: schoolIds },
    visibility: "PUBLIC",
  })
    .select("school tagline summary coverImageUrl highlightMetrics")
    .lean();

  const profileMap = new Map(
    profiles.map((profile) => [String(profile.school), profile])
  );

  const publicSchools = schools
    .map((school) => {
      const profile = profileMap.get(String(school._id));
      return {
        ...school,
        profile,
      };
    })
    .filter((school) => school.profile);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-6 py-16 md:px-12">
      <div className="max-w-6xl mx-auto">
        <div className="max-w-3xl mb-12">
          <p className="text-sm uppercase tracking-[0.35em] text-emerald-400 mb-4">
            Discover Active Schools
          </p>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight">
            Public school activity profiles built around talent and extracurricular life
          </h1>
          <p className="text-slate-400 mt-4 text-lg">
            Explore how schools host showcases, join competitions, and build vibrant activity cultures beyond academics.
          </p>
        </div>

        {publicSchools.length === 0 ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-10 text-center text-slate-400">
            No public school profiles are available yet.
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-6">
            {publicSchools.map((school) => (
              <article
                key={String(school._id)}
                className="rounded-3xl overflow-hidden border border-slate-800 bg-slate-900/70"
              >
                <div
                  className="h-48 bg-cover bg-center"
                  style={{
                    backgroundImage: school.profile.coverImageUrl
                      ? `linear-gradient(rgba(2,6,23,0.2), rgba(2,6,23,0.85)), url(${school.profile.coverImageUrl})`
                      : "linear-gradient(135deg, rgba(16,185,129,0.2), rgba(14,116,144,0.35), rgba(15,23,42,0.95))",
                  }}
                />
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-bold">{school.schoolName}</h2>
                      <p className="text-slate-400 mt-1">
                        {school.schoolLocation || "Location not listed"}
                      </p>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      Public Profile
                    </span>
                  </div>
                  {school.profile.tagline && (
                    <p className="text-emerald-300 mt-4">{school.profile.tagline}</p>
                  )}
                  {school.profile.summary && (
                    <p className="text-slate-300 mt-3 line-clamp-3">
                      {school.profile.summary}
                    </p>
                  )}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
                    {[
                      ["Hosted", school.profile.highlightMetrics?.eventsHosted || 0],
                      ["Joined", school.profile.highlightMetrics?.eventsParticipated || 0],
                      ["Awards", school.profile.highlightMetrics?.awardsCount || 0],
                      ["Clubs", school.profile.highlightMetrics?.clubsCount || 0],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="rounded-xl bg-slate-950/80 border border-slate-800 p-3"
                      >
                        <p className="text-xs uppercase tracking-wide text-slate-500">
                          {label}
                        </p>
                        <p className="text-xl font-bold text-white mt-1">{value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6">
                    <Link
                      href={`/schools/${school._id}`}
                      className="inline-flex items-center px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 transition text-white font-medium"
                    >
                      View School Profile
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
