"use client";

import { FaPenNib } from "react-icons/fa";
import WritingContent from "@/components/WritingContent";
import {
  getCategoryMeta,
  MagazineArticleMeta,
} from "@/components/student/MagazineArticleCard";

function MagazineArt({ category }) {
  const meta = getCategoryMeta(category);
  const Icon = meta.icon;

  return (
    <div className="pravyo-brand-panel relative min-h-72 overflow-hidden rounded-2xl border p-8">
      <div className="absolute left-10 top-10 h-32 w-44 rotate-[-8deg] rounded-lg border border-white/80 bg-white/75 shadow-xl" />
      <div className="absolute left-32 top-16 h-32 w-44 rotate-[8deg] rounded-lg border border-white/80 bg-white/75 shadow-xl" />
      <div className="absolute bottom-12 right-16 h-1.5 w-48 rotate-[-18deg] rounded-full bg-white/35" />
      <div className="absolute bottom-20 right-24 h-1.5 w-32 rotate-[-18deg] rounded-full bg-white/35" />
      <Icon className="absolute right-10 top-10 text-7xl text-white/82" />
      <FaPenNib className="absolute bottom-12 left-12 text-5xl text-white/72" />
      <span className="absolute bottom-8 right-8 rounded-full bg-white/85 px-4 py-2 text-sm font-bold text-[#17120a] shadow-sm">
        {meta.label}
      </span>
    </div>
  );
}

export default function MagazineArticleDetail({ article, student = null }) {
  const meta = getCategoryMeta(article.category);

  return (
    <article className="student-magazine-article-card overflow-hidden rounded-2xl border border-[#d7cdbb] bg-white shadow-[0_18px_50px_rgba(10,47,102,0.08)]">
      <div className="student-magazine-article-head grid gap-6 p-5 md:p-8 xl:grid-cols-[1fr_0.72fr]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${meta.chip}`}
            >
              {meta.label}
            </span>
          </div>

          <h1 className="student-reader-title mt-5 max-w-4xl text-4xl font-bold leading-tight text-[#17120a] md:text-5xl">
            {article.title}
          </h1>
          <MagazineArticleMeta
            article={article}
            showIssue
            className="student-magazine-article-meta mt-4 gap-4 text-sm font-normal"
          />
          {student && (
            <p className="mobile-accessory-info mt-3 text-sm text-[#52657d] sm:block">
              Reading as {student.name} - {student.grade} - Roll{" "}
              {student.rollNumber || "-"}
            </p>
          )}
        </div>

        <div className="mobile-accessory-info sm:block">
          <MagazineArt category={article.category} />
        </div>
      </div>

      <div className="student-magazine-article-body border-t border-[#d7cdbb] bg-[#fffdf8] px-5 py-8 md:px-10">
        <WritingContent
          content={article.content}
          className="mx-auto max-w-3xl text-base leading-7 text-[#27344a] md:text-lg"
        />
      </div>
    </article>
  );
}
