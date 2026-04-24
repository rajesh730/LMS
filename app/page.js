import Link from 'next/link';
import connectDB from '@/lib/db';
import User from '@/models/User';
import SchoolShowcaseProfile from '@/models/SchoolShowcaseProfile';
import Achievement from '@/models/Achievement';
import { FaSchool, FaStar, FaTrophy, FaUsers } from 'react-icons/fa';

export const dynamic = "force-dynamic";

function formatPlacement(value) {
  return String(value || "").replaceAll("_", " ");
}

async function getFeaturedSchools() {
  await connectDB();

  const schools = await User.find({
    role: 'SCHOOL_ADMIN',
    status: { $in: ['APPROVED', 'SUBSCRIBED'] },
  })
    .select('schoolName schoolLocation')
    .sort({ createdAt: -1 })
    .limit(3)
    .lean();

  const profiles = await SchoolShowcaseProfile.find({
    school: { $in: schools.map((school) => school._id) },
    visibility: 'PUBLIC',
  })
    .select('school tagline highlightMetrics')
    .lean();

  const profileMap = new Map(
    profiles.map((profile) => [profile.school.toString(), profile])
  );

  return schools.map((school) => ({
    ...school,
    showcase: profileMap.get(school._id.toString()) || null,
  }));
}

async function getRecentResults() {
  await connectDB();

  return Achievement.find({ isPublic: true })
    .sort({ awardedAt: -1 })
    .limit(4)
    .populate("school", "schoolName")
    .populate("student", "name")
    .populate("event", "title")
    .lean();
}

export default async function Home() {
  const [featuredSchools, recentResults] = await Promise.all([
    getFeaturedSchools(),
    getRecentResults(),
  ]);

  return (
    <main className="min-h-screen bg-slate-950 text-white selection:bg-blue-500/30">
      {/* Navbar */}
      <nav className="border-b border-slate-800/50 backdrop-blur-md fixed w-full z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <FaSchool className="text-white text-lg" />
            </div>
            <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
              E-Grantha Talent
            </span>
          </div>
          <div className="flex items-center gap-6">
            <Link
              href="/schools"
              className="text-sm font-medium text-slate-300 hover:text-white transition"
            >
              Showcase Directory
            </Link>
            <Link
              href="/events"
              className="text-sm font-medium text-slate-300 hover:text-white transition"
            >
              Public Events
            </Link>
            <Link
              href="/partners"
              className="text-sm font-medium text-slate-300 hover:text-white transition mr-4"
            >
              Partners
            </Link>
            <div className="w-px h-6 bg-slate-800 hidden sm:block"></div>
            <Link
              href="/login"
              className="px-6 py-2.5 rounded-full text-slate-300 hover:text-white hover:bg-slate-800 transition font-medium"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="px-6 py-2.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white transition font-medium shadow-lg shadow-blue-500/25 hidden sm:block"
            >
              Register School
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-40 pb-20 px-6 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/50 border border-slate-800 text-blue-400 text-sm font-medium mb-8">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            Multi-school talent and activity platform
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-8 leading-tight">
            Showcase the schools that <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-emerald-400">
              do more beyond academics.
            </span>
          </h1>

          <p className="text-xl text-slate-400 mb-12 max-w-2xl mx-auto leading-relaxed">
            Help schools organize talent events, extracurricular activities, showcases, and inter-school competitions while giving parents and students a public view of how active each school really is.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Link
              href="/register"
              className="px-8 py-4 rounded-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white text-lg font-bold shadow-xl shadow-blue-500/20 transition-all hover:scale-105"
            >
              Get Started Now
            </Link>
            <Link
              href="/schools"
              className="px-8 py-4 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-lg font-bold transition-all hover:scale-105 flex items-center justify-center gap-2"
            >
              <FaSchool className="text-slate-400" />
              Explore Schools Directory
            </Link>
            <Link
              href="/organize-event"
              className="px-8 py-4 rounded-full bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-100 text-lg font-bold transition-all hover:scale-105"
            >
              Propose Partner Event
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-6 bg-slate-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 rounded-3xl bg-slate-950 border border-slate-800 hover:border-blue-500/30 transition-colors group">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6 group-hover:bg-blue-500/20 transition-colors">
                <FaStar className="text-2xl text-blue-400" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">Talent Profiles</h3>
              <p className="text-slate-400 leading-relaxed">
                Capture the clubs, achievements, standout participants, and showcase moments that define each school&apos;s extracurricular identity.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-slate-950 border border-slate-800 hover:border-purple-500/30 transition-colors group">
              <div className="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-6 group-hover:bg-purple-500/20 transition-colors">
                <FaTrophy className="text-2xl text-purple-400" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">Competitions & Showcases</h3>
              <p className="text-slate-400 leading-relaxed">
                Run school-owned or platform-owned events with participation, results, recognition, and public visibility built in.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-slate-950 border border-slate-800 hover:border-emerald-500/30 transition-colors group">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-6 group-hover:bg-emerald-500/20 transition-colors">
                <FaUsers className="text-2xl text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">Public School Promotion</h3>
              <p className="text-slate-400 leading-relaxed">
                Let families and students see which schools are active, creative, competitive, and consistently engaged in talent activities.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between gap-6 mb-10">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-slate-500 mb-3">
                Featured Schools
              </p>
              <h2 className="text-4xl font-bold text-white">
                Schools building visible activity culture
              </h2>
            </div>
            <Link href="/register" className="text-blue-400 hover:text-blue-300 font-medium">
              Join the platform
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {featuredSchools.map((school) => (
              <Link
                key={school._id.toString()}
                href={`/schools/${school._id}`}
                className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 hover:border-blue-500/40 transition-colors"
              >
                <h3 className="text-2xl font-bold text-white mb-3">{school.schoolName}</h3>
                <p className="text-slate-400 mb-4">{school.showcase?.tagline || 'Public school showcase profile'}</p>
                <div className="space-y-2 text-sm text-slate-300">
                  <div>Location: {school.schoolLocation || 'Not published yet'}</div>
                  <div>Events Hosted: {school.showcase?.highlightMetrics?.eventsHosted || 0}</div>
                  <div>Awards: {school.showcase?.highlightMetrics?.awardsCount || 0}</div>
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-8">
            <Link href="/schools" className="text-emerald-400 hover:text-emerald-300 font-medium">
              Browse all public school profiles
            </Link>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-slate-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between gap-6 mb-10">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-slate-500 mb-3">
                Recent Results
              </p>
              <h2 className="text-4xl font-bold text-white">
                Winners and published outcomes
              </h2>
            </div>
            <Link href="/events" className="text-yellow-400 hover:text-yellow-300 font-medium">
              Explore public events
            </Link>
          </div>

          {recentResults.length === 0 ? (
            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8 text-slate-400">
              Published event results will appear here as schools and platform competitions conclude.
            </div>
          ) : (
            <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6">
              {recentResults.map((achievement) => (
                <div
                  key={achievement._id.toString()}
                  className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6"
                >
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-300 border border-yellow-500/20 text-xs uppercase tracking-wide">
                    <FaTrophy />
                    {formatPlacement(achievement.placement)}
                  </div>
                  <h3 className="text-xl font-bold text-white mt-4">
                    {achievement.title}
                  </h3>
                  <p className="text-slate-400 mt-3">
                    {achievement.school?.schoolName || "School"}
                    {achievement.student?.name ? ` - ${achievement.student.name}` : ""}
                  </p>
                  <p className="text-sm text-slate-500 mt-2">
                    {achievement.event?.title || "Published event result"}
                  </p>
                  {achievement.totalScore > 0 && (
                    <p className="text-sm text-emerald-300 mt-2">
                      Score: {achievement.totalScore}
                      {achievement.scorePercentage > 0
                        ? ` (${achievement.scorePercentage}%)`
                        : ""}
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
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-800 text-center text-slate-500">
        <p>© 2024 E-Grantha. All rights reserved.</p>
      </footer>
    </main>
  );
}
