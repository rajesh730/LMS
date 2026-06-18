import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import Achievement from "@/models/Achievement";
import SchoolShowcaseProfile from "@/models/SchoolShowcaseProfile";
import { isActiveCertificateRecord } from "@/lib/certificates";
import { formatPlacementLabel } from "@/lib/results";
import { normalizeImageUrl } from "@/lib/imageUrls";
import PravyoLogo from "@/components/brand/PravyoLogo";
import CertificatePrintActions from "@/components/certificates/CertificatePrintActions";

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

function getInitials(value) {
  return String(value || "S")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function CertificateLogoMark({ imageUrl, label, fallbackText, design }) {
  const image = normalizeImageUrl(imageUrl);

  return (
    <div className="flex min-w-[92px] flex-col items-center gap-2 text-center">
      <div className={`flex h-14 w-14 items-center justify-center overflow-hidden shadow-sm print:h-12 print:w-12 ${design.logoMark}`}>
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={label}
            className="h-full w-full object-contain p-1.5"
          />
        ) : (
          <span className={`text-sm font-black ${design.logoInitial}`}>
            {getInitials(fallbackText || label)}
          </span>
        )}
      </div>
      <p className={`max-w-[9rem] truncate text-[10px] font-black uppercase tracking-[0.08em] print:text-[9px] ${design.logoCaption}`}>
        {label}
      </p>
    </div>
  );
}

function resolveEventOwnership(event) {
  if (event?.eventOwnershipType) return event.eventOwnershipType;
  return event?.eventScope === "SCHOOL" ? "SCHOOL_EVENT" : "PLATFORM_EVENT";
}

function buildCertificateMeta({ achievement, schoolName }) {
  const ownershipType = resolveEventOwnership(achievement.event);
  const eventTitle = achievement.event?.title || achievement.title || "Event";
  const rows =
    ownershipType === "SCHOOL_EVENT"
      ? [
          ["School Event", schoolName],
          ["Managed by", "Pravyo"],
        ]
      : [
          ["Platform Event", eventTitle],
          ["Associated School", schoolName],
          ["Managed by", "Pravyo"],
        ];

  return { ownershipType, rows };
}

function buildCertificateLogos({ ownershipType, schoolName, schoolLogoUrl, design }) {
  const schoolLogo = (
    <CertificateLogoMark
      key="school"
      imageUrl={schoolLogoUrl}
      label={schoolName}
      fallbackText={schoolName}
      design={design}
    />
  );
  const pravyoLogo = (
    <div key="pravyo" className="flex min-w-[120px] flex-col items-center gap-2 text-center">
      <div className={`flex h-14 items-center justify-center px-4 shadow-sm print:h-12 ${design.brandLogoBox}`}>
        <PravyoLogo
          variant="wordmark"
          imageClassName="w-[126px] sm:w-[150px] print:w-[112px]"
          className="items-center"
        />
      </div>
      <p className={`text-[10px] font-black uppercase tracking-[0.08em] print:text-[9px] ${design.logoCaption}`}>
        Pravyo
      </p>
    </div>
  );
  if (ownershipType === "PLATFORM_EVENT") return [pravyoLogo, schoolLogo];
  return [schoolLogo, pravyoLogo];
}

function canViewCertificate({ achievement, session, isPreviewMode }) {
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
  if (role === "TEACHER") return String(session?.user?.schoolId || "") === certificateSchoolId;
  if (role === "STUDENT") return userId === certificateStudentId;

  return false;
}

const CERTIFICATE_DESIGN = {
  title: "Certificate of Achievement",
  page: "bg-[#f5f7fb] text-[#10142f]",
  sheet:
    "rounded-[1.25rem] border-[6px] border-[#1f4e79] bg-white shadow-[0_24px_72px_rgba(16,20,47,0.16)]",
  frame:
    "rounded-[0.85rem] border border-[#c9a64a] px-8 py-9 md:px-12 bg-[linear-gradient(135deg,#ffffff_0%,#ffffff_58%,#f8fbff_100%)]",
  eyebrow: "text-[#1f4e79]",
  subcopy: "text-[#526071]",
  recipient: "text-[#10142f]",
  recipientMeta: "text-[#526071]",
  accent: "text-[#9b6b13]",
  statement: "rounded-xl border border-[#d9e3ef] bg-[#f8fbff] px-6 py-5 text-center shadow-sm",
  metaCard: "rounded-xl border border-[#e6eaf7] bg-white p-4 shadow-sm",
  logoMark: "rounded-xl border border-[#d9e3ef] bg-[#f8fbff]",
  brandLogoBox: "rounded-xl border border-[#d9e3ef] bg-white",
  logoInitial: "text-[#1f4e79]",
  logoCaption: "text-[#526071]",
  score: "rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 print:hidden",
  team: "rounded-xl border border-[#d6e6fb] bg-[#f7fbff] px-5 py-4 print:hidden",
  footerRule: "border-[#d9e3ef]",
};

export default async function CertificatePage({ params, searchParams }) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const achievement = await getCertificate(resolvedParams.id);
  const isPreviewMode = resolvedSearchParams?.preview === "1";
  const design = CERTIFICATE_DESIGN;
  const session = await getServerSession(authOptions);
  const canPreviewCertificate = ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER"].includes(
    session?.user?.role
  );
  const certificateActive =
    isActiveCertificateRecord(achievement) &&
    Boolean(achievement.event?.resultsPublished);

  if (
    !achievement ||
    (!certificateActive &&
      (!isPreviewMode || !canPreviewCertificate))
  ) {
    notFound();
  }

  if (!canViewCertificate({ achievement, session, isPreviewMode })) {
    notFound();
  }

  const eventHref =
    achievement.event?._id && achievement.event?.visibility === "PUBLIC"
      ? `/events/${achievement.event._id}`
      : null;
  const isParticipantCertificate = achievement.placement === "PARTICIPANT";
  const placementLabel = formatPlacementLabel(achievement.placement);
  const isTeamCertificate =
    String(achievement.event?.participationFormat || "INDIVIDUAL").toUpperCase() ===
      "TEAM" || Boolean(achievement.teamName);
  const recipientName =
    achievement.certificateRecipientName ||
    achievement.teamName ||
    achievement.student?.name ||
    "Student";
  const teamLabel =
    achievement.teamName ||
    achievement.certificateRecipientName ||
    "School Team";
  const autoPrint = resolvedSearchParams?.download === "pdf";
  const schoolName = achievement.school?.schoolName || "Participating School";
  const certificateMeta = buildCertificateMeta({
    achievement,
    schoolName,
  });
  const certificateLogos = buildCertificateLogos({
    ownershipType: certificateMeta.ownershipType,
    schoolName,
    schoolLogoUrl: achievement.schoolProfile?.coverImageUrl,
    design,
  });

  return (
    <main className={`certificate-print-page min-h-screen px-4 py-8 print:min-h-0 print:bg-white print:p-0 ${design.page}`}>
      <div className="mx-auto max-w-6xl print:max-w-none">
        <div className="mb-6 flex flex-col gap-4 print:hidden lg:flex-row lg:items-center lg:justify-between">
          <Link href="/" className="text-sm font-bold text-[#526071] hover:text-[#10142f]">
            Back to platform
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <CertificatePrintActions autoPrint={autoPrint} />
            {eventHref && (
              <Link
                href={eventHref}
                className="rounded-lg bg-[#4326e8] px-4 py-2 text-sm font-bold text-white"
              >
                View public event
              </Link>
            )}
          </div>
        </div>

        <section className={`certificate-sheet relative overflow-hidden print:shadow-none ${design.sheet}`}>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-2 bg-[#c9a64a]" />
          <div className={`certificate-frame relative ${design.frame}`}>
            <div className="text-center">
              <p className={`text-xs font-bold uppercase ${design.eyebrow}`}>
                {design.title}
              </p>
              <div className="mt-4 flex flex-wrap items-start justify-center gap-4 md:gap-7 print:flex-nowrap print:gap-5">
                {certificateLogos}
              </div>
              <p className={`mt-3 text-[11px] font-black uppercase ${design.subcopy}`}>
                Official Digital Certificate
              </p>
              <p className={`mx-auto mt-3 max-w-2xl text-sm leading-6 ${design.subcopy}`}>
                {isPreviewMode
                  ? "Certificate preview for administrator review"
                  : isTeamCertificate
                  ? "Prepared for the recognized team result through the participating school."
                  : "Prepared through the participating school as a Pravyo achievement record."}
              </p>
            </div>

            <div className="mt-9 text-center">
              <p className={`text-xs font-bold uppercase ${design.subcopy}`}>
                {isParticipantCertificate ? "Presented to" : "Awarded to"}
              </p>
              <h2 className={`mt-3 text-4xl font-black leading-tight md:text-5xl ${design.recipient}`}>
                {recipientName}
              </h2>
              <p className={`mt-3 text-base font-semibold ${design.recipientMeta}`}>
                {achievement.school?.schoolName || "School participant"}
                {isTeamCertificate
                  ? achievement.captainStudent?.name
                    ? ` - Captain ${achievement.captainStudent.name}`
                    : ""
                  : achievement.student?.grade
                  ? ` - ${achievement.student.grade}`
                  : ""}
              </p>
              {isTeamCertificate && (
                <p className={`mx-auto mt-2 max-w-2xl text-sm ${design.subcopy}`}>
                  Team recognition recorded for{" "}
                  <span className={`font-bold ${design.recipient}`}>{teamLabel}</span>
                  {achievement.captainStudent?.name
                    ? ` under captain ${achievement.captainStudent.name}.`
                    : "."}
                </p>
              )}
            </div>

            <div className={`mt-7 ${design.statement}`}>
              <p className="text-base leading-7 text-[#344054]">
                This certificate confirms that{" "}
                <span className={`font-bold ${design.recipient}`}>
                  {recipientName || "the participant"}
                </span>{" "}
                {isParticipantCertificate ? (
                  <>
                    participated in{" "}
                    <span className={`font-bold ${design.recipient}`}>
                      {achievement.event?.title || achievement.title}
                    </span>
                  </>
                ) : (
                  <>
                    {isTeamCertificate ? "earned" : "earned"}{" "}
                    <span className={`font-bold ${design.accent}`}>
                      {placementLabel}
                    </span>{" "}
                    in{" "}
                    <span className={`font-bold ${design.recipient}`}>
                      {achievement.event?.title || achievement.title}
                    </span>
                  </>
                )}
                . 
              </p>
              <p className={`mx-auto mt-3 max-w-3xl text-xs leading-5 ${design.subcopy}`}>
                This digital certificate is prepared for{" "}
                <span className={`font-bold ${design.recipient}`}>
                  {achievement.school?.schoolName || "the school"}
                </span>{" "}
                {isTeamCertificate
                  ? "for official sharing as the recognized team outcome record."
                  : "for official sharing with the student or parent."}
              </p>
              {achievement.description && (
                <p className={`mx-auto mt-3 max-w-3xl text-xs leading-5 print:hidden ${design.subcopy}`}>
                  {achievement.description}
                </p>
              )}
            </div>

            <div className="certificate-meta-grid mt-7 grid gap-3 md:grid-cols-3">
              {certificateMeta.rows.map(([label, value]) => (
                <div
                  key={label}
                  className={design.metaCard}
                >
                  <p className={`text-[11px] font-black uppercase ${design.subcopy}`}>
                    {label}
                  </p>
                  <p className={`mt-2 text-sm font-bold ${design.recipient}`}>
                    {value || "Not available"}
                  </p>
                </div>
              ))}
              <div className={design.metaCard}>
                <p className={`text-[11px] font-black uppercase ${design.subcopy}`}>
                  Certificate Code
                </p>
                <p className={`mt-2 text-sm font-bold ${design.recipient}`}>
                  {achievement.certificateCode || "Pending"}
                </p>
              </div>
              <div className={design.metaCard}>
                <p className={`text-[11px] font-black uppercase ${design.subcopy}`}>
                  {isTeamCertificate ? "Team Name" : "Active On"}
                </p>
                <p className={`mt-2 text-sm font-bold ${design.recipient}`}>
                  {isTeamCertificate
                    ? teamLabel
                    : achievement.certificateIssuedAt
                    ? new Date(achievement.certificateIssuedAt).toLocaleDateString()
                    : "Preview only"}
                </p>
              </div>
            </div>

            {isTeamCertificate && (
              <div className={`mt-6 ${design.team}`}>
                <p className={`text-xs font-black uppercase ${design.eyebrow}`}>
                  Team Certificate Context
                </p>
                <p className={`mt-2 text-sm leading-6 ${design.subcopy}`}>
                  This certificate represents the official result recorded for the team{" "}
                  <span className={`font-semibold ${design.recipient}`}>{teamLabel}</span> in{" "}
                  <span className={`font-semibold ${design.recipient}`}>
                    {achievement.event?.title || achievement.title}
                  </span>
                  . Schools can share this certificate alongside their internal roster and team member communication.
                </p>
              </div>
            )}

            {achievement.totalScore > 0 && (
              <div className={`mt-6 ${design.score}`}>
                <p className="text-xs font-black uppercase text-emerald-700">
                  Score Summary
                </p>
                <p className="mt-2 text-2xl font-bold text-emerald-900">
                  {achievement.totalScore} points
                  {achievement.scorePercentage > 0
                    ? ` - ${achievement.scorePercentage}%`
                    : ""}
                </p>
                {achievement.scorecard?.length > 0 && (
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {achievement.scorecard.map((entry) => (
                      <div
                        key={`${entry.label}-${entry.maxScore}`}
                        className="rounded-xl border border-emerald-200 bg-white p-4"
                      >
                        <p className="font-semibold text-slate-900">{entry.label}</p>
                        <p className="text-sm text-slate-600 mt-1">
                          {entry.score} / {entry.maxScore}
                        </p>
                        {entry.comment && (
                          <p className="text-xs text-slate-500 mt-2">{entry.comment}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className={`mt-8 flex flex-col gap-5 border-t pt-5 md:flex-row md:items-end md:justify-between ${design.footerRule}`}>
              <div>
                <p className={`text-xs font-black uppercase ${design.subcopy}`}>
                  Managed by
                </p>
                <p className={`mt-2 text-lg font-black ${design.recipient}`}>
                  Pravyo
                </p>
              </div>

              <div className={`text-xs font-semibold ${design.subcopy}`}>
                Certificate Code: {achievement.certificateCode || "Pending"}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
