import Link from "next/link";
import { notFound } from "next/navigation";
import { Cinzel, Great_Vibes } from "next/font/google";
import {
  CalendarDays,
  Award,
  CalendarCheck2,
  ShieldCheck,
} from "lucide-react";
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
import AppDate from "@/components/common/AppDate";

export const dynamic = "force-dynamic";

const displaySerif = Cinzel({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});
const scriptFont = Great_Vibes({
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});

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

function toTitleCase(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function resolveEventOwnership(event) {
  if (event?.eventOwnershipType) return event.eventOwnershipType;
  return event?.eventScope === "SCHOOL" ? "SCHOOL_EVENT" : "PLATFORM_EVENT";
}

/* ---------- decorative pieces ---------- */

const RIBBON_TRANSFORMS = {
  "top-left": "",
  "top-right": "scaleX(-1)",
  "bottom-left": "scaleY(-1)",
  "bottom-right": "scale(-1, -1)",
};

const RIBBON_POSITIONS = {
  "top-left": "top-0 left-0",
  "top-right": "top-0 right-0",
  "bottom-left": "bottom-0 left-0",
  "bottom-right": "bottom-0 right-0",
};

function CornerRibbon({ position }) {
  return (
    <svg
      viewBox="0 0 240 240"
      aria-hidden="true"
      className={`pointer-events-none absolute z-0 h-36 w-36 print:h-28 print:w-28 ${RIBBON_POSITIONS[position]}`}
      style={{ transform: RIBBON_TRANSFORMS[position] }}
    >
      <path d="M0 0 L240 0 C168 26 132 62 96 98 C62 132 26 168 0 240 Z" fill="#14b8a6" />
      <path d="M0 0 L186 0 C132 22 104 48 76 76 C50 102 24 132 0 186 Z" fill="#1d4ed8" />
      <path d="M0 0 L120 0 C86 18 66 38 48 56 C32 72 16 92 0 120 Z" fill="#0a1f4d" />
    </svg>
  );
}

function CornerBracket({ position }) {
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute h-7 w-7 border-[#0a1f4d] ${
        {
          "top-left": "top-0 left-0 border-l-2 border-t-2 rounded-tl",
          "top-right": "top-0 right-0 border-r-2 border-t-2 rounded-tr",
          "bottom-left": "bottom-0 left-0 border-l-2 border-b-2 rounded-bl",
          "bottom-right": "bottom-0 right-0 border-r-2 border-b-2 rounded-br",
        }[position]
      }`}
    />
  );
}

function OrnamentDivider({ className = "" }) {
  return (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      <span className="h-px w-16 bg-gradient-to-r from-transparent to-[#1d4ed8] sm:w-24" />
      <span className="text-[#14b8a6]">&#10070;</span>
      <span className="h-px w-16 bg-gradient-to-l from-transparent to-[#1d4ed8] sm:w-24" />
    </div>
  );
}

function CertificateLogoMark({ imageUrl, label, fallbackText }) {
  const image = normalizeImageUrl(imageUrl);

  return (
    <div className="flex items-center gap-3">
      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-[#dbe4f3] bg-white shadow-sm print:h-11 print:w-11">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={label} className="h-full w-full object-contain p-1.5" />
        ) : (
          <span className="text-sm font-black text-[#0a1f4d]">
            {getInitials(fallbackText || label)}
          </span>
        )}
      </div>
      <div className="text-left leading-tight">
        <p className="text-sm font-black uppercase tracking-wide text-[#0a1f4d] print:text-xs">
          {label}
        </p>
      </div>
    </div>
  );
}

function StatItem({ icon: Icon, label, value }) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full border border-[#1d4ed8]/30 bg-[#eef3ff] text-[#1d4ed8] print:h-10 print:w-10">
        <Icon className="h-5 w-5" strokeWidth={1.8} />
      </span>
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#0a1f4d]">
        {label}
      </p>
      <p className="text-xs font-semibold text-[#1d4ed8]">{value || "—"}</p>
    </div>
  );
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
  const achievement = await getCertificate(resolvedParams.id);
  const isPreviewMode = resolvedSearchParams?.preview === "1";
  const isBulkMode = resolvedSearchParams?.bulk === "1";
  const session = await getServerSession(authOptions);
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

  const ownershipType = resolveEventOwnership(achievement.event);
  const isPlatformEvent = ownershipType === "PLATFORM_EVENT";
  const eventHref =
    achievement.event?._id && achievement.event?.visibility === "PUBLIC"
      ? `/events/${achievement.event._id}`
      : null;
  const autoPrint = resolvedSearchParams?.download === "pdf";

  const isParticipantCertificate = achievement.placement === "PARTICIPANT";
  const isTeamCertificate =
    String(achievement.event?.participationFormat || "INDIVIDUAL").toUpperCase() ===
      "TEAM" || Boolean(achievement.teamName);

  const placementUpper = formatPlacementLabel(achievement.placement); // e.g. FINALIST
  const placementTitle = toTitleCase(placementUpper); // e.g. Finalist
  const eventTitle = achievement.event?.title || achievement.title || "Event";
  const schoolName = achievement.school?.schoolName || "Participating School";

  const recipientName =
    achievement.certificateRecipientName ||
    achievement.teamName ||
    achievement.student?.name ||
    "Student";
  const teamLabel =
    achievement.teamName || achievement.certificateRecipientName || "School Team";

  const recipientMeta = isTeamCertificate
    ? achievement.captainStudent?.name
      ? `Captain: ${achievement.captainStudent.name}`
      : ""
    : achievement.student?.grade || "";

  const schoolLine = isPlatformEvent ? "Associated School" : "School";

  // Header logos: platform events lead with Pravyo, school events lead with school.
  const pravyoMark = (
    <div key="pravyo" className="flex items-center">
      <PravyoLogo
        variant="wordmark"
        imageClassName="w-[124px] sm:w-[140px] print:w-[112px]"
        className="items-center"
      />
    </div>
  );
  const schoolMark = (
    <CertificateLogoMark
      key="school"
      imageUrl={achievement.schoolProfile?.coverImageUrl}
      label={schoolName}
      fallbackText={schoolName}
    />
  );
  const headerLogos = isPlatformEvent
    ? [pravyoMark, schoolMark]
    : [schoolMark, pravyoMark];

  const footerItems = (
    isPlatformEvent
      ? [
          ["Platform Event", eventTitle],
          ["Associated School", schoolName],
          ["Managed by", "Pravyo"],
        ]
      : [
          ["School Event", schoolName],
          ["Managed by", "Pravyo"],
        ]
  ).concat([["Certificate Code", achievement.certificateCode || "Pending"]]);

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
          <Link href="/" className="text-sm font-bold text-[#526071] hover:text-[#10142f]">
            ← Back to platform
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            {isPreviewMode && !certificateActive && (
              <span className="rounded-lg bg-amber-100 px-3 py-2 text-xs font-bold text-amber-700">
                Preview — not yet issued
              </span>
            )}
            <CertificatePrintActions autoPrint={autoPrint} />
            {achievement.certificateCode && (
              <Link
                href={`/verify?code=${encodeURIComponent(achievement.certificateCode)}`}
                className="rounded-lg border border-[#dbe5f4] bg-white px-4 py-2 text-sm font-bold text-[#0a2f66] hover:bg-[#eef4f8]"
              >
                Verify
              </Link>
            )}
            {eventHref && (
              <Link
                href={eventHref}
                className="rounded-lg bg-[#1f4e79] px-4 py-2 text-sm font-bold text-white"
              >
                View public event
              </Link>
            )}
          </div>
        </div>
        )}

        {/* certificate sheet */}
        <section className="certificate-sheet relative mx-auto aspect-[1/1.414] w-full overflow-hidden rounded-[1rem] border-[3px] border-[#0a1f4d] bg-white shadow-[0_24px_72px_rgba(10,31,77,0.22)] print:aspect-auto print:rounded-none print:shadow-none">
          {/* corner ribbons */}
          <CornerRibbon position="top-left" />
          <CornerRibbon position="top-right" />
          <CornerRibbon position="bottom-left" />
          <CornerRibbon position="bottom-right" />

          {/* inner double frame */}
          <div className="certificate-frame relative z-10 flex h-full flex-col items-center justify-between rounded-[0.75rem] border border-[#0a1f4d]/70 px-7 py-9 text-center sm:px-12 print:px-10 print:py-8">
            <CornerBracket position="top-left" />
            <CornerBracket position="top-right" />
            <CornerBracket position="bottom-left" />
            <CornerBracket position="bottom-right" />

            {/* header */}
            <div className="flex w-full flex-col items-center gap-4">
              <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
                {headerLogos[0]}
                <span className="h-9 w-px bg-[#cfd8e8]" />
                {headerLogos[1]}
              </div>

              <div className="mt-2">
                <h1
                  className={`${displaySerif.className} text-3xl font-bold tracking-[0.12em] text-[#0a1f4d] sm:text-4xl`}
                >
                  CERTIFICATE
                </h1>
                <div className="mt-1 flex items-center justify-center gap-2">
                  <span className="h-px w-8 bg-[#1d4ed8]" />
                  <p
                    className={`${displaySerif.className} text-sm font-semibold tracking-[0.3em] text-[#1d4ed8]`}
                  >
                    OF RECOGNITION
                  </p>
                  <span className="h-px w-8 bg-[#1d4ed8]" />
                </div>
              </div>
            </div>

            {/* recipient */}
            <div className="flex w-full flex-col items-center">
              <p className="text-sm font-medium italic text-[#526071]">
                Proudly presented to
              </p>
              <h2
                className={`${scriptFont.className} mt-2 break-words text-5xl leading-tight text-[#0a1f4d] sm:text-6xl`}
              >
                {recipientName}
              </h2>

              <OrnamentDivider className="mt-3" />

              <p className="mt-3 text-sm font-bold text-[#0a1f4d]">
                {schoolLine}: <span className="text-[#1d4ed8]">{schoolName}</span>
              </p>
              {recipientMeta && (
                <p className="mt-1 text-xs font-medium text-[#526071]">{recipientMeta}</p>
              )}

              {/* statement */}
              <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-[#344054]">
                {isParticipantCertificate ? (
                  <>
                    for active participation in{" "}
                    <span className="font-bold text-[#1d4ed8]">‘{eventTitle}’</span> in
                    recognition of dedication and engagement throughout the event.
                  </>
                ) : (
                  <>
                    for earning the{" "}
                    <span className="font-bold text-[#0a1f4d]">{placementUpper}</span>{" "}
                    position in{" "}
                    <span className="font-bold text-[#1d4ed8]">‘{eventTitle}’</span> in
                    recognition of outstanding performance and active participation.
                  </>
                )}
              </p>

              {isTeamCertificate && (
                <p className="mx-auto mt-2 max-w-md text-xs text-[#526071]">
                  Recorded for the team{" "}
                  <span className="font-semibold text-[#0a1f4d]">{teamLabel}</span>.
                </p>
              )}
            </div>

            {/* stat row */}
            <div className="flex w-full flex-col items-center gap-5">
              <div className="grid w-full max-w-xl grid-cols-2 gap-5 sm:grid-cols-4">
                <StatItem
                  icon={CalendarDays}
                  label="Event Date"
                  value={<AppDate value={achievement.event?.date} />}
                />
                <StatItem
                  icon={Award}
                  label="Position"
                  value={isParticipantCertificate ? "Participant" : placementTitle}
                />
                <StatItem
                  icon={CalendarCheck2}
                  label="Issued On"
                  value={
                    achievement.certificateIssuedAt ? (
                      <AppDate value={achievement.certificateIssuedAt} />
                    ) : (
                      "Preview"
                    )
                  }
                />
                <StatItem
                  icon={ShieldCheck}
                  label="Certificate Code"
                  value={achievement.certificateCode || "Pending"}
                />
              </div>

              <OrnamentDivider />

              {/* footer bar */}
              <div className="grid w-full max-w-xl grid-cols-2 gap-x-6 gap-y-3 border-t border-[#dbe4f3] pt-4 text-center sm:grid-cols-4">
                {footerItems.map(([label, value]) => (
                  <div key={label}>
                    <p className="text-[9px] font-black uppercase tracking-wide text-[#526071]">
                      {label}
                    </p>
                    <p className="mt-1 truncate text-[11px] font-bold text-[#1d4ed8]">
                      {value || "—"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

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
