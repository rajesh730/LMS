import Link from "next/link";
import { notFound } from "next/navigation";
import connectDB from "@/lib/db";
import Achievement from "@/models/Achievement";
import { formatPlacementLabel } from "@/lib/results";

export const dynamic = "force-dynamic";

async function getCertificate(id) {
  await connectDB();

  return Achievement.findById(id)
    .populate("student", "name grade")
    .populate("school", "schoolName")
    .populate("event", "title eventType date visibility")
    .lean();
}

export default async function CertificatePage({ params }) {
  const resolvedParams = await params;
  const achievement = await getCertificate(resolvedParams.id);

  if (!achievement || !achievement.certificateIssuedAt) {
    notFound();
  }

  const eventHref =
    achievement.event?._id && achievement.event?.visibility === "PUBLIC"
      ? `/events/${achievement.event._id}`
      : null;

  return (
    <main className="min-h-screen bg-stone-100 text-slate-900 px-4 py-10 print:bg-white">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between gap-4 mb-6 print:hidden">
          <Link href="/" className="text-slate-600 hover:text-slate-900">
            Back to platform
          </Link>
          {eventHref && (
            <Link
              href={eventHref}
              className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white"
            >
              View public event
            </Link>
          )}
        </div>

        <section className="rounded-[2rem] border-[10px] border-amber-300 bg-white shadow-2xl print:shadow-none">
          <div className="rounded-[1.6rem] border border-amber-500/40 px-8 py-12 md:px-14">
            <div className="text-center">
              <p className="text-sm uppercase tracking-[0.45em] text-amber-700">
                Certificate of Recognition
              </p>
              <h1 className="mt-5 text-4xl md:text-6xl font-black tracking-tight text-slate-900">
                E-Grantha Talent
              </h1>
              <p className="mt-4 text-lg text-slate-600">
                Presented for outstanding participation and achievement
              </p>
            </div>

            <div className="mt-12 text-center">
              <p className="text-sm uppercase tracking-[0.25em] text-slate-500">
                Awarded to
              </p>
              <h2 className="mt-4 text-4xl md:text-5xl font-bold text-slate-900">
                {achievement.student?.name || "Student"}
              </h2>
              <p className="mt-3 text-lg text-slate-600">
                {achievement.school?.schoolName || "School participant"}
                {achievement.student?.grade
                  ? ` - ${achievement.student.grade}`
                  : ""}
              </p>
            </div>

            <div className="mt-10 rounded-[1.5rem] bg-slate-50 px-6 py-8 text-center">
              <p className="text-lg text-slate-700 leading-8">
                This certificate confirms that{" "}
                <span className="font-semibold text-slate-900">
                  {achievement.student?.name || "the participant"}
                </span>{" "}
                earned{" "}
                <span className="font-semibold text-amber-700">
                  {formatPlacementLabel(achievement.placement)}
                </span>{" "}
                in{" "}
                <span className="font-semibold text-slate-900">
                  {achievement.event?.title || achievement.title}
                </span>
                .
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
                  Event Date
                </p>
                <p className="mt-2 font-semibold">
                  {achievement.event?.date
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
                  Issued On
                </p>
                <p className="mt-2 font-semibold">
                  {new Date(achievement.certificateIssuedAt).toLocaleDateString()}
                </p>
              </div>
            </div>

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
                  E-Grantha Talent Platform
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
