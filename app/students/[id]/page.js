import Link from "next/link";
import mongoose from "mongoose";
import { notFound } from "next/navigation";
import connectDB from "@/lib/db";
import Student from "@/models/Student";
import Achievement from "@/models/Achievement";
import SchoolMagazineArticle from "@/models/SchoolMagazineArticle";
import SchoolShowcaseProfile from "@/models/SchoolShowcaseProfile";
import { getActiveCertificateFilter } from "@/lib/certificates";
import { WritingPreview } from "@/components/WritingContent";
import PublicSiteNav from "@/components/public/PublicSiteNav";
import PublicShareButton from "@/components/public/PublicShareButton";
import SchoolLogoMark from "@/components/public/SchoolLogoMark";
import StatTile from "@/components/ui/StatTile";
import {
  FaArrowRight,
  FaBookOpen,
  FaCertificate,
  FaCheckCircle,
  FaFeatherAlt,
  FaGraduationCap,
  FaMedal,
  FaPenNib,
  FaTrophy,
} from "react-icons/fa";

export const dynamic = "force-dynamic";

function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatMonthYear(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function formatPlacement(value) {
  if (value === "RUNNER_UP") return "1st Runner Up";
  if (value === "THIRD_PLACE") return "2nd Runner Up";
  return String(value || "Participant").replaceAll("_", " ");
}

function getCategoryLabel(value) {
  const label = String(value || "Writing").replaceAll("_", " ").toLowerCase();
  return label.charAt(0).toUpperCase() + label.slice(1);
}

async function getPortfolioData(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;

  await connectDB();

  const student = await Student.findOne({
    _id: id,
    isDeleted: { $ne: true },
    status: { $ne: "INACTIVE" },
  })
    .select("name firstName lastName grade school createdAt")
    .populate("school", "schoolName schoolLocation")
    .lean();

  if (!student) return null;

  const schoolObjectId = student.school?._id || student.school;

  const [achievementsRaw, writingsRaw, schoolProfile] = await Promise.all([
    Achievement.find({
      student: id,
      isPublic: true,
      ...getActiveCertificateFilter(),
    })
      .sort({ awardedAt: -1 })
      .select(
        "title placement level awardedAt certificateUrl certificateCode certificateRecipientName teamName recipientType event"
      )
      .populate(
        "event",
        "title date eventScope publicResultsEnabled resultsPublished"
      )
      .limit(40)
      .lean(),
    SchoolMagazineArticle.find({
      authorStudent: id,
      status: "APPROVED",
      isPublished: true,
      isDeleted: { $ne: true },
    })
      .select("title content category publishedAt updatedAt")
      .sort({ publishedAt: -1, updatedAt: -1 })
      .limit(24)
      .lean(),
    schoolObjectId
      ? SchoolShowcaseProfile.findOne({ school: schoolObjectId })
          .select("coverImageUrl")
          .lean()
      : null,
  ]);

  // Only surface achievements tied to genuinely public, published events.
  const achievements = achievementsRaw.filter(
    (achievement) =>
      achievement.event?.eventScope === "PLATFORM" &&
      achievement.event?.publicResultsEnabled &&
      achievement.event?.resultsPublished
  );

  // Privacy gate: do not create browsable profiles for students who have no
  // publicly published footprint of their own.
  if (achievements.length === 0 && writingsRaw.length === 0) {
    return null;
  }

  const eventIds = new Set(
    achievements.map((a) => String(a.event?._id || a.event)).filter(Boolean)
  );

  return {
    student,
    schoolProfile: schoolProfile || null,
    achievements,
    writings: writingsRaw,
    stats: {
      achievements: achievements.length,
      wins: achievements.filter((a) => a.placement === "WINNER").length,
      certificates: achievements.filter((a) => a.certificateUrl).length,
      writings: writingsRaw.length,
      competitions: eventIds.size,
    },
  };
}

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const data = await getPortfolioData(resolvedParams.id);
  if (!data) return { title: "Student portfolio not found" };

  const name = data.student.name || "Student";
  const school = data.student.school?.schoolName || "their school";
  return {
    title: `${name} — Student Portfolio`,
    description: `Verified achievements, certificates, and writing by ${name} at ${school}, on Pravyo.`,
  };
}

function EmptyPanel({ icon: Icon, title, description }) {
  return (
    <div className="flex min-h-44 flex-col items-center justify-center rounded-xl border border-dashed border-[#d7cdbb] bg-[#f8fbff] p-6 text-center">
      <Icon className="text-4xl text-amber-400" />
      <h3 className="mt-3 text-base font-black text-[#17120a]">{title}</h3>
      <p className="mt-1 max-w-sm text-sm leading-6 text-[#52657d]">{description}</p>
    </div>
  );
}

function AchievementRow({ achievement }) {
  const isWinner = achievement.placement === "WINNER";
  return (
    <article className="flex h-full items-start gap-4 rounded-xl border border-[#e1e8f4] bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[#c9d8ea] hover:shadow-md">
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
          isWinner ? "bg-amber-50 text-amber-600" : "bg-slate-100 text-slate-500"
        }`}
      >
        {isWinner ? <FaTrophy /> : <FaMedal />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${
              isWinner ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"
            }`}
          >
            {formatPlacement(achievement.placement)}
          </span>
          {achievement.event?.title && (
            <span className="text-xs font-semibold text-[#75869b]">
              {achievement.event.title}
            </span>
          )}
        </div>
        <h3 className="mt-2 text-sm font-black text-[#17120a]">
          {achievement.title}
        </h3>
        <p className="mt-1 text-xs text-[#75869b]">
          {formatDate(achievement.awardedAt || achievement.event?.date)}
        </p>
        {achievement.certificateUrl && (
          <a
            href={achievement.certificateUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-black text-purple-700"
          >
            <FaCertificate /> View certificate
            {achievement.certificateCode ? ` · ${achievement.certificateCode}` : ""}
          </a>
        )}
      </div>
    </article>
  );
}

function WritingCard({ writing }) {
  return (
    <Link
      href={`/writings/${writing._id}`}
      className="block h-full rounded-xl border border-[#e1e8f4] bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[#c9d8ea] hover:shadow-md"
    >
      <div className="flex flex-wrap gap-2">
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase text-emerald-700">
          Published
        </span>
        <span className="rounded-full bg-purple-50 px-2.5 py-1 text-[10px] font-black uppercase text-purple-700">
          {getCategoryLabel(writing.category)}
        </span>
      </div>
      <h3 className="mt-2 line-clamp-2 text-sm font-black text-[#17120a]">
        {writing.title}
      </h3>
      <WritingPreview
        content={writing.content}
        maxLength={140}
        className="mt-2 line-clamp-3 text-xs leading-5 text-[#52657d]"
      />
      <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-black text-purple-700">
        Read writing <FaArrowRight />
      </p>
    </Link>
  );
}

export default async function StudentPortfolioPage({ params }) {
  const resolvedParams = await params;
  const data = await getPortfolioData(resolvedParams.id);

  if (!data) notFound();

  const { student, schoolProfile, achievements, writings, stats } = data;
  const name = student.name || "Student";
  const schoolId = student.school?._id ? String(student.school._id) : "";
  const schoolName = student.school?.schoolName || "School";
  const schoolLogoUrl = schoolProfile?.coverImageUrl || "";

  return (
    <main className="min-h-screen bg-[#f8f9fd] pb-24 text-[#17120a]">
      <PublicSiteNav active="schools" />

      <div className="student-portfolio-shell mx-auto max-w-5xl space-y-5 px-0 py-4 sm:px-6 sm:py-5">
        {/* breadcrumb + share */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-bold text-[#52657d]">
          <div className="flex items-center gap-2">
            <Link href="/" className="hover:text-purple-700">
              Home
            </Link>
            <span>/</span>
            {schoolId ? (
              <Link href={`/schools/${schoolId}`} className="hover:text-purple-700">
                {schoolName}
              </Link>
            ) : (
              <span>{schoolName}</span>
            )}
            <span>/</span>
            <span>{name}</span>
          </div>
          <PublicShareButton
            href={`/students/${student._id}`}
            title={`${name} — Student Portfolio`}
            label="Share Portfolio"
            className="inline-flex items-center gap-2 rounded-lg border border-[#d7e2ef] bg-white px-3 py-2 text-[#0a2f66] shadow-sm transition hover:bg-[#f8fbff]"
          />
        </div>

        {/* hero */}
        <section className="overflow-hidden rounded-2xl border border-[#d7e2ef] bg-white shadow-[0_18px_50px_rgba(10,47,102,0.08)]">
          <div className="student-portfolio-brand-band pravyo-brand-surface relative px-5 py-7 sm:px-8">
            <div className="absolute inset-0 bg-gradient-to-r from-black/10 via-transparent to-black/10" />
            <div className="relative flex flex-wrap items-center justify-between gap-3">
              <span className="student-portfolio-brand-chip inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1.5 text-xs font-black uppercase tracking-wide">
                <FaCheckCircle />
                Verified student portfolio
              </span>
              <span className="student-portfolio-brand-muted text-sm font-semibold">
                {stats.achievements + stats.writings} public records
              </span>
            </div>
          </div>

          <div className="px-5 pb-6 sm:px-8">
            <div className="-mt-5 rounded-2xl border border-[#e1e8f4] bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <div className="flex shrink-0 flex-col items-center gap-2 rounded-2xl border border-[#d7e2ef] bg-[#f8fbff] p-3 text-center shadow-sm">
                  <SchoolLogoMark
                    imageUrl={schoolLogoUrl}
                    name={schoolName}
                    className="h-24 w-24"
                    iconClassName="text-3xl"
                    shapeClassName="rounded-xl"
                  />
                  <span className="max-w-28 truncate text-[10px] font-black uppercase text-[#52657d]">
                    {schoolName}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-3xl font-black leading-tight text-[#17120a] md:text-4xl">
                      {name}
                    </h1>
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                      <FaCheckCircle title="Verified by Pravyo" />
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-semibold text-[#52657d]">
                    {student.grade && (
                      <span className="inline-flex items-center gap-1.5">
                        <FaGraduationCap className="text-[#1f4f7a]" /> {student.grade}
                      </span>
                    )}
                    {schoolId ? (
                      <Link
                        href={`/schools/${schoolId}`}
                        className="inline-flex items-center gap-1.5 hover:text-purple-700"
                      >
                        <SchoolLogoMark
                          imageUrl={schoolLogoUrl}
                          name={schoolName}
                          className="h-6 w-6"
                          iconClassName="text-xs"
                          shapeClassName="rounded-md"
                        />
                        {schoolName}
                      </Link>
                    ) : (
                      <span className="inline-flex items-center gap-1.5">
                        <SchoolLogoMark
                          imageUrl={schoolLogoUrl}
                          name={schoolName}
                          className="h-6 w-6"
                          iconClassName="text-xs"
                          shapeClassName="rounded-md"
                        />
                        {schoolName}
                      </span>
                    )}
                    {student.createdAt && (
                      <span>On Pravyo since {formatMonthYear(student.createdAt)}</span>
                    )}
                  </div>
                  <p className="mt-4 max-w-3xl text-sm leading-6 text-[#52657d]">
                    A verified record of {name.split(" ")[0]}&apos;s achievements,
                    certificates, and published writing — recognized through events and
                    showcases on Pravyo.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* stats */}
        <section className="grid grid-cols-2 gap-3 px-4 sm:gap-4 sm:px-0 md:grid-cols-4">
          <StatTile icon={FaTrophy} accent="amber" label="Achievements" value={stats.achievements} />
          <StatTile icon={FaMedal} accent="amber" label="Wins" value={stats.wins} />
          <StatTile icon={FaCertificate} accent="purple" label="Certificates" value={stats.certificates} />
          <StatTile icon={FaFeatherAlt} accent="purple" label="Published Writing" value={stats.writings} />
        </section>

        {/* achievements */}
        <section className="rounded-2xl border border-[#d7e2ef] bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="inline-flex items-center gap-2 text-lg font-black text-[#17120a]">
              <FaTrophy className="text-amber-500" />
              Achievements & Certificates
            </h2>
            <span className="rounded-full bg-[#eef5fb] px-3 py-1 text-xs font-black text-[#1f4f7a]">
              {achievements.length} records
            </span>
          </div>
          {achievements.length === 0 ? (
            <div className="mt-5">
              <EmptyPanel
                icon={FaTrophy}
                title="No public achievements yet"
                description="Verified event results and certificates will appear here once published."
              />
            </div>
          ) : (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {achievements.map((achievement) => (
                <AchievementRow key={String(achievement._id)} achievement={achievement} />
              ))}
            </div>
          )}
        </section>

        {/* writings */}
        <section className="rounded-2xl border border-[#d7e2ef] bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="inline-flex items-center gap-2 text-lg font-black text-[#17120a]">
              <FaPenNib className="text-purple-700" />
              Published Writing
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-black text-purple-700">
                {writings.length} pieces
              </span>
              <Link href="/student-voices" className="text-sm font-black text-purple-700">
                Explore student voices
              </Link>
            </div>
          </div>
          {writings.length === 0 ? (
            <div className="mt-5">
              <EmptyPanel
                icon={FaBookOpen}
                title="No published writing yet"
                description="Approved and published articles by this student will appear here."
              />
            </div>
          ) : (
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {writings.map((writing) => (
                <WritingCard key={String(writing._id)} writing={writing} />
              ))}
            </div>
          )}
        </section>

        {/* trust / CTA */}
        <section className="student-portfolio-brand-band pravyo-brand-surface relative overflow-hidden rounded-2xl p-6 shadow-lg">
          <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-black/10" />
          <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <span className="student-portfolio-brand-icon flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/20 text-xl">
                <FaCheckCircle />
              </span>
              <div>
                <h2 className="student-portfolio-brand-title text-lg font-black drop-shadow">
                  Every achievement here is verified by Pravyo
                </h2>
                <p className="student-portfolio-brand-muted mt-1 text-sm font-semibold leading-6">
                  Results, certificates, and writing are published through {schoolName} and
                  recognized on the Pravyo platform.
                </p>
              </div>
            </div>
            <Link
              href="/schools"
              className="student-portfolio-cta-button inline-flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-black shadow-sm transition hover:bg-[#f8fbff]"
            >
              Explore schools
              <FaArrowRight />
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
