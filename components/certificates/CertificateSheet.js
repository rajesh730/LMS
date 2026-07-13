import { Cinzel, Great_Vibes, EB_Garamond } from "next/font/google";
import Image from "next/image";
import QRCode from "qrcode";
import { formatPlacementLabel } from "@/lib/results";
import { normalizeImageUrl } from "@/lib/imageUrls";
import pravyoLogo from "@/logo/pravyo logo by name.png";
import AppDate from "@/components/common/AppDate";

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

/* ---------- palette (brand tokens: logo navy, brand amber, swoosh blue) ---------- */
const NAVY = "#16345f"; // logo "P" navy — wave bands, headings
const INK = "#10142f"; // deep ink navy — body emphasis
const GOLD = "#f7b731"; // brand amber
const PAPER = "#fbf5e8"; // warm ivory sheet

// Printed copies carry no signature; the code + this URL prove authenticity.
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://pratyo.infobytesnepal.com";
const VERIFY_HOST = SITE_URL.replace(/^https?:\/\//, "");

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

export function resolveEventOwnership(event) {
  if (event?.eventOwnershipType) return event.eventOwnershipType;
  return event?.eventScope === "SCHOOL" ? "SCHOOL_EVENT" : "PLATFORM_EVENT";
}

/* ---------- decorative pieces ---------- */

// Shared gradients. When several sheets render on one page (bulk export) the
// duplicate defs are identical, so every url(#certGold) resolves the same.
function GoldDefs() {
  return (
    <svg width="0" height="0" aria-hidden="true" className="absolute">
      <defs>
        <linearGradient id="certGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffe3a1" />
          <stop offset="0.45" stopColor={GOLD} />
          <stop offset="1" stopColor="#9c6b0a" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// Top-left diagonal wave: navy fills only the top-left, its boundary rising
// from the left edge and exiting through the TOP edge ~65% across, gold
// ribbon riding the curve. Top-center/right stays cream (reference layout).
function TopWave() {
  return (
    <svg
      viewBox="0 0 600 280"
      preserveAspectRatio="none"
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[33%] w-full"
    >
      {/* navy corner sweep */}
      <path
        d="M0 0 H380 C350 12 300 24 220 38 C140 52 60 58 0 60 Z"
        fill={NAVY}
      />
      {/* lighter inner sweep for depth */}
      <path
        d="M0 0 H300 C260 14 190 26 120 34 C75 39 35 42 0 44 Z"
        fill="#1f4e79"
        opacity="0.5"
      />
      {/* fine texture inside the navy */}
      <path
        d="M0 30 C70 28 160 20 250 6 C280 2 310 -4 330 -10"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1"
        opacity="0.09"
      />
      {/* thick gold ribbon hugging the boundary, exiting the top edge */}
      <path
        d="M0 62 C60 60 142 54 222 40 C302 26 352 13 384 -6"
        fill="none"
        stroke="url(#certGold)"
        strokeWidth="13"
      />
      {/* thin echo line on the paper side */}
      <path
        d="M0 78 C62 76 146 69 226 55 C306 41 356 26 392 4"
        fill="none"
        stroke="url(#certGold)"
        strokeWidth="2.4"
        opacity="0.75"
      />
    </svg>
  );
}

// Narrow navy sweep hugging the full right edge, top corner to bottom band,
// with a thin gold line along its inner edge on the lower half.
function RightSweep() {
  return (
    <svg
      viewBox="0 0 60 848"
      preserveAspectRatio="none"
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 right-0 z-0 h-full w-[9%]"
    >
      <path
        d="M60 0 V848 H16 C26 700 24 560 28 420 C32 290 26 140 8 0 Z"
        fill={NAVY}
      />
      <path
        d="M60 0 V848 H34 C40 700 38 560 41 420 C44 290 40 140 28 0 Z"
        fill="#1f4e79"
        opacity="0.45"
      />
      <path
        d="M28 380 C25 520 27 660 19 820"
        fill="none"
        stroke="url(#certGold)"
        strokeWidth="2.4"
        opacity="0.7"
      />
    </svg>
  );
}

// Bottom band: gold arc entering the left edge high, sweeping into a navy
// band whose boundary runs ~88% down the sheet, solid navy underneath for
// the verify strip, swelling toward the bottom-right corner.
function BottomWave() {
  return (
    <svg
      viewBox="0 0 600 280"
      preserveAspectRatio="none"
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[33%] w-full"
    >
      {/* navy band — steep rise only in the outer ~10%, flat ~88% across the middle */}
      <path
        d="M0 110 C30 150 70 172 140 180 C260 190 420 188 520 176 C560 170 585 162 600 152 L600 280 L0 280 Z"
        fill={NAVY}
      />
      {/* lighter inner sweep */}
      <path
        d="M0 180 C60 200 140 212 260 218 C390 222 500 212 600 194 L600 280 L0 280 Z"
        fill="#1f4e79"
        opacity="0.5"
      />
      {/* fine texture inside the navy */}
      <path
        d="M30 240 C160 250 320 252 460 242 C520 236 570 226 600 216"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1"
        opacity="0.08"
      />
      {/* thick gold ribbon hugging the boundary */}
      <path
        d="M0 108 C30 148 70 170 140 178 C260 188 420 186 520 174 C560 168 585 160 600 150"
        fill="none"
        stroke="url(#certGold)"
        strokeWidth="13"
      />
      {/* thin echo arc hugging the left edge, like the reference */}
      <path
        d="M0 66 C10 100 22 132 60 152 C90 164 130 172 170 176"
        fill="none"
        stroke="url(#certGold)"
        strokeWidth="2.4"
        opacity="0.8"
      />
      {/* second thin line under the ribbon on the right half */}
      <path
        d="M340 206 C440 210 530 200 600 182"
        fill="none"
        stroke="url(#certGold)"
        strokeWidth="2"
        opacity="0.6"
      />
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
      className="pointer-events-none absolute inset-0 z-0 m-auto h-[62%] w-[62%] opacity-[0.035]"
    >
      <g fill="none" stroke={INK} strokeWidth="0.7">
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
      <path d="M46 92 L38 138 L54 124 L60 136 L60 96 Z" fill="#2f7fdb" />
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
        fill="#ffe3a1"
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
        fill="#fbd27a"
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
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[#f7b731]/60 bg-white shadow-sm print:h-11 print:w-11">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={label} className="h-full w-full object-contain p-1.5" />
        ) : (
          <span className="text-sm font-black text-[#10142f]">
            {getInitials(fallbackText || label)}
          </span>
        )}
      </div>
      <div className="text-left leading-tight">
        <p className="max-w-[11rem] text-sm font-black uppercase tracking-wide text-[#10142f] print:text-xs">
          {label}
        </p>
      </div>
    </div>
  );
}

function MetaItem({ label, value }) {
  return (
    <div className="px-2 text-center">
      <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[#16345f]">
        {label}
      </p>
      <p className="mt-1 truncate text-xs font-semibold text-[#10142f]">
        {value || "—"}
      </p>
    </div>
  );
}

/* ---------- the certificate sheet ---------- */

// Server component: renders one complete A4 certificate. `achievement` must be
// populated (student, captainStudent, school, event) with `schoolProfile`
// attached, exactly like app/certificates/[id]/page.js prepares it.
export default async function CertificateSheet({ achievement }) {
  const ownershipType = resolveEventOwnership(achievement.event);
  const isPlatformEvent = ownershipType === "PLATFORM_EVENT";

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
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[#f7b731]/60 bg-white shadow-sm print:h-11 print:w-11">
        <Image
          src={pravyoLogo}
          alt="Pravyo"
          width={48}
          height={48}
          className="h-full w-full object-contain p-1.5"
        />
      </div>
      <p className="text-left text-sm font-black uppercase tracking-wide text-[#10142f] print:text-xs">
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

  const badgeLabel = isParticipantCertificate ? "Participant" : placementUpper;

  // QR straight to the verify page — a printed copy stays self-verifying.
  let verifyQrSvg = "";
  if (achievement.certificateCode) {
    verifyQrSvg = await QRCode.toString(
      `${SITE_URL}/verify?code=${encodeURIComponent(achievement.certificateCode)}`,
      {
        type: "svg",
        margin: 0,
        errorCorrectionLevel: "M",
        color: { dark: INK, light: "#0000" },
      }
    );
  }

  return (
    <section
      className="certificate-sheet relative mx-auto aspect-[1/1.414] w-full overflow-hidden rounded-[1rem] border-[3px] border-[#10142f] shadow-[0_24px_72px_rgba(10,31,77,0.22)] print:aspect-auto print:rounded-none print:shadow-none"
      style={{ backgroundColor: PAPER }}
    >
      <GoldDefs />

      {/* navy + gold wave frame */}
      <TopWave />
      <RightSweep />
      <BottomWave />

      <GuillocheWatermark />

      {/* content column, kept clear of the wave bands */}
      <div className="certificate-frame relative z-10 flex h-full flex-col items-center justify-between px-[8%] pb-[21.5%] pt-[13.5%] text-center">
        {/* header */}
        <div className="relative z-10 flex w-full flex-col items-center gap-4">
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            {headerLogos[0]}
            <span className="h-9 w-px bg-[#d9c58a]" />
            {headerLogos[1]}
          </div>

          <div className="mt-1">
            <h1
              className={`${displaySerif.className} text-[2.5rem] font-bold tracking-[0.16em] text-[#16345f] sm:text-[3.6rem]`}
            >
              CERTIFICATE
            </h1>
            <div className="mt-1.5 flex items-center justify-center gap-3">
              <span className="h-px w-16 sm:w-20" style={{ background: GOLD }} />
              <p
                className={`${displaySerif.className} text-sm font-semibold tracking-[0.32em] text-[#16345f]`}
              >
                OF ACHIEVEMENT
              </p>
              <span className="h-px w-16 sm:w-20" style={{ background: GOLD }} />
            </div>
          </div>
        </div>

        {/* recipient */}
        <div className="relative z-10 flex w-full flex-col items-center">
          <p className={`${bodySerif.className} text-base italic text-[#7a6434]`}>
            This certificate is proudly presented to
          </p>
          <h2
            className={`${scriptFont.className} mt-2 break-words text-6xl leading-tight text-[#10142f] sm:text-8xl`}
          >
            {recipientName}
          </h2>

          <GoldDivider className="mt-3" />

          {/* placement / participation ribbon */}
          <div className="mt-4 flex items-center justify-center gap-2">
            <LaurelBranch />
            <span
              className={`${displaySerif.className} px-6 py-1.5 text-sm font-bold uppercase tracking-[0.18em] text-[#10142f] shadow-sm`}
              style={{
                background: "linear-gradient(135deg, #ffe3a1, #f7b731 55%, #c67c11)",
                clipPath:
                  "polygon(0 0, 100% 0, calc(100% - 12px) 50%, 100% 100%, 0 100%, 12px 50%)",
              }}
            >
              {badgeLabel}
            </span>
            <LaurelBranch flip />
          </div>

          <p className="mt-4 text-sm font-bold text-[#10142f]">
            {schoolLine}: <span className="text-[#9c6b0a]">{schoolName}</span>
          </p>
          {recipientMeta && (
            <p className="mt-1 text-xs font-medium text-[#526071]">{recipientMeta}</p>
          )}

          {/* statement */}
          <p
            className={`${bodySerif.className} mx-auto mt-4 max-w-lg text-[15px] leading-7 text-[#344054]`}
          >
            {isParticipantCertificate ? (
              <>
                for active participation in{" "}
                <span className="font-semibold text-[#9c6b0a]">‘{eventTitle}’</span>, in
                recognition of dedication and engagement throughout the event.
              </>
            ) : (
              <>
                for earning the{" "}
                <span className="font-semibold text-[#10142f]">{placementTitle}</span>{" "}
                position in{" "}
                <span className="font-semibold text-[#9c6b0a]">‘{eventTitle}’</span>, in
                recognition of outstanding performance and active participation.
              </>
            )}
          </p>

          {isTeamCertificate && (
            <p className="mx-auto mt-2 max-w-md text-xs text-[#526071]">
              Recorded for the team{" "}
              <span className="font-semibold text-[#10142f]">{teamLabel}</span>.
            </p>
          )}
        </div>

        {/* seal + meta row */}
        <div className="relative z-10 flex w-full flex-col items-center gap-4">
          {/* Digitally issued — no signature lines. The certificate code
              and the /verify page prove authenticity instead. */}
          <div className="-mb-1 flex w-full justify-center">
            <SealMedallion caption="PRAVYO" />
          </div>

          {/* details row */}
          <div className="grid w-full max-w-xl grid-cols-2 gap-y-3 border-t border-[#e3cf96] pt-4 sm:grid-cols-4 sm:divide-x sm:divide-[#e3cf96]">
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
        </div>
      </div>

      {/* verify strip — sits on the solid navy bottom band */}
      <div className="absolute inset-x-0 bottom-0 z-10 flex h-[10%] items-center justify-start gap-3 pl-[11%] pr-[12%]">
        {verifyQrSvg && (
          <span
            aria-hidden="true"
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-white p-1.5 shadow-sm [&>svg]:h-full [&>svg]:w-full"
            dangerouslySetInnerHTML={{ __html: verifyQrSvg }}
          />
        )}
        <div className="text-left text-[10px] font-bold uppercase tracking-[0.14em]">
          <p className="!text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.35)]">
            Verify this certificate at {VERIFY_HOST}/verify
          </p>
          {achievement.certificateCode ? (
            <p className="mt-1 !text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.35)]">
              <span className="!text-[#f7b731]">Code:</span>{" "}
              {achievement.certificateCode}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
