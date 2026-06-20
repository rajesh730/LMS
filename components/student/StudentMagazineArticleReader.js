"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { FaArrowLeft } from "react-icons/fa";
import AlertBanner from "@/components/ui/AlertBanner";
import LoadingState from "@/components/ui/LoadingState";
import MagazineArticleCard, {
  getCategoryMeta,
} from "@/components/student/MagazineArticleCard";
import MagazineArticleDetail from "@/components/student/MagazineArticleDetail";
import useRealtimeChannel from "@/lib/useRealtimeChannel";

export default function StudentMagazineArticleReader({
  articleId,
  apiBasePath = "/api/student/magazine",
  backHref = "/student/magazine",
  backLabel = "Back to magazine",
  issueHrefPrefix = "/student/magazine/issues/",
  relatedHrefPrefix = "/student/magazine/",
  relatedTitle = "",
}) {
  const [article, setArticle] = useState(null);
  const [relatedArticles, setRelatedArticles] = useState([]);
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(
    async ({ silent = false } = {}) => {
      try {
        if (!silent) setLoading(true);
        setError("");
        const res = await fetch(`${apiBasePath}/${articleId}`, {
          cache: "no-store",
        });
        const payload = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(payload.message || "Failed to load article");
        }

        setArticle(payload.article || null);
        setRelatedArticles(
          Array.isArray(payload.relatedArticles) ? payload.relatedArticles : []
        );
        setStudent(payload.student || null);
      } catch (loadError) {
        setError(loadError.message || "Failed to load article");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [apiBasePath, articleId]
  );

  useEffect(() => {
    void load();
  }, [load]);

  useRealtimeChannel(
    ["student-notifications", "work-indicators"],
    useCallback(() => {
      void load({ silent: true });
    }, [load])
  );

  if (loading) {
    return (
      <LoadingState
        title="Opening article"
        message="Preparing the full magazine reading page."
      />
    );
  }

  if (error || !article) {
    return (
      <AlertBanner
        type="error"
        title="Unable to open article"
        message={error || "Article not found."}
      />
    );
  }

  const meta = getCategoryMeta(article.category);
  const issueBackHref = article.magazineIssue?.id
    ? `${issueHrefPrefix}${article.magazineIssue.id}`
    : backHref;

  return (
    <div className="student-magazine-article-reader space-y-6 text-[#27344a]">
      <Link
        href={issueBackHref}
        className="student-magazine-article-back inline-flex items-center gap-2 rounded-lg border border-[#d7cdbb] bg-white px-4 py-2 text-sm font-semibold text-[#0a2f66] shadow-sm transition hover:bg-[#f8fbff]"
      >
        <FaArrowLeft />
        {article.magazineIssue?.id ? "Back" : backLabel}
      </Link>

      <MagazineArticleDetail article={article} student={student} />

      {relatedArticles.length > 0 && (
        <section className="student-magazine-related rounded-xl border border-[#d7cdbb] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-[#17120a]">
            {relatedTitle || `More ${meta.label} Articles`}
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {relatedArticles.map((related) => (
              <MagazineArticleCard
                key={related.id}
                article={related}
                href={`${relatedHrefPrefix}${related.id}`}
                compact
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
