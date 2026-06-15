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

const CERTIFICATE_DESIGNS = {
  classic: {
    label: "Classic",
    title: "Certificate of Recognition",
    page: "bg-[#f5f2ea] text-[#231b12]",
    sheet:
      "rounded-[1.4rem] border-[8px] border-[#b8892f] bg-[#fffdf8] shadow-[0_22px_70px_rgba(58,39,12,0.16)]",
    frame:
      "rounded-[1rem] border border-[#d8b45f] px-8 py-9 md:px-12 bg-[linear-gradient(180deg,#fffdf8,#fffaf0)]",
    eyebrow: "text-[#8a641b]",
    subcopy: "text-[#6d604c]",
    recipient: "text-[#2a1f14]",
    recipientMeta: "text-[#6d604c]",
    accent: "text-[#8a641b]",
    statement: "rounded-xl border border-[#ead9a8] bg-[#fffaf0] px-6 py-5 text-center",
    metaCard: "rounded-xl border border-[#ead9a8] bg-white p-4",
    logoMark: "rounded-2xl border border-[#e1d4a4] bg-[#fffaf0]",
    brandLogoBox: "rounded-2xl border border-[#e1d4a4] bg-white",
    logoInitial: "text-[#8a641b]",
    logoCaption: "text-[#6d604c]",
    score: "rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 print:hidden",
    team: "rounded-xl border border-[#ead9a8] bg-[#fffaf0] px-5 py-4 print:hidden",
    footerRule: "border-[#ead9a8]",
  },
  modern: {
    label: "Modern",
    title: "Achievement Certificate",
    page: "bg-[#eef4f8] text-[#111827]",
    sheet:
      "rounded-xl border border-[#d6e2ea] bg-white shadow-[0_22px_70px_rgba(17,24,39,0.12)]",
    frame:
      "rounded-lg border-0 px-8 py-9 md:px-12 bg-[linear-gradient(135deg,#ffffff_0%,#ffffff_56%,#f3f8fb_100%)]",
    eyebrow: "text-[#1f4e79]",
    subcopy: "text-[#5f6b7a]",
    recipient: "text-[#111827]",
    recipientMeta: "text-[#5f6b7a]",
    accent: "text-[#1f4e79]",
    statement: "rounded-lg border border-[#dfe5eb] bg-[#f8fbff] px-6 py-5 text-center",
    metaCard: "rounded-lg border border-[#dfe5eb] bg-white p-4",
    logoMark: "rounded-lg border border-[#dfe5eb] bg-[#f8fbff]",
    brandLogoBox: "rounded-lg border border-[#dfe5eb] bg-white",
    logoInitial: "text-[#1f4e79]",
    logoCaption: "text-[#5f6b7a]",
    score: "rounded-lg border border-[#cfe8dc] bg-[#f1fbf6] px-5 py-4 print:hidden",
    team: "rounded-lg border border-[#d6e2ea] bg-[#f8fbff] px-5 py-4 print:hidden",
    footerRule: "border-[#dfe5eb]",
  },
  best: {
    label: "Best",
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
  },
};

function resolveCertificateDesign(value) {
  const key = String(value || "best").toLowerCase();
  return CERTIFICATE_DESIGNS[key] ? key : "best";
}

function buildDesignHref(id, designKey, { isPreviewMode }) {
  const params = new URLSearchParams({ design: designKey });
  if (isPreviewMode) params.set("preview", "1");
  return `/certificates/${id}?${params.toString()}`;
}

export default async function CertificatePage({ params, searchParams }) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const achievement = await getCertificate(resolvedParams.id);
  const isPreviewMode = resolvedSearchParams?.preview === "1";
  const designKey = resolveCertificateDesign(resolvedSearchParams?.design);
  const design = CERTIFICATE_DESIGNS[designKey];
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
            <div className="flex rounded-lg border border-[#d9e3ef] bg-white p-1 shadow-sm">
              {Object.entries(CERTIFICATE_DESIGNS).map(([key, option]) => (
                <Link
                  key={key}
                  href={buildDesignHref(resolvedParams.id, key, { isPreviewMode })}
                  className={`rounded-md px-3 py-1.5 text-xs font-black transition ${
                    designKey === key
                      ? "bg-[#1f4e79] text-white"
                      : "text-[#526071] hover:bg-[#f8fbff] hover:text-[#1f4e79]"
                  }`}
                >
                  {option.label}
                </Link>
              ))}
            </div>
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
          {designKey === "best" && (
            <div className="pointer-events-none absolute inset-x-0 top-0 h-2 bg-[#c9a64a]" />
          )}
          {designKey === "modern" && (
            <div className="pointer-events-none absolute left-0 top-0 h-full w-2 bg-[#1f4e79]" />
          )}
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
