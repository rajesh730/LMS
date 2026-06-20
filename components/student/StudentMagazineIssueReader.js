"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FaArrowLeft,
  FaBookOpen,
  FaFeatherAlt,
} from "react-icons/fa";
import AlertBanner from "@/components/ui/AlertBanner";
import LoadingState from "@/components/ui/LoadingState";
import MagazineArticleCard, {
  formatMagazineDate,
  getCategoryMeta,
} from "@/components/student/MagazineArticleCard";

function IssueCoverArt({ issue, articles }) {
  return (
    <div className="student-issue-cover pravyo-brand-panel relative min-h-[420px] overflow-hidden rounded-xl border border-white/20 p-6 text-white shadow-2xl">
      <div className="absolute left-8 top-8 h-36 w-24 rounded-md bg-white/82 shadow-xl" />
      <div className="absolute left-28 top-20 h-36 w-24 rounded-md bg-white/68 shadow-xl" />
      <div className="absolute bottom-20 right-10 h-1.5 w-52 rotate-[-16deg] rounded-full bg-white/35" />
      <div className="absolute bottom-28 right-16 h-1.5 w-36 rotate-[-16deg] rounded-full bg-white/35" />
      <FaBookOpen className="absolute right-8 top-8 text-7xl text-white/88" />
      <FaFeatherAlt className="absolute bottom-8 left-10 text-5xl text-white/75" />

      <div className="relative flex min-h-[360px] flex-col justify-end">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-white/85">
          Pravyo School Magazine
        </p>
        <h1 className="mt-4 max-w-xl text-5xl font-black leading-tight md:text-6xl">
          {issue.title}
        </h1>
        <p className="mt-4 max-w-lg text-sm font-bold leading-6 text-white/86">
          A curated school magazine with {articles.length} selected student{" "}
          {articles.length === 1 ? "writing" : "writings"}.
        </p>
        <div className="mt-6 flex flex-wrap gap-2 text-xs font-black">
          <span className="rounded-full bg-white px-3 py-1.5 text-[#17120a]">
            {articles.length} {articles.length === 1 ? "writing" : "writings"}
          </span>
          <span className="rounded-full bg-white/18 px-3 py-1.5 text-white">
            {formatMagazineDate(issue.publishedAt || issue.weekStart)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function StudentMagazineIssueReader({
  issueId,
  apiBasePath = "/api/student/magazine-issues",
  backHref = "/student/magazine",
  backHrefPattern = "",
  backLabel = "Back to magazines",
  articleHrefPrefix = "/student/magazine/",
}) {
  const [issue, setIssue] = useState(null);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`${apiBasePath}/${issueId}`, {
        cache: "no-store",
      });
      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(payload.message || "Failed to load magazine");
      }

      setIssue(payload.issue || null);
      setArticles(Array.isArray(payload.articles) ? payload.articles : []);
    } catch (loadError) {
      setError(loadError.message || "Failed to load magazine");
    } finally {
      setLoading(false);
    }
  }, [apiBasePath, issueId]);

  useEffect(() => {
    void load();
  }, [load]);

  const categoryCounts = useMemo(() => {
    const counts = new Map();
    articles.forEach((article) => {
      const meta = getCategoryMeta(article.category);
      counts.set(meta.label, (counts.get(meta.label) || 0) + 1);
    });
    return Array.from(counts.entries());
  }, [articles]);

  if (loading) {
    return (
      <LoadingState
        title="Opening magazine"
        message="Preparing this issue and its selected student writing."
      />
    );
  }

  if (error || !issue) {
    return (
      <AlertBanner
        type="error"
        title="Unable to open magazine"
        message={error || "Magazine not found."}
      />
    );
  }

  const resolvedBackHref =
    backHrefPattern && issue?.schoolId
      ? backHrefPattern.replace("{schoolId}", issue.schoolId)
      : backHref;

  return (
    <div className="student-issue-reader-shell space-y-6 text-[#27344a]">
      <Link
        href={resolvedBackHref}
        className="student-issue-back inline-flex w-fit items-center gap-2 rounded-lg border border-[#d7cdbb] bg-white px-4 py-2 text-sm font-black text-[#0a2f66] shadow-sm transition hover:bg-purple-50"
      >
        <FaArrowLeft />
        {backLabel}
      </Link>

      <section className="student-issue-intro grid gap-5 lg:grid-cols-[1fr_340px]">
        <IssueCoverArt issue={issue} articles={articles} />

        <aside className="student-issue-contents rounded-xl border border-[#d7cdbb] bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-purple-700">
            Issue Contents
          </p>
          <h2 className="mt-2 text-2xl font-black text-[#17120a]">
            {articles.length} selected {articles.length === 1 ? "piece" : "pieces"}
          </h2>
          <div className="mt-5 space-y-3">
            {articles.map((article, index) => (
              <Link
                key={article.id}
                href={`${articleHrefPrefix}${article.id}`}
                className="flex w-full gap-3 rounded-lg border border-[#edf0f7] bg-[#f8fbff] p-3 text-left transition hover:border-purple-200 hover:bg-white"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-100 text-xs font-black text-purple-700">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="line-clamp-1 text-sm font-black text-[#17120a]">
                    {article.title}
                  </p>
                  <p className="mt-1 text-xs font-bold text-[#607089]">
                    {article.authorStudent?.name || "Student"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </aside>
      </section>

      {categoryCounts.length > 0 && (
        <section className="student-issue-category-counts flex flex-wrap gap-2">
          {categoryCounts.map(([label, count]) => (
            <span
              key={label}
              className="rounded-full border border-[#d7cdbb] bg-white px-3 py-2 text-xs font-black text-[#52657d]"
            >
              {label}: {count}
            </span>
          ))}
        </section>
      )}

      <section className="student-issue-writing-list grid gap-4 md:grid-cols-2">
        {articles.map((article, index) => (
          <MagazineArticleCard
            key={article.id}
            article={article}
            index={index}
            href={`${articleHrefPrefix}${article.id}`}
          />
        ))}
      </section>
    </div>
  );
}
