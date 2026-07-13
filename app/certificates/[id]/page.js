import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import Achievement from "@/models/Achievement";
import SchoolShowcaseProfile from "@/models/SchoolShowcaseProfile";
import { isActiveCertificateRecord } from "@/lib/certificates";
import CertificatePrintActions from "@/components/certificates/CertificatePrintActions";
import CertificateSheet, {
  resolveEventOwnership,
} from "@/components/certificates/CertificateSheet";

export const dynamic = "force-dynamic";

async function getCertificate(id) {
  await connectDB();

  const achievement = await Achievement.findById(id)
    .populate("student", "name grade")
    .populate("captainStudent", "name grade")
    .populate("school", "schoolName")
    .populate({
      path: "event",
      select:
        "title eventType eventOwnershipType date visibility participationFormat eventScope resultsPublished",
    })
    .lean();

  if (!achievement?.school?._id) {
    return achievement;
  }

  const schoolProfile = await SchoolShowcaseProfile.findOne({
    school: achievement.school._id,
  })
    .select("coverImageUrl")
    .lean();

  return {
    ...achievement,
    schoolProfile: schoolProfile || null,
  };
}

/* ---------- access control ---------- */

function canViewCertificate({ achievement, session }) {
  if (isActiveCertificateRecord(achievement) && achievement?.event?.resultsPublished) {
    return true;
  }

  const ownershipType = resolveEventOwnership(achievement.event);
  if (ownershipType !== "SCHOOL_EVENT") return true;

  const role = session?.user?.role;
  const userId = String(session?.user?.id || "");
  const userSchoolId = String(session?.user?.schoolId || session?.user?.id || "");
  const certificateSchoolId = String(
    achievement.school?._id || achievement.school || ""
  );
  const certificateStudentId = String(
    achievement.student?._id || achievement.student || ""
  );

  if (role === "SUPER_ADMIN") return true;
  if (role === "SCHOOL_ADMIN") return userSchoolId === certificateSchoolId;
  if (role === "TEACHER")
    return String(session?.user?.schoolId || "") === certificateSchoolId;
  if (role === "STUDENT") return userId === certificateStudentId;

  return false;
}

export default async function CertificatePage({ params, searchParams }) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const [achievement, session] = await Promise.all([
    getCertificate(resolvedParams.id),
    getServerSession(authOptions),
  ]);
  const isPreviewMode = resolvedSearchParams?.preview === "1";
  const isBulkMode = resolvedSearchParams?.bulk === "1";
  const canPreviewCertificate = ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER"].includes(
    session?.user?.role
  );
  const certificateActive =
    isActiveCertificateRecord(achievement) &&
    Boolean(achievement?.event?.resultsPublished);

  if (
    !achievement ||
    (!certificateActive && (!isPreviewMode || !canPreviewCertificate))
  ) {
    notFound();
  }

  if (!canViewCertificate({ achievement, session })) {
    notFound();
  }

  const autoPrint = resolvedSearchParams?.download === "pdf";

  const isTeamCertificate =
    String(achievement.event?.participationFormat || "INDIVIDUAL").toUpperCase() ===
      "TEAM" || Boolean(achievement.teamName);
  const eventTitle = achievement.event?.title || achievement.title || "Event";
  const teamLabel =
    achievement.teamName || achievement.certificateRecipientName || "School Team";

  return (
    <main
      className={`certificate-print-page min-h-screen text-[#10142f] print:min-h-0 print:bg-white print:p-0 ${
        isBulkMode ? "bg-white p-0" : "bg-[#eef1f7] px-4 py-8"
      }`}
    >
      <div className="mx-auto max-w-3xl print:max-w-none">
        {/* screen-only action bar */}
        {!isBulkMode && (
        <div className="mb-6 flex flex-col gap-4 print:hidden sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/"
            className="text-sm font-bold text-[#10142f]/70 transition hover:text-[#10142f]"
          >
            ← Back to platform
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            {isPreviewMode && !certificateActive && (
              <span className="rounded-lg bg-amber-100 px-3 py-2 text-xs font-bold text-amber-700">
                Preview — not yet issued
              </span>
            )}
            <CertificatePrintActions autoPrint={autoPrint} />
          </div>
        </div>
        )}

        {/* certificate sheet */}
        <CertificateSheet achievement={achievement} />

        {/* screen-only supplementary details (kept out of the printed sheet) */}
        {(achievement.totalScore > 0 || isTeamCertificate || achievement.description) && (
          <div className="mt-6 space-y-4 print:hidden">
            {achievement.description && (
              <div className="rounded-xl border border-[#e6eaf7] bg-white p-5 text-sm text-[#344054] shadow-sm">
                {achievement.description}
              </div>
            )}

            {isTeamCertificate && (
              <div className="rounded-xl border border-[#d6e6fb] bg-[#f7fbff] p-5">
                <p className="text-xs font-black uppercase text-[#1f4e79]">
                  Team Certificate Context
                </p>
                <p className="mt-2 text-sm leading-6 text-[#526071]">
                  This certificate represents the official result recorded for the team{" "}
                  <span className="font-semibold text-[#0a1f4d]">{teamLabel}</span> in{" "}
                  <span className="font-semibold text-[#0a1f4d]">{eventTitle}</span>.
                  {achievement.captainStudent?.name
                    ? ` Captain: ${achievement.captainStudent.name}.`
                    : ""}
                </p>
              </div>
            )}

            {achievement.totalScore > 0 && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
                <p className="text-xs font-black uppercase text-emerald-700">Score Summary</p>
                <p className="mt-2 text-2xl font-bold text-emerald-900">
                  {achievement.totalScore} points
                  {achievement.scorePercentage > 0
                    ? ` · ${achievement.scorePercentage}%`
                    : ""}
                </p>
                {achievement.scorecard?.length > 0 && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {achievement.scorecard.map((entry) => (
                      <div
                        key={`${entry.label}-${entry.maxScore}`}
                        className="rounded-xl border border-emerald-200 bg-white p-4"
                      >
                        <p className="font-semibold text-slate-900">{entry.label}</p>
                        <p className="mt-1 text-sm text-slate-600">
                          {entry.score} / {entry.maxScore}
                        </p>
                        {entry.comment && (
                          <p className="mt-2 text-xs text-slate-500">{entry.comment}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
