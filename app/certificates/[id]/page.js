import Link from "next/link";
import { notFound } from "next/navigation";
import { Cinzel, Great_Vibes, EB_Garamond } from "next/font/google";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/db";
import Achievement from "@/models/Achievement";
import SchoolShowcaseProfile from "@/models/SchoolShowcaseProfile";
import { isActiveCertificateRecord } from "@/lib/certificates";
import { formatPlacementLabel } from "@/lib/results";
import { normalizeImageUrl } from "@/lib/imageUrls";
import Image from "next/image";
import QRCode from "qrcode";
import pravyoLogo from "@/logo/pravyo logo by name.png";
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
const bodySerif = EB_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

/* ---------- palette ---------- */
const NAVY = "#0a1f4d";
const GOLD = "#c9a227";

// Printed copies carry no signature; the code + this URL prove authenticity.
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://pratyo.infobytesnepal.com";
const VERIFY_HOST = SITE_URL.replace(/^https?:\/\//, "");

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

// Shared gradients, defined once per document (one certificate per page/iframe).
function GoldDefs() {
  return (
    <svg width="0" height="0" aria-hidden="true" className="absolute">
      <defs>
        <linearGradient id="certGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f6e6a4" />
          <stop offset="0.45" stopColor={GOLD} />
          <stop offset="1" stopColor="#8a6a12" />
        </linearGradient>
      </defs>
    </svg>
  );
}

const FLOURISH_TRANSFORMS = {
  "top-left": "",
  "top-right": "scaleX(-1)",
  "bottom-left": "scaleY(-1)",
  "bottom-right": "scale(-1, -1)",
};

const FLOURISH_POSITIONS = {
  "top-left": "top-0 left-0",
  "top-right": "top-0 right-0",
  "bottom-left": "bottom-0 left-0",
  "bottom-right": "bottom-0 right-0",
};

function CornerFlourish({ position }) {
  return (
    <svg
      viewBox="0 0 120 120"
      aria-hidden="true"
      className={`pointer-events-none absolute z-[2] h-24 w-24 print:h-20 print:w-20 ${FLOURISH_POSITIONS[position]}`}
      style={{ transform: FLOURISH_TRANSFORMS[position] }}
    >
      <g
        fill="none"
        stroke="url(#certGold)"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <path d="M18 96 C18 48 48 18 96 18" />
        <path d="M26 96 C26 55 55 26 96 26" opacity="0.75" />
        <path d="M26 26 C44 28 60 36 70 50" opacity="0.9" />
        <path d="M26 26 C28 44 36 60 50 70" opacity="0.9" />
        <path d="M34 34 C40 34 46 38 48 46" opacity="0.7" />
      </g>
      <circle cx="26" cy="26" r="3.4" fill="url(#certGold)" />
      <circle cx="70" cy="50" r="2.4" fill="url(#certGold)" />
      <circle cx="50" cy="70" r="2.4" fill="url(#certGold)" />
    </svg>
  );
}

function GoldDivider({ className = "" }) {
  return (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      <span
        className="h-px w-16 sm:w-24"
        style={{ background: `linear-gradient(to right, transparent, ${GOLD})` }}
      />
      <span
        aria-hidden="true"
        className="inline-block h-2 w-2 rotate-45"
        style={{ background: GOLD }}
      />
      <span
        className="h-px w-16 sm:w-24"
        style={{ background: `linear-gradient(to left, transparent, ${GOLD})` }}
      />
    </div>
  );
}

// Faint concentric guilloché watermark behind the content.
function GuillocheWatermark() {
  return (
    <svg
      viewBox="0 0 200 200"
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 m-auto h-[62%] w-[62%] opacity-[0.05]"
    >
      <g fill="none" stroke={NAVY} strokeWidth="0.7">
        {[70, 60, 50, 40, 30].map((r) => (
          <circle key={r} cx="100" cy="100" r={r} />
        ))}
        {Array.from({ length: 36 }, (_, i) => {
          const a = (i / 36) * Math.PI * 2;
          return (
            <line
              key={i}
              x1={100 + 30 * Math.cos(a)}
              y1={100 + 30 * Math.sin(a)}
              x2={100 + 70 * Math.cos(a)}
              y2={100 + 70 * Math.sin(a)}
            />
          );
        })}
      </g>
    </svg>
  );
}

// Beaded gold ring positions for the seal.
const SEAL_BEADS = Array.from({ length: 30 }, (_, i) => {
  const a = (i / 30) * Math.PI * 2;
  return {
    x: Number((60 + 45 * Math.cos(a)).toFixed(1)),
    y: Number((52 + 45 * Math.sin(a)).toFixed(1)),
  };
});

// Gold award seal with navy center, star and ribbon tails.
function SealMedallion({ caption = "PRAVYO" }) {
  return (
    <svg
      viewBox="0 0 120 148"
      aria-hidden="true"
      className="h-32 w-24 print:h-28 print:w-20"
    >
      {/* ribbon tails */}
      <path d="M46 92 L38 138 L54 124 L60 136 L60 96 Z" fill="#12307a" />
      <path d="M74 92 L82 138 L66 124 L60 136 L60 96 Z" fill={NAVY} />
      {/* beaded ring */}
      {SEAL_BEADS.map((b, i) => (
        <circle key={i} cx={b.x} cy={b.y} r="2.1" fill="url(#certGold)" />
      ))}
      {/* medallion body */}
      <circle cx="60" cy="52" r="40" fill="url(#certGold)" />
      <circle cx="60" cy="52" r="33" fill={NAVY} />
      <circle
        cx="60"
        cy="52"
        r="33"
        fill="none"
        stroke="url(#certGold)"
        strokeWidth="1.4"
      />
      {/* star */}
      <path
        d="M60 33 l3.6 7.3 8 1.2 -5.8 5.6 1.4 8 -7.2 -3.8 -7.2 3.8 1.4 -8 -5.8 -5.6 8 -1.2 Z"
        fill="url(#certGold)"
      />
      <text
        x="60"
        y="66"
        textAnchor="middle"
        fontSize="9"
        letterSpacing="1.5"
        fontWeight="700"
        fill="#f6e6a4"
        fontFamily="serif"
      >
        {caption}
      </text>
      <text
        x="60"
        y="76"
        textAnchor="middle"
        fontSize="5.5"
        letterSpacing="2"
        fill="#e8c766"
        fontFamily="serif"
      >
        VERIFIED
      </text>
    </svg>
  );
}

function LaurelBranch({ flip = false }) {
  return (
    <svg
      viewBox="0 0 44 84"
      aria-hidden="true"
      className="h-11 w-6"
      style={flip ? { transform: "scaleX(-1)" } : undefined}
    >
      <g fill="url(#certGold)">
        <path
          d="M30 82 C14 60 16 30 26 6"
          fill="none"
          stroke="url(#certGold)"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        {[
          { x: 27, y: 16, r: -35 },
          { x: 22, y: 30, r: -30 },
          { x: 19, y: 44, r: -22 },
          { x: 18, y: 58, r: -14 },
          { x: 20, y: 70, r: -6 },
        ].map((leaf, i) => (
          <ellipse
            key={i}
            cx={leaf.x}
            cy={leaf.y}
            rx="7"
            ry="3.2"
            transform={`rotate(${leaf.r} ${leaf.x} ${leaf.y})`}
          />
        ))}
      </g>
    </svg>
  );
}

function CertificateLogoMark({ imageUrl, label, fallbackText }) {
  const image = normalizeImageUrl(imageUrl);

  return (
    <div className="flex items-center gap-3">
      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border-2 border-[#c9a227]/60 bg-white shadow-sm print:h-11 print:w-11">
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

function MetaItem({ label, value }) {
  return (
    <div className="text-center">
      <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#8a6a12]">
        {label}
      </p>
      <p className="mt-1 truncate text-xs font-semibold text-[#0a1f4d]">
        {value || "—"}
      </p>
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
  // Rendered directly (not via PravyoLogo) so the certificate controls the
  // exact size and matches the school badge next to it.
  const pravyoMark = (
    <div key="pravyo" className="flex items-center gap-3">
      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border-2 border-[#c9a227]/60 bg-white shadow-sm print:h-11 print:w-11">
        <Image
          src={pravyoLogo}
          alt="Pravyo"
          width={48}
          height={48}
          className="h-full w-full object-contain p-1.5"
        />
      </div>
      <p className="text-left text-sm font-black uppercase tracking-wide text-[#0a1f4d] print:text-xs">
        Pravyo
      </p>
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

  const badgeLabel = isParticipantCertificate ? "Participant" : placementTitle;

  // QR straight to the verify page — a printed copy stays self-verifying.
  let verifyQrSvg = "";
  if (achievement.certificateCode) {
    verifyQrSvg = await QRCode.toString(
      `${SITE_URL}/verify?code=${encodeURIComponent(achievement.certificateCode)}`,
      {
        type: "svg",
        margin: 0,
        errorCorrectionLevel: "M",
        color: { dark: NAVY, light: "#0000" },
      }
    );
  }

  const footerItems = isPlatformEvent
    ? [
        ["Platform Event", eventTitle],
        ["Associated School", schoolName],
        ["Managed by", "Pravyo"],
      ]
    : [
        ["School Event", schoolName],
        ["Managed by", "Pravyo"],
      ];

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
            className="text-sm font-bold text-[#0a1f4d]/70 transition hover:text-[#0a1f4d]"
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
            {achievement.certificateCode && (
              <Link
                href={`/verify?code=${encodeURIComponent(achievement.certificateCode)}`}
                className="rounded-lg border border-[#0a1f4d]/25 bg-white px-4 py-2 text-sm font-bold text-[#0a1f4d] transition hover:border-[#c9a227] hover:bg-[#fbf7ea]"
              >
                Verify
              </Link>
            )}
            {eventHref && (
              <Link
                href={eventHref}
                className="rounded-lg bg-[#c9a227] px-4 py-2 text-sm font-bold text-[#0a1f4d] shadow-sm transition hover:bg-[#b8901f]"
              >
                View public event
              </Link>
            )}
          </div>
        </div>
        )}

        {/* certificate sheet */}
        <section className="certificate-sheet relative mx-auto aspect-[1/1.414] w-full overflow-hidden rounded-[1rem] border-[3px] border-[#0a1f4d] bg-[#fffdf7] shadow-[0_24px_72px_rgba(10,31,77,0.22)] print:aspect-auto print:rounded-none print:shadow-none">
          <GoldDefs />

          {/* inset gold hairline frame */}
          <span className="pointer-events-none absolute inset-[10px] z-[1] rounded-[0.55rem] border border-[#c9a227]/70 print:inset-[8px]" />

          {/* corner flourishes */}
          <div className="pointer-events-none absolute inset-[10px] z-[2] print:inset-[8px]">
            <CornerFlourish position="top-left" />
            <CornerFlourish position="top-right" />
            <CornerFlourish position="bottom-left" />
            <CornerFlourish position="bottom-right" />
          </div>

          {/* inner frame */}
          <div className="certificate-frame relative z-10 flex h-full flex-col items-center justify-between px-8 py-9 text-center sm:px-14 print:px-12 print:py-10">
            <GuillocheWatermark />

            {/* header */}
            <div className="relative z-10 flex w-full flex-col items-center gap-4">
              <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
                {headerLogos[0]}
                <span className="h-9 w-px bg-[#e2d5a6]" />
                {headerLogos[1]}
              </div>

              <div className="mt-2">
                <h1
                  className={`${displaySerif.className} text-[2rem] font-bold tracking-[0.16em] text-[#0a1f4d] sm:text-[2.6rem]`}
                >
                  CERTIFICATE
                </h1>
                <div className="mt-1.5 flex items-center justify-center gap-3">
                  <span className="h-px w-10" style={{ background: GOLD }} />
                  <p
                    className={`${displaySerif.className} text-sm font-semibold tracking-[0.32em] text-[#8a6a12]`}
                  >
                    OF ACHIEVEMENT
                  </p>
                  <span className="h-px w-10" style={{ background: GOLD }} />
                </div>
              </div>
            </div>

            {/* recipient */}
            <div className="relative z-10 flex w-full flex-col items-center">
              <p className={`${bodySerif.className} text-base italic text-[#526071]`}>
                This certificate is proudly presented to
              </p>
              <h2
                className={`${scriptFont.className} mt-2 break-words text-6xl leading-tight text-[#0a1f4d] sm:text-7xl`}
              >
                {recipientName}
              </h2>

              <GoldDivider className="mt-3" />

              {/* placement / participation ribbon */}
              <div className="mt-4 flex items-center justify-center gap-2">
                <LaurelBranch />
                <span
                  className={`${displaySerif.className} px-6 py-1.5 text-sm font-bold uppercase tracking-[0.18em] text-[#0a1f4d]`}
                  style={{
                    background: "linear-gradient(135deg, #f6e6a4, #c9a227 55%, #a9841c)",
                    clipPath:
                      "polygon(0 0, 100% 0, calc(100% - 12px) 50%, 100% 100%, 0 100%, 12px 50%)",
                  }}
                >
                  {badgeLabel}
                </span>
                <LaurelBranch flip />
              </div>

              <p className="mt-4 text-sm font-bold text-[#0a1f4d]">
                {schoolLine}: <span className="text-[#8a6a12]">{schoolName}</span>
              </p>
              {recipientMeta && (
                <p className="mt-1 text-xs font-medium text-[#526071]">{recipientMeta}</p>
              )}

              {/* statement */}
              <p
                className={`${bodySerif.className} mx-auto mt-4 max-w-md text-[15px] leading-7 text-[#344054]`}
              >
                {isParticipantCertificate ? (
                  <>
                    for active participation in{" "}
                    <span className="font-semibold text-[#8a6a12]">‘{eventTitle}’</span>, in
                    recognition of dedication and engagement throughout the event.
                  </>
                ) : (
                  <>
                    for earning the{" "}
                    <span className="font-semibold text-[#0a1f4d]">{placementUpper}</span>{" "}
                    position in{" "}
                    <span className="font-semibold text-[#8a6a12]">‘{eventTitle}’</span>, in
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

            {/* seal + signatures */}
            <div className="relative z-10 flex w-full flex-col items-center gap-5">
              {/* Digitally issued — no signature lines. The certificate code
                  and the /verify page prove authenticity instead. */}
              <div className="-mb-1 flex w-full justify-center">
                <SealMedallion caption="PRAVYO" />
              </div>

              {/* details row */}
              <div className="grid w-full max-w-xl grid-cols-2 gap-y-3 border-t border-[#e4d6a8] pt-4 sm:grid-cols-4">
                <MetaItem
                  label="Event Date"
                  value={<AppDate value={achievement.event?.date} />}
                />
                <MetaItem
                  label="Position"
                  value={isParticipantCertificate ? "Participant" : placementTitle}
                />
                <MetaItem
                  label="Date of Issue"
                  value={
                    achievement.certificateIssuedAt ? (
                      <AppDate value={achievement.certificateIssuedAt} />
                    ) : (
                      "Preview"
                    )
                  }
                />
                <MetaItem
                  label="Certificate Code"
                  value={achievement.certificateCode || "Pending"}
                />
              </div>

              {/* footer context line */}
              <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[10px] font-semibold uppercase tracking-wide text-[#41506a]">
                {footerItems.map(([label, value], index) => (
                  <span key={label} className="flex items-center gap-2">
                    {index > 0 && (
                      <span
                        aria-hidden="true"
                        className="inline-block h-1 w-1 rotate-45"
                        style={{ background: GOLD }}
                      />
                    )}
                    <span>
                      {label}:{" "}
                      <span className="text-[#0a1f4d]">{value || "—"}</span>
                    </span>
                  </span>
                ))}
              </div>

              {/* authenticity line */}
              <div className="flex items-center justify-center gap-3">
                {verifyQrSvg && (
                  <span
                    aria-hidden="true"
                    className="h-12 w-12 shrink-0 [&>svg]:h-full [&>svg]:w-full"
                    dangerouslySetInnerHTML={{ __html: verifyQrSvg }}
                  />
                )}
                <p className="text-left text-[9px] font-semibold uppercase tracking-[0.14em] text-[#8a6a12]">
                  Verify this certificate at {VERIFY_HOST}/verify
                  {achievement.certificateCode ? (
                    <>
                      <br />
                      Code:{" "}
                      <span className="text-[#0a1f4d]">
                        {achievement.certificateCode}
                      </span>
                    </>
                  ) : null}
                </p>
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
