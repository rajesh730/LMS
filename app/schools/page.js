import Link from "next/link";
import connectDB from "@/lib/db";
import User from "@/models/User";
import SchoolShowcaseProfile from "@/models/SchoolShowcaseProfile";
import { getActiveSchoolPromotions } from "@/lib/schoolPromotions";
import PublicSiteNav from "@/components/public/PublicSiteNav";
import {
  PublicBadge,
  PublicCard,
  PublicContainer,
  PublicHero,
  PublicPageShell,
  PublicSectionHeader,
  PublicStatTile,
} from "@/components/public/PublicLayout";
import { FaArrowRight, FaAward, FaCalendarAlt, FaSchool } from "react-icons/fa";

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

  const totalHosted = publicSchools.reduce(
    (sum, school) => sum + (school.profile?.highlightMetrics?.eventsHosted || 0),
    0
  );
  const totalAwards = publicSchools.reduce(
    (sum, school) => sum + (school.profile?.highlightMetrics?.awardsCount || 0),
    0
  );

  return (
    <PublicPageShell>
      <PublicSiteNav active="schools" />
      <PublicHero
        eyebrow="Discover Active Schools"
        title="School profiles built around talent and activity"
        description="Explore how schools host showcases, join competitions, and build vibrant cultures beyond academics."
        stats={
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
            <PublicStatTile label="Profiles" value={publicSchools.length} icon={FaSchool} />
            <PublicStatTile label="Hosted" value={totalHosted} icon={FaCalendarAlt} />
            <PublicStatTile label="Awards" value={totalAwards} icon={FaAward} className="col-span-2 lg:col-span-1" />
          </div>
        }
      />

      <PublicContainer className="py-6 sm:py-8">
        {spotlights.length > 0 && (
          <section className="mb-10">
            <PublicSectionHeader
              eyebrow="School Spotlight"
              title="Highlighted school profiles"
              description="These spotlights rotate separately from the regular public school directory."
            />

            <div className="grid gap-5 lg:grid-cols-3">
              {spotlights.map((promotion) => (
                <Link
                  key={promotion.id}
                  href={promotion.href}
                  className="group overflow-hidden rounded-[26px] border border-[#cfe0f6] bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-[#2f7fdb]/45"
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
                      <PublicBadge>School Spotlight</PublicBadge>
                      <PublicBadge tone="white">{promotion.priority}</PublicBadge>
                    </div>
                    <h3 className="mt-4 text-xl font-black text-slate-950 group-hover:text-[#0a2f66]">
                      {promotion.title}
                    </h3>
                    {promotion.school.location && (
                      <p className="mt-1 text-sm font-semibold text-[#0a2f66]">
                        {promotion.school.location}
                      </p>
                    )}
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
                      {promotion.tagline}
                    </p>
                    <span className="mt-5 inline-flex items-center gap-2 text-sm font-black text-[#0a2f66]">
                      View spotlight
                      <FaArrowRight />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {publicSchools.length === 0 ? (
          <PublicCard flushMobile className="p-10 text-center text-slate-600">
            No public school profiles are available yet.
          </PublicCard>
        ) : (
          <div className="grid lg:grid-cols-2 gap-6">
            {publicSchools.map((school) => (
              <PublicCard
                key={String(school._id)}
                flushMobile
                className="overflow-hidden p-0"
              >
                <div
                  className="h-48 bg-cover bg-center"
                  style={{
                    backgroundImage: school.profile.coverImageUrl
                      ? `linear-gradient(rgba(2,6,23,0.2), rgba(2,6,23,0.85)), url(${school.profile.coverImageUrl})`
                      : "linear-gradient(135deg, rgba(16,185,129,0.2), rgba(14,116,144,0.35), rgba(15,23,42,0.95))",
                  }}
                />
                <div className="p-5 sm:p-6">
                  <div className="grid gap-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <PublicBadge tone="success">Public Profile</PublicBadge>
                    </div>
                    <div className="min-w-0">
                      <h2 className="max-w-[18rem] break-words text-2xl font-black leading-tight text-slate-950 sm:max-w-none">{school.schoolName}</h2>
                      <p className="mt-2 max-w-[19rem] break-words text-slate-500 sm:max-w-none">
                        {school.schoolLocation || "Location not listed"}
                      </p>
                    </div>
                  </div>
                  {school.profile.tagline && (
                    <p className="text-[#0a2f66] mt-4 font-semibold">{school.profile.tagline}</p>
                  )}
                  {school.profile.summary && (
                    <p className="text-slate-600 mt-3 line-clamp-3">
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
                        className="rounded-2xl bg-[#f8fbff] border border-[#d7e5f7] p-3"
                      >
                        <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">
                          {label}
                        </p>
                        <p className="text-xl font-black text-slate-950 mt-1">{value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6">
                    <Link
                      href={`/schools/${school._id}`}
                      className="inline-flex items-center gap-2 rounded-full bg-[#0a2f66] px-4 py-2 text-sm font-black text-white transition hover:bg-[#123f82]"
                    >
                      View School Profile
                      <FaArrowRight />
                    </Link>
                  </div>
                </div>
              </PublicCard>
            ))}
          </div>
        )}
      </PublicContainer>
    </PublicPageShell>
  );
}
