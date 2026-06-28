"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  FaBookOpen,
  FaChevronRight,
  FaFeatherAlt,
  FaShieldAlt,
} from "react-icons/fa";
import AlertBanner from "@/components/ui/AlertBanner";
import AppDate from "@/components/common/AppDate";
import EmptyState from "@/components/EmptyState";
import LoadingState from "@/components/ui/LoadingState";
import StudentQuickNav from "@/components/student/StudentQuickNav";
import { WritingPreview } from "@/components/WritingContent";
import { normalizeWritingCategory } from "@/lib/writingCategories";
import useStudentReadingSurface from "@/lib/useStudentReadingSurface";

const CATEGORIES = {
  BLOG_ARTICLE: "Blog Article",
  POEM: "Poem",
  RESEARCH: "Research",
  OPINION: "Opinion",
  CREATIVE_WRITING: "Creative Writing",
};

function initials(name = "") {
  return String(name || "Student")
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function gradeLabel(grade) {
  if (!grade) return "Student";
  return /^grade\b/i.test(grade) ? grade : `Grade ${grade}`;
}

export default function SchoolWallFeed() {
  const { data, loading, error } = useStudentReadingSurface({
    endpoint: "/api/student/school-wall",
    surface: "student.schoolWall",
  });
  const [category, setCategory] = useState("ALL");
  const items = useMemo(() => data?.items || [], [data]);
  const visibleItems = useMemo(
    () =>
      category === "ALL"
        ? items
        : items.filter(
            (item) => normalizeWritingCategory(item.category) === category
          ),
    [category, items]
  );
  const availableCategories = useMemo(
    () =>
      Object.keys(CATEGORIES).filter((value) =>
        items.some(
          (item) => normalizeWritingCategory(item.category) === value
        )
      ),
    [items]
  );

  if (loading) {
    return (
      <LoadingState
        title="Opening School Wall"
        message="Loading the latest student writing."
      />
    );
  }
  if (error) {
    return (
      <AlertBanner type="error" title="Unable to load School Wall" message={error} />
    );
  }

  return (
    <div className="student-reading-mobile-shell space-y-4 sm:space-y-6">
      <StudentQuickNav className="sm:hidden" />
      <header className="rounded-2xl border border-[#d7cdbb] bg-white p-5 shadow-sm sm:p-8">
        <div className="flex items-start gap-4">
          <span className="pravyo-brand-surface flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white">
            <FaFeatherAlt />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-[#1f4e79]">
              Live student writing
            </p>
            <h1 className="mt-1 text-2xl font-bold text-[#17120a] sm:text-3xl">
              School Wall
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#52657d]">
              Recent writing shared by students in your school, ordered newest first.
            </p>
          </div>
        </div>
      </header>

      {items.length === 0 ? (
        <EmptyState
          icon={FaFeatherAlt}
          title="No writing on the Wall yet"
          description="Approved student writing will appear here when your school publishes it."
        />
      ) : (
        <section className="rounded-xl border border-[#d7cdbb] bg-white p-3 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-center gap-2 border-b border-[#edf0f7] pb-4">
            <button
              type="button"
              onClick={() => setCategory("ALL")}
              className={`rounded-full px-4 py-2 text-xs font-black ${
                category === "ALL"
                  ? "bg-[#1f4e79] text-white"
                  : "bg-[#f0edff] text-[#1f4e79]"
              }`}
            >
              All {items.length}
            </button>
            {availableCategories.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setCategory(value)}
                className={`rounded-full px-4 py-2 text-xs font-black ${
                  category === value
                    ? "bg-[#1f4e79] text-white"
                    : "bg-[#f0edff] text-[#1f4e79]"
                }`}
              >
                {CATEGORIES[value]}
              </button>
            ))}
          </div>

          {visibleItems.length === 0 ? (
            <EmptyState
              icon={FaBookOpen}
              title="No writing in this category"
              description="Choose another category to continue reading."
            />
          ) : (
            <div className="student-wall-list mt-4 space-y-4">
              {visibleItems.map((article) => {
                const author = article.authorStudent?.name || "Student";
                return (
                  <article
                    key={article.id}
                    className="rounded-2xl border border-[#edf0f7] bg-white p-4 shadow-sm sm:p-5"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f0edff] text-sm font-black text-[#1f4e79]">
                        {initials(author)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black text-[#111827]">
                          {author}
                        </p>
                        <p className="truncate text-xs font-bold text-[#667085]">
                          <FaShieldAlt className="mr-1 inline text-[#2f7fdb]" />
                          {gradeLabel(article.authorStudent?.grade)}
                          {article.publishedAt && (
                            <>
                              {" · "}
                              <AppDate value={article.publishedAt} />
                            </>
                          )}
                        </p>
                      </div>
                      <span className="rounded-full bg-[#f0edff] px-3 py-1 text-[10px] font-black text-[#1f4e79]">
                        {CATEGORIES[normalizeWritingCategory(article.category)] ||
                          "Writing"}
                      </span>
                    </div>
                    <h2 className="mt-4 text-xl font-bold text-[#111827]">
                      {article.title || "Student writing"}
                    </h2>
                    <WritingPreview
                      content={article.content}
                      maxLength={300}
                      className="mt-2 line-clamp-5 text-sm leading-6 text-[#4b5565]"
                    />
                    <Link
                      href={`/student/school-wall/${article.id}`}
                      className="mt-3 inline-flex items-center gap-2 text-sm font-black text-[#1f4e79]"
                    >
                      Read writing <FaChevronRight />
                    </Link>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
