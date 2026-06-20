import Link from "next/link";
import connectDB from "@/lib/db";
import Achievement from "@/models/Achievement";
import { getActiveCertificateFilter } from "@/lib/certificates";
import { formatPlacementLabel } from "@/lib/results";
import PublicSiteNav from "@/components/public/PublicSiteNav";
import {
  FaArrowRight,
  FaCheckCircle,
  FaShieldAlt,
  FaTimesCircle,
} from "react-icons/fa";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Verify a Certificate",
  description:
    "Confirm the authenticity of a Pravyo certificate using its certificate code.",
};

function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

async function verifyCode(rawCode) {
  const code = String(rawCode || "").trim().toUpperCase();
  if (!code) return { state: "EMPTY" };

  await connectDB();

  const achievement = await Achievement.findOne({
    certificateCode: code,
    ...getActiveCertificateFilter(),
  })
    .select(
      "certificateCode certificateUrl certificateIssuedAt placement title recipientType teamName certificateRecipientName"
    )
    .populate("student", "name grade")
    .populate("school", "schoolName")
    .populate("event", "title date resultsPublished")
    .lean();

  if (!achievement || !achievement.event?.resultsPublished) {
    return { state: "INVALID", code };
  }

  const recipient =
    achievement.certificateRecipientName ||
    achievement.teamName ||
    achievement.student?.name ||
    "Recipient";

  return {
    state: "VALID",
    code,
    certificate: {
      recipient,
      placement: formatPlacementLabel(achievement.placement),
      isTeam: String(achievement.recipientType || "STUDENT").toUpperCase() === "TEAM",
      event: achievement.event?.title || achievement.title || "Event",
      school: achievement.school?.schoolName || "School",
      issuedAt: achievement.certificateIssuedAt,
      certificateUrl: achievement.certificateUrl || "",
    },
  };
}

function Field({ label, value }) {
  return (
    <div className="rounded-lg border border-[#e6eaf7] bg-[#f8fbff] p-3">
      <p className="text-[10px] font-black uppercase tracking-wide text-[#526071]">
        {label}
      </p>
      <p className="mt-1 text-sm font-bold text-[#10142f]">{value || "—"}</p>
    </div>
  );
}

export default async function VerifyCertificatePage({ searchParams }) {
  const resolved = await searchParams;
  const code = resolved?.code || "";
  const result = await verifyCode(code);

  return (
    <main className="min-h-screen bg-[#f8f9fd] pb-24 text-[#17120a]">
      <PublicSiteNav active="home" />

      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <div className="text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eef3ff] text-2xl text-[#1d4ed8]">
            <FaShieldAlt />
          </span>
          <h1 className="mt-4 text-3xl font-black text-[#10142f]">
            Verify a Certificate
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#526071]">
            Enter the certificate code (for example{" "}
            <span className="font-bold text-[#10142f]">EGT-2026-BE3C57</span>) printed
            on the certificate to confirm it was issued and verified by Pravyo.
          </p>
        </div>

        {/* GET form — no client JS required */}
        <form action="/verify" method="get" className="mt-6 flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            name="code"
            defaultValue={code}
            placeholder="Enter certificate code"
            autoComplete="off"
            className="min-h-12 flex-1 rounded-xl border border-[#dbe5f4] bg-white px-4 text-sm font-bold uppercase tracking-wide text-[#10142f] placeholder:font-semibold placeholder:normal-case placeholder:tracking-normal placeholder:text-[#94a3b8] focus:border-[#1d4ed8] focus:outline-none focus:ring-4 focus:ring-[#1d4ed8]/10"
          />
          <button
            type="submit"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#1d4ed8] px-6 text-sm font-black text-white transition hover:bg-[#163fb0]"
          >
            Verify
          </button>
        </form>

        {result.state === "VALID" && (
          <section className="mt-6 overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-emerald-100 bg-emerald-50 px-5 py-4">
              <FaCheckCircle className="text-xl text-emerald-600" />
              <div>
                <p className="text-sm font-black text-emerald-800">
                  Verified certificate
                </p>
                <p className="text-xs font-semibold text-emerald-700">
                  Code {result.code} is authentic and was issued by Pravyo.
                </p>
              </div>
            </div>
            <div className="grid gap-3 p-5 sm:grid-cols-2">
              <Field
                label={result.certificate.isTeam ? "Team" : "Recipient"}
                value={result.certificate.recipient}
              />
              <Field label="Position" value={result.certificate.placement} />
              <Field label="Event" value={result.certificate.event} />
              <Field label="School" value={result.certificate.school} />
              <Field label="Issued On" value={formatDate(result.certificate.issuedAt)} />
              <Field label="Certificate Code" value={result.code} />
            </div>
            {result.certificate.certificateUrl && (
              <div className="border-t border-[#e6eaf7] px-5 py-4">
                <Link
                  href={result.certificate.certificateUrl}
                  className="inline-flex items-center gap-2 text-sm font-black text-[#1d4ed8]"
                >
                  View the certificate
                  <FaArrowRight />
                </Link>
              </div>
            )}
          </section>
        )}

        {result.state === "INVALID" && (
          <section className="mt-6 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-5">
            <FaTimesCircle className="mt-0.5 text-xl text-rose-600" />
            <div>
              <p className="text-sm font-black text-rose-800">
                No verified certificate found
              </p>
              <p className="mt-1 text-sm leading-6 text-rose-700">
                We couldn&apos;t find an issued certificate for code{" "}
                <span className="font-bold">{result.code}</span>. Check the code and
                try again — it may be mistyped, or the results may not be published
                yet.
              </p>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
