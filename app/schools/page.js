import Link from "next/link";
import connectDB from "@/lib/db";
import User from "@/models/User";
import SchoolShowcaseProfile from "@/models/SchoolShowcaseProfile";
import { getActiveSchoolPromotions } from "@/lib/schoolPromotions";
import PublicSiteNav from "@/components/public/PublicSiteNav";

export const dynamic = "force-dynamic";

export default async function PublicSchoolsPage() {
  await connectDB();

  const [schools, spotlights] = await Promise.all([
    User.find({
      role: "SCHOOL_ADMIN",
      status: { $in: ["APPROVED", "SUBSCRIBED"] },
    })
      .select("schoolName schoolLocation principalName")
      .lean(),
    getActiveSchoolPromotions("SCHOOLS_SPOTLIGHT", 3),
  ]);

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
    <main className="min-h-screen bg-[#08111f] text-slate-100">
      <PublicSiteNav active="schools" />
      <section className="relative overflow-hidden border-b border-white/10 px-6 py-14 md:px-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(47,127,219,.24),transparent_32%),radial-gradient(circle_at_78%_16%,rgba(143,196,255,.18),transparent_28%)]" />
        <div className="relative mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_360px] lg:items-center">
          <div className="max-w-3xl">
            <p className="text-sm uppercase tracking-[0.35em] text-emerald-300 mb-4">
              Discover Active Schools
            </p>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight">
              Public school activity profiles built around talent and extracurricular life
            </h1>
            <p className="text-slate-300 mt-4 text-lg leading-8">
              Explore how schools host showcases, join competitions, and build
              vibrant activity cultures beyond academics.
            </p>
          </div>
          <svg
            viewBox="0 0 360 260"
            aria-hidden="true"
            className="hidden h-64 w-full lg:block"
          >
            <defs>
              <linearGradient id="schoolPageAccent" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0%" stopColor="#2f7fdb" />
                <stop offset="100%" stopColor="#8fc4ff" />
              </linearGradient>
            </defs>
            <path d="M38 212h284" stroke="#334155" strokeLinecap="round" strokeWidth="16" />
            <path d="M72 212V92l108-54 108 54v120" fill="#0f1b2d" stroke="#475569" strokeWidth="8" strokeLinejoin="round" />
            <path d="M132 212v-58h96v58" fill="#08111f" stroke="#64748b" strokeWidth="8" />
            <circle cx="180" cy="95" r="26" fill="url(#schoolPageAccent)" />
            <path d="M110 126h38M212 126h38" stroke="#94a3b8" strokeLinecap="round" strokeWidth="12" />
            <path d="M74 80l106-54 106 54" fill="none" stroke="url(#schoolPageAccent)" strokeLinecap="round" strokeWidth="10" />
          </svg>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-6 py-12 md:px-12">
        {spotlights.length > 0 && (
          <section className="mb-12">
            <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#8fc4ff]">
                  School Spotlight
                </p>
                <h2 className="mt-3 text-3xl font-black tracking-tight text-white">
                  Paid placements from active schools
                </h2>
                <p className="mt-3 max-w-2xl text-slate-400">
                  These paid spotlight slots rotate independently from the
                  normal public school directory.
                </p>
              </div>
              <span className="w-fit rounded-full border border-[#2f7fdb]/30 bg-[#2f7fdb]/10 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#d7e9ff]">
                Sponsored
              </span>
            </div>

            <div className="grid gap-5 lg:grid-cols-3">
              {spotlights.map((promotion) => (
                <Link
                  key={promotion.id}
                  href={promotion.href}
                  className="group overflow-hidden rounded-2xl border border-[#2f7fdb]/25 bg-[#10243f] shadow-xl shadow-black/20 transition hover:-translate-y-1 hover:border-[#8fc4ff]/60"
                >
                  <div
                    className="h-44 bg-cover bg-center"
                    style={{
                      backgroundImage: promotion.profile?.coverImageUrl
                        ? `linear-gradient(rgba(8,17,31,0.15), rgba(8,17,31,0.88)), url(${promotion.profile.coverImageUrl})`
                        : "linear-gradient(135deg, rgba(47,127,219,0.35), rgba(10,47,102,0.95))",
                    }}
                  />
                  <div className="p-5">
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-[#d7e9ff]">
                        Paid Spotlight
                      </span>
                      <span className="rounded-full bg-[#2f7fdb]/15 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-[#d7e9ff]">
                        {promotion.priority}
                      </span>
                    </div>
                    <h3 className="mt-4 text-xl font-black text-white group-hover:text-[#d7e9ff]">
                      {promotion.title}
                    </h3>
                    <p className="mt-1 text-sm font-semibold text-[#8fc4ff]">
                      {promotion.school.name}
                    </p>
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-300">
                      {promotion.tagline}
                    </p>
                    <span className="mt-5 inline-flex text-sm font-bold text-[#d7e9ff]">
                      View spotlight
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {publicSchools.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-10 text-center text-slate-400">
            No public school profiles are available yet.
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-6">
            {publicSchools.map((school) => (
              <article
                key={String(school._id)}
                className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.05]"
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
                  <div className="grid grid-cols-3 gap-3 mt-6">
                    {[
                      ["Hosted", school.profile.highlightMetrics?.eventsHosted || 0],
                      ["Joined", school.profile.highlightMetrics?.eventsParticipated || 0],
                      ["Awards", school.profile.highlightMetrics?.awardsCount || 0],
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
