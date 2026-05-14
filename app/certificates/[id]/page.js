import Link from "next/link";
import { notFound } from "next/navigation";
import connectDB from "@/lib/db";
import Achievement from "@/models/Achievement";
import { formatPlacementLabel } from "@/lib/results";
import PratyoLogo from "@/components/brand/PratyoLogo";
import CertificatePrintActions from "@/components/certificates/CertificatePrintActions";

export const dynamic = "force-dynamic";

async function getCertificate(id) {
  await connectDB();

  return Achievement.findById(id)
    .populate("student", "name grade")
    .populate("captainStudent", "name grade")
    .populate("school", "schoolName")
    .populate("event", "title eventType date visibility participationFormat")
    .lean();
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

  return (
    <main className="min-h-screen bg-stone-100 text-slate-900 px-4 py-10 print:bg-white">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between gap-4 mb-6 print:hidden">
          <Link href="/" className="text-slate-600 hover:text-slate-900">
            Back to platform
          </Link>
          <div className="flex items-center gap-3">
            <CertificatePrintActions autoPrint={autoPrint} />
            {eventHref && (
              <Link
                href={eventHref}
                className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white"
              >
                View public event
              </Link>
            )}
          </div>
        </div>

        <section className="rounded-[2rem] border-[10px] border-amber-300 bg-white shadow-2xl print:shadow-none">
          <div className="rounded-[1.6rem] border border-amber-500/40 px-8 py-12 md:px-14">
            <div className="text-center">
              <p className="text-sm uppercase tracking-[0.45em] text-amber-700">
                Certificate of Recognition
              </p>
              <div className="mt-5 flex justify-center">
                <PratyoLogo
                  variant="wordmark"
                  imageClassName="w-[180px] sm:w-[220px]"
                  className="items-center"
                />
              </div>
              <p className="mt-3 text-xs font-bold uppercase tracking-[0.28em] text-slate-500">
                Certificate Record
              </p>
              <p className="mt-4 text-lg text-slate-600">
                {isPreviewMode
                  ? "Certificate preview for administrator review"
                  : isTeamCertificate
                  ? "Issued digitally through the participating school as a team-result certificate"
                  : "Issued digitally through the participating school"}
              </p>
            </div>

            <div className="mt-12 text-center">
              <p className="text-sm uppercase tracking-[0.25em] text-slate-500">
                {isParticipantCertificate ? "Issued to" : "Awarded to"}
              </p>
              <h2 className="mt-4 text-4xl md:text-5xl font-bold text-slate-900">
                {recipientName}
              </h2>
              <p className="mt-3 text-lg text-slate-600">
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
                <p className="mt-3 text-sm text-slate-500">
                  Team recognition recorded for{" "}
                  <span className="font-semibold text-slate-700">{teamLabel}</span>
                  {achievement.captainStudent?.name
                    ? ` under captain ${achievement.captainStudent.name}.`
                    : "."}
                </p>
              )}
            </div>

            <div className="mt-10 rounded-[1.5rem] bg-slate-50 px-6 py-8 text-center">
              <p className="text-lg text-slate-700 leading-8">
                This certificate confirms that{" "}
                <span className="font-semibold text-slate-900">
                  {recipientName || "the participant"}
                </span>{" "}
                {isParticipantCertificate ? (
                  <>
                    participated in{" "}
                    <span className="font-semibold text-slate-900">
                      {achievement.event?.title || achievement.title}
                    </span>
                  </>
                ) : (
                  <>
                    {isTeamCertificate ? "earned" : "earned"}{" "}
                    <span className="font-semibold text-amber-700">
                      {placementLabel}
                    </span>{" "}
                    in{" "}
                    <span className="font-semibold text-slate-900">
                      {achievement.event?.title || achievement.title}
                    </span>
                  </>
                )}
                .
              </p>
              <p className="mt-4 text-sm text-slate-500 max-w-3xl mx-auto">
                This digital certificate is issued to{" "}
                <span className="font-semibold text-slate-700">
                  {achievement.school?.schoolName || "the school"}
                </span>{" "}
                {isTeamCertificate
                  ? "for official sharing as the recognized team outcome record."
                  : "for official sharing with the student or parent."}
              </p>
              {achievement.description && (
                <p className="mt-4 text-sm text-slate-500 max-w-3xl mx-auto">
                  {achievement.description}
                </p>
              )}
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  {isTeamCertificate ? "Team Name" : "Event Date"}
                </p>
                <p className="mt-2 font-semibold">
                  {isTeamCertificate
                    ? teamLabel
                    : achievement.event?.date
                    ? new Date(achievement.event.date).toLocaleDateString()
                    : "Not available"}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Certificate Code
                </p>
                <p className="mt-2 font-semibold">
                  {achievement.certificateCode || "Pending"}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  {isTeamCertificate ? "Event Date" : "Issued On"}
                </p>
                <p className="mt-2 font-semibold">
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
              <div className="mt-8 rounded-2xl border border-[#d6e6fb] bg-[#f7fbff] px-6 py-5">
                <p className="text-sm uppercase tracking-[0.2em] text-[#33598f]">
                  Team Certificate Context
                </p>
                <p className="mt-2 text-sm leading-7 text-slate-600">
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
              <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-5">
                <p className="text-sm uppercase tracking-[0.2em] text-emerald-700">
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

            <div className="mt-12 flex flex-col md:flex-row md:items-end md:justify-between gap-8">
              <div>
                <p className="text-sm uppercase tracking-[0.25em] text-slate-500">
                  Verified by
                </p>
                <p className="mt-2 text-xl font-bold text-slate-900">
                  Pratyo Platform
                </p>
                <p className="text-sm text-slate-500 mt-1">
                  Multi-school talent, activity, and competition record
                </p>
              </div>

              <div className="text-sm text-slate-500">
                Reference link: /certificates/{achievement._id.toString()}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
