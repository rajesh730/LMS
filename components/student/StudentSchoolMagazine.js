"use client";

import { useEffect, useMemo, useState } from "react";
import { FaBookOpen, FaCalendarAlt, FaFeatherAlt } from "react-icons/fa";
import AlertBanner from "@/components/ui/AlertBanner";
import EmptyState from "@/components/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import useWorkIndicators from "@/lib/useWorkIndicators";

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function StudentSchoolMagazine() {
  const { markSurfaceSeen } = useWorkIndicators();
  const [student, setStudent] = useState(null);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedArticleId, setSelectedArticleId] = useState("");

  useEffect(() => {
    void markSurfaceSeen("student.magazine");
  }, [markSurfaceSeen]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await fetch("/api/student/magazine", { cache: "no-store" });
        const payload = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(payload.message || "Failed to load school magazine");
        }

        if (active) {
          const nextArticles = Array.isArray(payload.articles)
            ? payload.articles
            : [];
          setStudent(payload.student || null);
          setArticles(nextArticles);
          setSelectedArticleId(nextArticles[0]?.id || "");
        }
      } catch (loadError) {
        if (active) {
          setError(loadError.message || "Failed to load school magazine");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      active = false;
    };
  }, []);

  const selectedArticle = useMemo(
    () =>
      articles.find((article) => article.id === selectedArticleId) ||
      articles[0] ||
      null,
    [articles, selectedArticleId]
  );

  if (loading) {
    return (
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="h-96 animate-pulse rounded-lg border border-[#d7cdbb] bg-white" />
        <div className="h-96 animate-pulse rounded-lg border border-[#d7cdbb] bg-white" />
      </div>
    );
  }

  if (error) {
    return (
      <AlertBanner
        type="error"
        title="Unable to load magazine"
        message={error}
      />
    );
  }

  return (
    <div className="space-y-6 text-[#27344a]">
      <PageHeader
        icon={FaBookOpen}
        eyebrow="School reading room"
        title="School Magazine"
        description="Read writing selected and published by your school. These articles are approved for students in your school community."
        meta={
          student ? (
            <p className="text-sm text-[#52657d]">
              For {student.name} - {student.grade} - Roll {student.rollNumber}
            </p>
          ) : null
        }
      />

      {articles.length === 0 ? (
        <EmptyState
          icon={FaFeatherAlt}
          title="No school magazine articles yet"
          description="Published student writing will appear here after your school makes it live."
        />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <section className="space-y-4">
            <div className="rounded-lg border border-[#d7cdbb] bg-white p-5 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-normal text-[#52657d]">
                Published collection
              </p>
              <h3 className="mt-1 text-lg font-bold text-[#17120a]">
                Magazine Articles ({articles.length})
              </h3>

              <div className="mt-4 space-y-3">
                {articles.map((article) => (
                  <button
                    key={article.id}
                    type="button"
                    onClick={() => setSelectedArticleId(article.id)}
                    className={`w-full rounded-lg border p-4 text-left transition ${
                      selectedArticle?.id === article.id
                        ? "border-[#2f7fdb]/45 bg-[#eaf2ff]"
                        : "border-[#d7cdbb] bg-[#f8fbff] hover:border-[#2f7fdb]/35"
                    }`}
                  >
                    <h4 className="text-base font-bold text-[#17120a]">
                      {article.title}
                    </h4>
                    <p className="mt-1 text-sm text-[#52657d]">
                      {article.authorStudent?.name || "Student"}
                    </p>
                    {article.submissionSource === "PLATFORM_CHALLENGE" && (
                      <p className="mt-2 text-xs font-semibold text-[#0a2f66]">
                        Challenge:{" "}
                        {article.challengeTitle || "Student Challenge"}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-[#d7cdbb] bg-white p-5 shadow-sm">
            {selectedArticle && (
              <div className="space-y-5">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-[#bfd7f7] bg-[#eaf2ff] px-3 py-1 text-xs font-semibold text-[#0a2f66]">
                      {selectedArticle.category}
                    </span>
                  </div>
                  <h2 className="mt-4 text-2xl font-bold text-[#17120a]">
                    {selectedArticle.title}
                  </h2>
                  {selectedArticle.submissionSource ===
                    "PLATFORM_CHALLENGE" && (
                    <p className="mt-2 text-sm font-semibold text-[#0a2f66]">
                      Challenge response:{" "}
                      {selectedArticle.challengeTitle || "Student Challenge"}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-[#52657d]">
                    <span>
                      {selectedArticle.authorStudent?.name || "Student"} -{" "}
                      {selectedArticle.authorStudent?.grade || "Grade"} - Roll{" "}
                      {selectedArticle.authorStudent?.rollNumber || "-"}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <FaCalendarAlt className="text-[#0a2f66]" />
                      {formatDate(selectedArticle.publishedAt)}
                    </span>
                  </div>
                </div>

                <article className="whitespace-pre-wrap rounded-lg border border-[#d7cdbb] bg-[#f8fbff] p-5 text-sm leading-7 text-[#27344a]">
                  {selectedArticle.content}
                </article>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
