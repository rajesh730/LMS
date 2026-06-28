"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  FaBookOpen,
  FaChevronRight,
  FaFeatherAlt,
} from "react-icons/fa";
import AlertBanner from "@/components/ui/AlertBanner";
import EmptyState from "@/components/EmptyState";
import LoadingState from "@/components/ui/LoadingState";
import StudentQuickNav from "@/components/student/StudentQuickNav";
import useStudentReadingSurface from "@/lib/useStudentReadingSurface";

export default function StudentMagazineLibrary() {
  const { data, loading, error } = useStudentReadingSurface({
    endpoint: "/api/student/magazine",
    surface: "student.schoolMagazine",
  });
  const issues = useMemo(() => data?.issues || [], [data]);
  const months = useMemo(
    () => Array.from(new Set(issues.map((issue) => issue.monthLabel).filter(Boolean))),
    [issues]
  );
  const [month, setMonth] = useState("ALL");
  const visibleIssues =
    month === "ALL"
      ? issues
      : issues.filter((issue) => issue.monthLabel === month);

  if (loading) {
    return (
      <LoadingState
        title="Opening School Magazine"
        message="Loading published magazine issues."
      />
    );
  }
  if (error) {
    return (
      <AlertBanner
        type="error"
        title="Unable to load School Magazine"
        message={error}
      />
    );
  }

  return (
    <div className="student-reading-mobile-shell space-y-4 sm:space-y-6">
      <StudentQuickNav className="sm:hidden" />
      <header className="rounded-2xl border border-[#d7cdbb] bg-white p-5 shadow-sm sm:p-8">
        <div className="flex items-start gap-4">
          <span className="pravyo-brand-surface flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white">
            <FaBookOpen />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-[#4326e8]">
              Curated by your school
            </p>
            <h1 className="mt-1 text-2xl font-bold text-[#17120a] sm:text-3xl">
              School Magazine
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#52657d]">
              Browse published issues and read selected student writing as a collection.
            </p>
          </div>
        </div>
      </header>

      {issues.length === 0 ? (
        <EmptyState
          icon={FaBookOpen}
          title="No published magazine issues"
          description="Issues will appear here after your school curates and publishes them."
        />
      ) : (
        <section className="rounded-xl border border-[#d7cdbb] bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 border-b border-[#edf0f7] pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#17120a]">Published issues</h2>
              <p className="mt-1 text-sm text-[#52657d]">
                {visibleIssues.length} {visibleIssues.length === 1 ? "issue" : "issues"}
              </p>
            </div>
            <label className="block sm:w-64">
              <span className="text-xs font-black uppercase text-[#52657d]">
                Publication month
              </span>
              <select
                value={month}
                onChange={(event) => setMonth(event.target.value)}
                className="mt-2 w-full rounded-lg border border-[#cfd8ea] bg-white px-3 py-2 text-sm font-bold text-[#17120a]"
              >
                <option value="ALL">All months</option>
                {months.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleIssues.map((issue) => (
              <Link
                key={issue.id}
                href={`/student/magazine/issues/${issue.id}`}
                className="group rounded-xl border border-[#d7cdbb] bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:border-purple-300 hover:shadow-lg"
              >
                <div className="pravyo-brand-panel relative h-40 overflow-hidden rounded-lg border">
                  <div className="absolute left-5 top-6 h-20 w-14 -rotate-6 rounded-sm bg-white/80 shadow-md" />
                  <div className="absolute left-20 top-10 h-20 w-14 rotate-6 rounded-sm bg-white/65 shadow-md" />
                  <FaBookOpen className="absolute right-6 top-8 text-5xl text-white/85" />
                  <FaFeatherAlt className="absolute bottom-6 left-7 text-3xl text-white/75" />
                  <span className="absolute bottom-4 right-4 rounded-full bg-white px-3 py-1 text-[11px] font-black text-[#17120a]">
                    {issue.articleCount}{" "}
                    {issue.articleCount === 1 ? "writing" : "writings"}
                  </span>
                </div>
                <p className="mt-4 text-xs font-black uppercase text-purple-700">
                  {issue.monthLabel}
                </p>
                <h3 className="mt-1 text-xl font-bold text-[#17120a] group-hover:text-purple-700">
                  {issue.title}
                </h3>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#52657d]">
                  {issue.coverArticle?.title
                    ? `Featuring “${issue.coverArticle.title}” and other selected writing.`
                    : "A curated collection of student writing."}
                </p>
                <span className="mt-4 inline-flex items-center gap-2 text-sm font-black text-purple-700">
                  Open issue <FaChevronRight />
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
