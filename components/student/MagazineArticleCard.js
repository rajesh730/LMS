"use client";

import Link from "next/link";
import {
  FaBookOpen,
  FaCalendarAlt,
  FaClock,
  FaFeatherAlt,
  FaLayerGroup,
  FaPenNib,
  FaStar,
  FaUser,
} from "react-icons/fa";
import { WritingPreview } from "@/components/WritingContent";
import { normalizeWritingCategory } from "@/lib/writingCategories";

const CATEGORY_META = {
  BLOG_ARTICLE: {
    label: "Blog Article",
    chip: "border-indigo-200 bg-indigo-50 text-indigo-700",
    icon: FaBookOpen,
  },
  POEM: {
    label: "Poem",
    chip: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700",
    icon: FaFeatherAlt,
  },
  RESEARCH: {
    label: "Research",
    chip: "border-emerald-200 bg-emerald-50 text-emerald-700",
    icon: FaLayerGroup,
  },
  OPINION: {
    label: "Opinion",
    chip: "border-amber-200 bg-amber-50 text-amber-700",
    icon: FaStar,
  },
  CREATIVE_WRITING: {
    label: "Creative Writing",
    chip: "border-purple-200 bg-purple-50 text-purple-700",
    icon: FaPenNib,
  },
};

export function getCategoryMeta(value) {
  return CATEGORY_META[normalizeWritingCategory(value)] || CATEGORY_META.BLOG_ARTICLE;
}

export function formatMagazineDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function getReadTime(content = "") {
  const words = String(content || "").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 180));
}

export function MagazineArticleMeta({
  article,
  className = "",
  showIssue = false,
}) {
  return (
    <div className={`flex flex-wrap items-center gap-3 text-xs font-bold text-[#607089] ${className}`}>
      <span className="inline-flex items-center gap-1.5">
        <FaUser />
        {article.authorStudent?.name || "Student"}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <FaCalendarAlt />
        {formatMagazineDate(article.publishedAt)}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <FaClock />
        {getReadTime(article.content)} min read
      </span>
      {showIssue && article.magazineIssue?.title && (
        <span className="inline-flex items-center gap-1.5">
          <FaBookOpen />
          {article.magazineIssue.title}
        </span>
      )}
    </div>
  );
}

export default function MagazineArticleCard({
  article,
  index,
  href,
  compact = false,
}) {
  const meta = getCategoryMeta(article.category);

  return (
    <Link
      href={href}
      className={`student-issue-article-card group rounded-xl border border-[#d7cdbb] bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:border-purple-300 hover:bg-white hover:shadow-lg ${
        compact ? "p-4" : "p-4"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-black ${meta.chip}`}>
          {meta.label}
        </span>
        {Number.isInteger(index) && (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-xs font-black text-purple-700">
            {index + 1}
          </span>
        )}
      </div>
      <h3 className={`${compact ? "mt-3 text-base" : "mt-4 text-xl"} line-clamp-2 font-black leading-snug text-[#17120a] group-hover:text-purple-700`}>
        {article.title}
      </h3>
      <WritingPreview
        content={article.content}
        maxLength={compact ? 120 : 240}
        className={`${compact ? "line-clamp-3" : "line-clamp-5"} student-issue-article-preview mt-3 text-sm leading-5 text-[#52657d]`}
      />
      <MagazineArticleMeta article={article} className="mt-3" />
      <span className="mt-5 inline-flex text-sm font-black text-purple-700">
        Read full writing
      </span>
    </Link>
  );
}
