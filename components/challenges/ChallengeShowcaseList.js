import {
  FaAward,
  FaCalendarAlt,
  FaCommentDots,
  FaQuoteLeft,
  FaSchool,
  FaUserGraduate,
} from "react-icons/fa";
import EmptyState from "@/components/EmptyState";

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function ChallengeShowcaseList({ responses = [] }) {
  if (responses.length === 0) {
    return (
      <EmptyState
        title="No selected responses yet"
        description="When the platform publishes the best challenge answers, they will appear here with student and school recognition."
      />
    );
  }

  return (
    <div className="space-y-5">
      {responses.map((response) => (
        <article
          key={String(response._id || response.id)}
          className="group w-full overflow-hidden rounded-[1.75rem] border border-[#d7cdbb] bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-[#0a2f66]/30 hover:shadow-xl hover:shadow-[#0a2f66]/10"
        >
          <div className="border-b border-[#eee3d0] bg-[#fffaf0] px-6 py-4">
            <div className="flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-wide">
              <span className="rounded-full bg-[#2f7fdb]/12 px-3 py-1 text-[#0a2f66]">
                {response.challenge?.title || "Platform Challenge"}
              </span>
              <span className="rounded-full bg-[#0a2f66]/10 px-3 py-1 text-[#0a2f66]">
                {response.category}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-600/10 px-3 py-1 text-emerald-700">
                <FaAward />
                Selected
              </span>
            </div>
          </div>

          <div className="p-6 sm:p-7">
            <p className="inline-flex items-center gap-2 text-sm font-bold text-slate-500">
              <FaCommentDots className="text-[#0a2f66]" />
              Response selected by Pratyo
            </p>
            <h2 className="mt-3 text-3xl font-black leading-tight text-[#17120a] group-hover:text-[#0a2f66]">
              {response.title}
            </h2>
            <div className="mt-4 flex flex-wrap gap-4 text-sm font-medium text-slate-600">
              <span className="inline-flex items-center gap-2">
                <FaUserGraduate className="text-slate-400" />
                {response.student?.name || "Student"} - {response.student?.grade || "Grade"}
              </span>
              <span className="inline-flex items-center gap-2">
                <FaSchool className="text-slate-400" />
                {response.school?.schoolName ||
                  response.school?.name ||
                  "School"}
              </span>
              {response.publishedAt && (
                <span className="inline-flex items-center gap-2">
                  <FaCalendarAlt className="text-slate-400" />
                  {formatDate(response.publishedAt)}
                </span>
              )}
            </div>
            <div className="mt-6 rounded-2xl border border-[#eee3d0] bg-[#fffdf8] p-5">
              <FaQuoteLeft className="mb-3 text-[#0a2f66]" />
              <p className="line-clamp-[14] whitespace-pre-wrap text-[15px] leading-8 text-slate-800">
                {response.content}
              </p>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
