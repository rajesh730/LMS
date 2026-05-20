import PublicSiteNav from "@/components/public/PublicSiteNav";
import ChallengeShowcaseList from "@/components/challenges/ChallengeShowcaseList";
import {
  getPublicChallengeResponses,
  serializeChallengeResponse,
} from "@/lib/challengeShowcase";
import {
  FaArrowRight,
  FaBolt,
  FaFeatherAlt,
  FaMagic,
  FaSchool,
  FaStar,
} from "react-icons/fa";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Pratyo Pulse",
  description: "Selected student ideas and responses from platform challenges",
};

export default async function ChallengeShowcasePage() {
  const responses = (await getPublicChallengeResponses()).map(
    serializeChallengeResponse
  );

  const schoolCount = new Set(
    responses
      .map((response) => response.school?.schoolName || response.school?.name)
      .filter(Boolean)
  ).size;

  return (
    <main className="min-h-screen bg-[#f5f1e8] text-slate-950">
      <PublicSiteNav active="challenges" />

      <section className="relative overflow-hidden border-b border-[#d7cdbb] px-4 py-12 sm:px-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_18%,rgba(47,127,219,.16),transparent_32%),radial-gradient(circle_at_82%_10%,rgba(10,47,102,.12),transparent_30%),linear-gradient(135deg,#f8fbff_0%,#f5f1e8_45%,#eaf2ff_100%)]" />
        <div className="absolute inset-0 opacity-45">
          <div className="h-full w-full bg-[linear-gradient(90deg,rgba(10,47,102,.08)_1px,transparent_1px),linear-gradient(0deg,rgba(10,47,102,.06)_1px,transparent_1px)] bg-[size:54px_54px]" />
        </div>

        <div className="relative mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_390px] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-3 rounded-full border border-[#0a2f66]/10 bg-white/80 px-4 py-2 shadow-sm">
              <FaFeatherAlt className="text-[#0a2f66]" />
              <p className="text-sm font-black uppercase tracking-[0.25em] text-[#0a2f66]">
                Platform Recognition
              </p>
            </div>
            <h1 className="mt-5 text-5xl font-black tracking-tight text-[#17120a] md:text-7xl">
              Pratyo Pulse
            </h1>
            <p className="mt-4 max-w-3xl text-xl leading-8 text-slate-700">
              Selected student ideas, research, and challenge responses from
              schools on Pratyo. A public place where good student thinking gets
              read, credited, and remembered.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href="#pulse"
                className="inline-flex items-center gap-2 rounded-full bg-[#0a2f66] px-5 py-3 text-sm font-black text-white shadow-xl shadow-[#0a2f66]/20 transition hover:bg-[#123f82]"
              >
                Read the Pulse
                <FaArrowRight />
              </a>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#0a2f66]/15 bg-white/70 px-5 py-3 text-sm font-bold text-slate-700">
                <FaBolt className="text-[#0a2f66]" />
                Student + school recognition
              </span>
            </div>

            <div className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-3">
              {[
                ["Selected", responses.length],
                ["Schools", schoolCount],
                ["Mood", "Live"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-2xl border border-[#0a2f66]/10 bg-white/75 p-4 shadow-sm"
                >
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    {label}
                  </p>
                  <p className="mt-1 text-3xl font-black text-[#0a2f66]">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="hidden lg:block">
            <div className="rotate-1 rounded-[2rem] border border-[#0a2f66]/10 bg-white p-5 shadow-2xl shadow-[#0a2f66]/15">
              <div className="rounded-[1.5rem] bg-[#111827] p-5 text-white">
                <div className="mb-5 flex items-center justify-between">
                  <span className="inline-flex items-center gap-2 rounded-full bg-[#2f7fdb]/15 px-3 py-1 text-sm font-black text-[#d7e9ff]">
                    <FaMagic />
                    Today on Pulse
                  </span>
                  <FaStar className="text-[#8fc4ff]" />
                </div>
                <h2 className="text-2xl font-black">
                  Student answers become public proof.
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  A challenge starts the question. Students write the answer.
                  Pratyo selects the strongest work, then the student and school
                  get public credit together.
                </p>
                <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                    Recognition card
                  </p>
                  <p className="mt-2 text-lg font-black">Student Name</p>
                  <p className="mt-1 text-sm text-slate-400">
                    Grade - School - Challenge
                  </p>
                </div>
              </div>
              <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#f5f1e8] px-4 py-2 text-sm font-bold text-slate-700">
                <FaSchool className="text-[#0a2f66]" />
                Built for reading, not just browsing
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="pulse" className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="mb-6 flex flex-col justify-between gap-4 border-b border-[#d7cdbb] pb-5 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.25em] text-[#0a2f66]">
              Public student ideas
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-[#17120a]">
              Read what students are thinking
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-slate-600">
            Inspired by answer-first social reading: clear topic, clear author,
            school credit, and the writing itself in focus.
          </p>
        </div>
        <ChallengeShowcaseList responses={responses} />
      </section>
    </main>
  );
}
