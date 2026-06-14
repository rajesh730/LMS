import Link from "next/link";
import { notFound } from "next/navigation";
import connectDB from "@/lib/db";
import Achievement from "@/models/Achievement";
import SchoolShowcaseProfile from "@/models/SchoolShowcaseProfile";
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
        "title eventType date visibility participationFormat eventScope partnerBrandingEnabled partners",
      populate: {
        path: "partners.organizer",
        select: "organizationName logoUrl",
      },
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

function CertificateLogoMark({ imageUrl, label, fallbackText }) {
  const image = normalizeImageUrl(imageUrl);

  return (
    <div className="flex min-w-[92px] flex-col items-center gap-2 text-center">
      <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-[#e1d4a4] bg-[#fffaf0] shadow-sm print:h-12 print:w-12">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={label}
            className="h-full w-full object-contain p-1.5"
          />
        ) : (
          <span className="text-sm font-black text-[#8a641b]">
            {getInitials(fallbackText || label)}
          </span>
        )}
      </div>
      <p className="max-w-[9rem] truncate text-[10px] font-black uppercase tracking-[0.08em] text-[#526071] print:text-[9px]">
        {label}
      </p>
    </div>
  );
}

export default async function CertificatePage({ params, searchParams }) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const achievement = await getCertificate(resolvedParams.id);
  const isPreviewMode = resolvedSearchParams?.preview === "1";

  if (!achievement || (!achievement.certificateIssuedAt && !isPreviewMode)) {
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
  const partnerLogo = Array.isArray(achievement.event?.partners)
    ? achievement.event.partners
        .filter((partner) => partner?.logoUrl || partner?.organizer?.logoUrl)
        .sort((a, b) => Number(Boolean(b?.isPrimary)) - Number(Boolean(a?.isPrimary)))[0]
    : null;
  const partnerLogoUrl =
    partnerLogo?.logoUrl || partnerLogo?.organizer?.logoUrl || "";
  const partnerName =
    partnerLogo?.displayName ||
    partnerLogo?.organizer?.organizationName ||
    "Event Partner";

  return (
    <main className="certificate-print-page min-h-screen bg-[#f5f7fb] px-4 py-8 text-[#10142f] print:min-h-0 print:bg-white print:p-0">
      <div className="mx-auto max-w-6xl print:max-w-none">
        <div className="flex items-center justify-between gap-4 mb-6 print:hidden">
          <Link href="/" className="text-sm font-bold text-[#526071] hover:text-[#10142f]">
            Back to platform
          </Link>
          <div className="flex items-center gap-3">
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

        <section className="certificate-sheet rounded-[1.4rem] border-[8px] border-[#d8b45f] bg-white shadow-[0_22px_70px_rgba(16,20,47,0.14)] print:shadow-none">
          <div className="certificate-frame rounded-[1rem] border border-[#d8b45f]/60 px-8 py-9 md:px-12">
            <div className="text-center">
              <p className="text-xs font-bold uppercase text-[#8a641b]">
                Certificate of Recognition
              </p>
              <div className="mt-4 flex flex-wrap items-start justify-center gap-4 md:gap-7 print:flex-nowrap print:gap-5">
                <CertificateLogoMark
                  imageUrl={achievement.schoolProfile?.coverImageUrl}
                  label={schoolName}
                  fallbackText={schoolName}
                />
                <div className="flex min-w-[120px] flex-col items-center gap-2 text-center">
                  <div className="flex h-14 items-center justify-center rounded-2xl border border-[#e1d4a4] bg-white px-4 shadow-sm print:h-12">
                    <PravyoLogo
                      variant="wordmark"
                      imageClassName="w-[126px] sm:w-[150px] print:w-[112px]"
                      className="items-center"
                    />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-[0.08em] text-[#526071] print:text-[9px]">
                    Pravyo Platform
                  </p>
                </div>
                {partnerLogoUrl && (
                  <CertificateLogoMark
                    imageUrl={partnerLogoUrl}
                    label={partnerName}
                    fallbackText={partnerName}
                  />
                )}
              </div>
              <p className="mt-3 text-[11px] font-black uppercase text-[#526071]">
                Official Digital Certificate
              </p>
              <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[#526071]">
                {isPreviewMode
                  ? "Certificate preview for administrator review"
                  : isTeamCertificate
                  ? "Issued for the recognized team result through the participating school."
                  : "Issued through the participating school as a verified Pravyo achievement record."}
              </p>
            </div>

            <div className="mt-9 text-center">
              <p className="text-xs font-bold uppercase text-[#526071]">
                {isParticipantCertificate ? "Issued to" : "Awarded to"}
              </p>
              <h2 className="mt-3 text-4xl font-black leading-tight text-[#10142f] md:text-5xl">
                {recipientName}
              </h2>
              <p className="mt-3 text-base font-semibold text-[#526071]">
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
                <p className="mx-auto mt-2 max-w-2xl text-sm text-[#526071]">
                  Team recognition recorded for{" "}
                  <span className="font-bold text-[#10142f]">{teamLabel}</span>
                  {achievement.captainStudent?.name
                    ? ` under captain ${achievement.captainStudent.name}.`
                    : "."}
                </p>
              )}
            </div>

            <div className="mt-7 rounded-xl border border-[#e6eaf7] bg-[#f8fbff] px-6 py-5 text-center">
              <p className="text-base leading-7 text-[#344054]">
                This certificate confirms that{" "}
                <span className="font-bold text-[#10142f]">
                  {recipientName || "the participant"}
                </span>{" "}
                {isParticipantCertificate ? (
                  <>
                    participated in{" "}
                    <span className="font-bold text-[#10142f]">
                      {achievement.event?.title || achievement.title}
                    </span>
                  </>
                ) : (
                  <>
                    {isTeamCertificate ? "earned" : "earned"}{" "}
                    <span className="font-bold text-[#8a641b]">
                      {placementLabel}
                    </span>{" "}
                    in{" "}
                    <span className="font-bold text-[#10142f]">
                      {achievement.event?.title || achievement.title}
                    </span>
                  </>
                )}
                .
              </p>
              <p className="mx-auto mt-3 max-w-3xl text-xs leading-5 text-[#526071]">
                This digital certificate is issued to{" "}
                <span className="font-bold text-[#10142f]">
                  {achievement.school?.schoolName || "the school"}
                </span>{" "}
                {isTeamCertificate
                  ? "for official sharing as the recognized team outcome record."
                  : "for official sharing with the student or parent."}
              </p>
              {achievement.description && (
                <p className="mx-auto mt-3 max-w-3xl text-xs leading-5 text-[#526071] print:hidden">
                  {achievement.description}
                </p>
              )}
            </div>

            <div className="certificate-meta-grid mt-7 grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-[#e6eaf7] bg-white p-4">
                <p className="text-[11px] font-black uppercase text-[#526071]">
                  {isTeamCertificate ? "Team Name" : "Event Date"}
                </p>
                <p className="mt-2 text-sm font-bold text-[#10142f]">
                  {isTeamCertificate
                    ? teamLabel
                    : achievement.event?.date
                    ? new Date(achievement.event.date).toLocaleDateString()
                    : "Not available"}
                </p>
              </div>
              <div className="rounded-xl border border-[#e6eaf7] bg-white p-4">
                <p className="text-[11px] font-black uppercase text-[#526071]">
                  Certificate Code
                </p>
                <p className="mt-2 text-sm font-bold text-[#10142f]">
                  {achievement.certificateCode || "Pending"}
                </p>
              </div>
              <div className="rounded-xl border border-[#e6eaf7] bg-white p-4">
                <p className="text-[11px] font-black uppercase text-[#526071]">
                  {isTeamCertificate ? "Event Date" : "Issued On"}
                </p>
                <p className="mt-2 text-sm font-bold text-[#10142f]">
                  {isTeamCertificate
                    ? achievement.event?.date
                      ? new Date(achievement.event.date).toLocaleDateString()
                      : "Not available"
                    : achievement.certificateIssuedAt
                    ? new Date(achievement.certificateIssuedAt).toLocaleDateString()
                    : "Preview only"}
                </p>
              </div>
            </div>

            {isTeamCertificate && (
              <div className="mt-6 rounded-xl border border-[#d6e6fb] bg-[#f7fbff] px-5 py-4 print:hidden">
                <p className="text-xs font-black uppercase text-[#33598f]">
                  Team Certificate Context
                </p>
                <p className="mt-2 text-sm leading-6 text-[#526071]">
                  This certificate represents the official result recorded for the team{" "}
                  <span className="font-semibold text-slate-900">{teamLabel}</span> in{" "}
                  <span className="font-semibold text-slate-900">
                    {achievement.event?.title || achievement.title}
                  </span>
                  . Schools can share this certificate alongside their internal roster and team member communication.
                </p>
              </div>
            )}

            {achievement.totalScore > 0 && (
              <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 print:hidden">
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

            <div className="mt-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-black uppercase text-[#526071]">
                  Verified by
                </p>
                <p className="mt-2 text-lg font-black text-[#10142f]">
                  Pravyo Platform
                </p>
                <p className="mt-1 text-xs text-[#526071]">
                  Multi-school talent, activity, and competition record
                </p>
              </div>

              <div className="text-xs font-semibold text-[#526071]">
                Reference link: /certificates/{achievement._id.toString()}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
