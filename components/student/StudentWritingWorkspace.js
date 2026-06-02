"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FaBold,
  FaBookOpen,
  FaCalendarAlt,
  FaCheckCircle,
  FaClock,
  FaCloud,
  FaEdit,
  FaEllipsisV,
  FaEye,
  FaFeatherAlt,
  FaFileAlt,
  FaHeart,
  FaImage,
  FaItalic,
  FaLayerGroup,
  FaLightbulb,
  FaLink,
  FaListOl,
  FaListUl,
  FaPaperPlane,
  FaPenNib,
  FaPlus,
  FaQuoteLeft,
  FaQuoteRight,
  FaRegFileAlt,
  FaRedo,
  FaSchool,
  FaStar,
  FaTags,
  FaTimes,
  FaTrash,
  FaTrophy,
  FaUnderline,
  FaUndo,
} from "react-icons/fa";
import EmptyState from "@/components/EmptyState";
import AlertBanner from "@/components/ui/AlertBanner";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import LoadingState from "@/components/ui/LoadingState";
import useRealtimeChannel from "@/lib/useRealtimeChannel";
import useWorkIndicators from "@/lib/useWorkIndicators";
import {
  WRITING_CATEGORIES,
  normalizeWritingCategory,
} from "@/lib/writingCategories";

const CATEGORY_META = {
  BLOG_ARTICLE: {
    label: "Blog Article",
    icon: FaBookOpen,
    accent: "text-indigo-700",
    chip: "border-indigo-200 bg-indigo-50 text-indigo-700",
    art: "from-indigo-100 via-white to-sky-100",
  },
  POEM: {
    label: "Poem",
    icon: FaFeatherAlt,
    accent: "text-fuchsia-700",
    chip: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700",
    art: "from-fuchsia-100 via-white to-violet-100",
  },
  RESEARCH: {
    label: "Research",
    icon: FaLayerGroup,
    accent: "text-emerald-700",
    chip: "border-emerald-200 bg-emerald-50 text-emerald-700",
    art: "from-emerald-100 via-white to-cyan-100",
  },
  OPINION: {
    label: "Opinion",
    icon: FaStar,
    accent: "text-amber-700",
    chip: "border-amber-200 bg-amber-50 text-amber-700",
    art: "from-amber-100 via-white to-yellow-100",
  },
  CREATIVE_WRITING: {
    label: "Creative Writing",
    icon: FaPenNib,
    accent: "text-purple-700",
    chip: "border-purple-200 bg-purple-50 text-purple-700",
    art: "from-purple-100 via-white to-pink-100",
  },
};

const STATUS_META = {
  DRAFT: {
    label: "Draft",
    chip: "border-slate-200 bg-white text-[#40516b]",
    dot: "bg-slate-400",
    icon: FaRegFileAlt,
  },
  SUBMITTED: {
    label: "Under Review",
    chip: "border-amber-200 bg-amber-50 text-amber-800",
    dot: "bg-amber-500",
    icon: FaPaperPlane,
  },
  APPROVED: {
    label: "Published",
    chip: "border-emerald-200 bg-emerald-50 text-emerald-800",
    dot: "bg-emerald-500",
    icon: FaCheckCircle,
  },
  REJECTED: {
    label: "Needs Revision",
    chip: "border-red-200 bg-red-50 text-red-700",
    dot: "bg-red-500",
    icon: FaEdit,
  },
};

const LIBRARY_FILTERS = [
  ["ALL", "All Writing"],
  ["FREE", "Free Writing"],
  ["SCHOOL", "School Writing"],
  ["MAGAZINE", "School Magazine"],
];

const CATEGORY_OPTIONS = WRITING_CATEGORIES;

function normalizeCategory(value) {
  return normalizeWritingCategory(value);
}

function getCategoryMeta(value) {
  return CATEGORY_META[normalizeCategory(value)];
}

function getStatusMeta(value) {
  return STATUS_META[String(value || "DRAFT").toUpperCase()] || STATUS_META.DRAFT;
}

function getLibraryBucket(writing) {
  if (writing.isMagazinePublished) return "MAGAZINE";
  if (
    writing.submissionSource === "FREE_WRITE" &&
    String(writing.status || "DRAFT").toUpperCase() === "DRAFT"
  ) {
    return "FREE";
  }
  return "SCHOOL";
}

function getLibraryMeta(writing) {
  const bucket = getLibraryBucket(writing);
  const meta = {
    FREE: {
      label: "Free Writing",
      icon: FaPenNib,
      chip: "border-rose-200 bg-rose-50 text-rose-800",
    },
    SCHOOL: {
      label: "School Writing",
      icon: FaSchool,
      chip: "border-indigo-200 bg-indigo-50 text-indigo-800",
    },
    MAGAZINE: {
      label: "School Magazine",
      icon: FaBookOpen,
      chip: "border-emerald-200 bg-emerald-50 text-emerald-800",
    },
  };
  return meta[bucket];
}

function getWorkflowMessage(writing) {
  const bucket = getLibraryBucket(writing);
  const status = String(writing.status || "DRAFT").toUpperCase();

  if (bucket === "MAGAZINE") {
    return "Published in your school magazine and visible to students from your school.";
  }

  if (status === "DRAFT") {
    return "Private draft. Keep editing, then send it to school review when it is ready.";
  }

  if (status === "SUBMITTED") {
    return "Sent to school review. Your school will approve it for publishing or send it back with notes.";
  }

  if (status === "APPROVED") {
    return "Approved by your school. It is waiting for the school to publish it in the magazine.";
  }

  if (status === "REJECTED") {
    return "Returned with review notes. Revise it, then send it back to school review.";
  }

  return "Writing is saved in your library.";
}

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatShortDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getWordCount(content = "") {
  return String(content || "").trim().split(/\s+/).filter(Boolean).length;
}

function getReadTime(content = "") {
  return Math.max(1, Math.ceil(getWordCount(content) / 180));
}

function getPreview(content = "", maxLength = 130) {
  const text = String(content || "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}...`;
}

function buildEmptyForm() {
  return {
    id: "",
    title: "",
    content: "",
    category: "BLOG_ARTICLE",
    status: "DRAFT",
  };
}

function StatusPill({ status }) {
  const meta = getStatusMeta(status);
  const Icon = meta.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${meta.chip}`}
    >
      <Icon />
      {meta.label}
    </span>
  );
}

function CategoryArt({ category, className = "" }) {
  const meta = getCategoryMeta(category);
  const Icon = meta.icon;

  return (
    <div
      className={`relative overflow-hidden rounded-lg bg-gradient-to-br ${meta.art} ${className}`}
    >
      <div className="absolute left-6 top-5 h-16 w-24 rotate-[-8deg] rounded-md border border-white/80 bg-white/75 shadow-sm" />
      <div className="absolute left-16 top-9 h-16 w-24 rotate-[8deg] rounded-md border border-white/80 bg-white/75 shadow-sm" />
      <div className="absolute bottom-7 right-8 h-1 w-28 rotate-[-18deg] rounded-full bg-current/20" />
      <div className="absolute bottom-11 right-12 h-1 w-20 rotate-[-18deg] rounded-full bg-current/20" />
      <Icon className={`absolute right-6 top-6 text-4xl ${meta.accent}`} />
      <FaPenNib className={`absolute bottom-6 left-7 text-2xl ${meta.accent}`} />
      <span className="absolute bottom-4 right-4 rounded-full bg-white/85 px-3 py-1 text-[11px] font-bold text-[#17120a] shadow-sm">
        {meta.label}
      </span>
    </div>
  );
}

function WritingStudioHero({
  student,
  writings,
  libraryCounts,
  onNewDraft,
}) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-[#e7dcc8] bg-white shadow-[0_18px_50px_rgba(10,47,102,0.08)]">
      <div className="grid gap-6 p-5 md:p-8 xl:grid-cols-[1fr_0.86fr]">
        <div className="relative z-10 min-w-0">
          <p className="text-xs font-black uppercase text-purple-700">
            Creative Writing Studio
          </p>
          <h1 className="mt-4 max-w-2xl text-4xl font-black leading-tight text-[#17120a] md:text-5xl">
            Share your voice.{" "}
            <span className="text-pink-600">Inspire your school.</span>
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-[#52657d] md:text-base">
            Express your ideas, stories, and creativity. Your words can become a
            draft, a school magazine article, or a platform prompt response.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              [FaPenNib, libraryCounts.FREE, "Free Writing", "rose"],
              [FaSchool, libraryCounts.SCHOOL, "School Writing", "indigo"],
              [FaBookOpen, libraryCounts.MAGAZINE, "School Magazine", "emerald"],
            ].map(([Icon, value, label, tone]) => {
              const tones = {
                purple: "border-purple-100 bg-purple-50 text-purple-700",
                rose: "border-rose-100 bg-rose-50 text-rose-700",
                indigo: "border-indigo-100 bg-indigo-50 text-indigo-700",
                emerald: "border-emerald-100 bg-emerald-50 text-emerald-700",
              };
              return (
                <div
                  key={label}
                  className="rounded-lg border border-[#e7dcc8] bg-white px-4 py-3 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-lg border ${tones[tone]}`}
                    >
                      <Icon />
                    </span>
                    <div>
                      <p className="text-lg font-black leading-none text-[#17120a]">
                        {value}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-[#52657d]">
                        {label}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="relative min-h-72 overflow-hidden rounded-2xl bg-gradient-to-br from-sky-50 via-white to-rose-50 p-6">
          <div className="absolute bottom-8 right-8 h-28 w-28 rounded-full bg-rose-200/55 blur-2xl" />
          <div className="absolute left-8 top-8 h-24 w-24 rounded-full bg-purple-200/45 blur-2xl" />
          <div className="absolute right-12 top-16 h-32 w-52 rotate-[-6deg] rounded-lg border border-[#d7cdbb] bg-white/80 shadow-xl" />
          <div className="absolute right-24 top-24 h-32 w-52 rotate-[7deg] rounded-lg border border-[#d7cdbb] bg-white/85 shadow-xl" />
          <FaPenNib className="absolute right-12 top-10 text-5xl text-pink-500" />
          <FaBookOpen className="absolute bottom-11 left-10 text-6xl text-indigo-600" />
          <div className="relative mt-44 rounded-xl border border-white/80 bg-white/80 p-4 shadow-sm backdrop-blur">
            <p className="text-sm font-bold text-[#17120a]">
              {student?.name || "Student"} writing desk
            </p>
            <p className="mt-1 text-xs text-[#52657d]">
              {student
                ? `${student.grade || "Grade"} - Roll ${student.rollNumber || "-"}`
                : "Ready for your next article"}
            </p>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onNewDraft}
        className="absolute right-5 top-5 inline-flex items-center gap-2 rounded-lg bg-purple-700 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-purple-600"
      >
        <FaPlus />
        New Writing
      </button>
    </section>
  );
}

function WritingWorkflowPanel({ libraryCounts, onSelectLibrary, onSelectStatus }) {
  const steps = [
    {
      id: "ALL",
      title: "All Writing",
      count: libraryCounts.ALL,
      icon: FaFileAlt,
      tone: "border-purple-100 bg-purple-50 text-purple-800",
      next: "See every draft, review item, magazine article, and platform publication together.",
      action: () => {
        onSelectLibrary("ALL");
        onSelectStatus("ALL");
      },
    },
    {
      id: "FREE",
      title: "Free Writing",
      count: libraryCounts.FREE,
      icon: FaPenNib,
      tone: "border-rose-100 bg-rose-50 text-rose-800",
      next: "Private drafts stay here until the student sends them to school review.",
      action: () => {
        onSelectLibrary("FREE");
        onSelectStatus("DRAFT");
      },
    },
    {
      id: "SCHOOL",
      title: "School Review",
      count: libraryCounts.SCHOOL,
      icon: FaSchool,
      tone: "border-indigo-100 bg-indigo-50 text-indigo-800",
      next: "School reviews submitted work, approves strong pieces, or returns notes for revision.",
      action: () => {
        onSelectLibrary("SCHOOL");
        onSelectStatus("ALL");
      },
    },
    {
      id: "MAGAZINE",
      title: "School Magazine",
      count: libraryCounts.MAGAZINE,
      icon: FaBookOpen,
      tone: "border-emerald-100 bg-emerald-50 text-emerald-800",
      next: "Approved and published articles become visible in the school magazine.",
      action: () => {
        onSelectLibrary("MAGAZINE");
        onSelectStatus("APPROVED");
      },
    },
  ];

  return (
    <section className="rounded-xl border border-[#e7dcc8] bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-black text-[#17120a]">Writing Workflow</h2>
          <p className="mt-1 text-sm leading-6 text-[#52657d]">
            Draft freely, send polished work to school review, publish approved
            pieces in the magazine, and track platform-selected responses.
          </p>
        </div>
        <span className="text-xs font-black uppercase text-purple-700">
          4 clear views
        </span>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-4">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <button
              key={step.id}
              type="button"
              onClick={step.action}
              className={`min-h-36 rounded-lg border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${step.tone}`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/85">
                  <Icon />
                </span>
                <strong className="text-2xl font-black text-[#17120a]">
                  {step.count || 0}
                </strong>
              </div>
              <h3 className="mt-3 text-sm font-black text-[#17120a]">
                {step.title}
              </h3>
              <p className="mt-2 text-xs font-semibold leading-5 text-[#40516b]">
                {step.next}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function EditorToolbar() {
  const tools = [
    FaBold,
    FaItalic,
    FaUnderline,
    FaListUl,
    FaListOl,
    FaQuoteRight,
    FaLink,
    FaImage,
  ];

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-y border-[#e7dcc8] bg-[#fffdf8] px-3 py-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {tools.map((Icon, index) => (
          <button
            key={index}
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-md text-[#40516b] transition hover:bg-purple-50 hover:text-purple-700"
            aria-label="Editor tool"
          >
            <Icon className="text-xs" />
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1.5">
        {[FaUndo, FaRedo].map((Icon, index) => (
          <button
            key={index}
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-md text-[#75869b] transition hover:bg-purple-50 hover:text-purple-700"
            aria-label="Editor history"
          >
            <Icon className="text-xs" />
          </button>
        ))}
      </div>
    </div>
  );
}

function WritingEditor({
  form,
  setForm,
  editorMode,
  setEditorMode,
  activeEditingLabel,
  saving,
  onSave,
  onReset,
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-[#e7dcc8] bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-[#e7dcc8] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          {["WRITE", "PREVIEW"].map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setEditorMode(mode)}
              className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                editorMode === mode
                  ? "bg-purple-50 text-purple-700"
                  : "text-[#52657d] hover:bg-[#f8fbff]"
              }`}
            >
              {mode === "WRITE" ? "Write" : "Preview"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-[#75869b]">
          <FaCloud />
          {form.id ? activeEditingLabel : "Saved as draft"}
        </div>
      </div>

      <div className="grid gap-3 p-4 sm:grid-cols-[1fr_190px]">
        <input
          type="text"
          placeholder="Enter your article title..."
          value={form.title}
          onChange={(event) =>
            setForm((current) => ({ ...current, title: event.target.value }))
          }
          className="min-h-12 rounded-lg border border-[#e0d4bf] bg-white px-4 text-sm text-[#17120a] outline-none transition focus:border-purple-400"
        />

        <select
          value={form.category}
          onChange={(event) =>
            setForm((current) => ({ ...current, category: event.target.value }))
          }
          className="min-h-12 rounded-lg border border-[#e0d4bf] bg-white px-4 text-sm text-[#17120a] outline-none transition focus:border-purple-400"
        >
          {CATEGORY_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {CATEGORY_META[option].label}
            </option>
          ))}
        </select>
      </div>

      <EditorToolbar />

      {editorMode === "WRITE" ? (
        <div className="relative">
          <textarea
            placeholder="Start writing your amazing article here..."
            value={form.content}
            onChange={(event) =>
              setForm((current) => ({ ...current, content: event.target.value }))
            }
            maxLength={5000}
            className="min-h-[340px] w-full resize-y border-0 bg-white px-5 py-5 text-sm leading-7 text-[#17120a] outline-none"
          />
          <span className="absolute bottom-4 right-5 text-xs font-semibold text-[#75869b]">
            {form.content.length} / 5000
          </span>
        </div>
      ) : (
        <article className="min-h-[340px] whitespace-pre-wrap bg-white px-5 py-5 text-base leading-8 text-[#27344a]">
          {form.content || "Your preview will appear here as you write."}
        </article>
      )}

      <div className="flex flex-col gap-3 border-t border-[#e7dcc8] bg-[#fffdf8] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-purple-700 transition hover:bg-purple-50"
          >
            <FaImage />
            Add Cover Image
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-purple-700 transition hover:bg-purple-50"
          >
            <FaTags />
            Add Tags
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => onSave("DRAFT")}
            className="inline-flex items-center gap-2 rounded-lg border border-purple-200 bg-white px-4 py-2 text-sm font-bold text-purple-700 transition hover:bg-purple-50 disabled:opacity-60"
          >
            <FaEdit />
            {saving ? "Saving..." : form.id ? "Update Draft" : "Save Draft"}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => onSave("SUBMITTED")}
            className="inline-flex items-center gap-2 rounded-lg bg-purple-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-purple-600 disabled:opacity-60"
          >
            <FaPaperPlane />
            {saving
              ? "Submitting..."
              : form.status === "REJECTED"
              ? "Edit & Resubmit"
              : "Send to School Review"}
          </button>
          {(form.id || form.title || form.content) && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-2 rounded-lg border border-[#e0d4bf] bg-white px-4 py-2 text-sm font-bold text-[#52657d] transition hover:bg-[#f8fbff]"
            >
              <FaPlus />
              New
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

function WritingListItem({
  writing,
  onRead,
  onEdit,
  onDelete,
  onCreateRevision,
}) {
  const categoryMeta = getCategoryMeta(writing.category);
  const statusMeta = getStatusMeta(writing.status);
  const libraryMeta = getLibraryMeta(writing);
  const LibraryIcon = libraryMeta.icon;
  const canEdit = ["DRAFT", "REJECTED"].includes(writing.status);
  const canDelete =
    ["DRAFT", "REJECTED"].includes(writing.status);
  const canRevise = writing.status === "APPROVED";
  const actionLabel =
    writing.status === "APPROVED"
      ? "Read"
    : writing.status === "DRAFT"
      ? "Edit"
    : writing.status === "REJECTED"
      ? "Revise"
      : "Read";

  return (
    <article className="grid gap-4 rounded-xl border border-[#e7dcc8] bg-white p-3 shadow-sm transition hover:border-purple-200 hover:shadow-md md:grid-cols-[128px_1fr_auto]">
      <CategoryArt category={writing.category} className="h-28" />

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill status={writing.status} />
          <span
            className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${categoryMeta.chip}`}
          >
            {categoryMeta.label}
          </span>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${libraryMeta.chip}`}
          >
            <LibraryIcon />
            {libraryMeta.label}
          </span>
        </div>
        <h3 className="mt-2 line-clamp-1 text-base font-black text-[#17120a]">
          {writing.title}
        </h3>
        <p className="mt-1 line-clamp-2 text-sm leading-6 text-[#52657d]">
          {getPreview(writing.content, 160)}
        </p>
        {writing.reviewNote && (
          <p className="mt-2 line-clamp-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold leading-5 text-red-700">
            School note: {writing.reviewNote}
          </p>
        )}
        <p className="mt-2 line-clamp-2 text-xs font-semibold leading-5 text-[#52657d]">
          {getWorkflowMessage(writing)}
        </p>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-[#75869b]">
          <span>{formatShortDate(writing.updatedAt)}</span>
          <span>{getWordCount(writing.content)} words</span>
          <span>{getReadTime(writing.content)} min read</span>
          <span className={`inline-flex items-center gap-1.5 ${statusMeta.chip.split(" ").at(-1)}`}>
            <span className={`h-2 w-2 rounded-full ${statusMeta.dot}`} />
            {statusMeta.label}
          </span>
        </div>
      </div>

      <div className="flex items-start justify-end gap-2 md:min-w-32">
        {canEdit ? (
          <button
            type="button"
            onClick={() => onEdit(writing)}
            className="inline-flex items-center gap-2 rounded-lg border border-purple-200 bg-white px-3 py-2 text-sm font-bold text-purple-700 transition hover:bg-purple-50"
          >
            <FaEdit />
            {actionLabel}
          </button>
        ) : (
          <button
            type="button"
            onClick={() =>
              canRevise ? onCreateRevision(writing.id) : onRead(writing)
            }
            className="inline-flex items-center gap-2 rounded-lg border border-purple-200 bg-white px-3 py-2 text-sm font-bold text-purple-700 transition hover:bg-purple-50"
          >
            {canRevise ? <FaEdit /> : <FaBookOpen />}
            {canRevise ? "Revise" : actionLabel}
          </button>
        )}
        <button
          type="button"
          onClick={() => onRead(writing)}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#e0d4bf] text-[#52657d] transition hover:bg-[#f8fbff]"
          aria-label="Read writing"
        >
          <FaEye />
        </button>
        {canDelete ? (
          <button
            type="button"
            onClick={() => onDelete(writing)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-700 transition hover:bg-red-100"
            aria-label="Delete writing"
          >
            <FaTrash />
          </button>
        ) : (
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#e0d4bf] text-[#75869b]"
            aria-label="More options"
          >
            <FaEllipsisV />
          </button>
        )}
      </div>
    </article>
  );
}

function SidebarPanels({ counts, libraryCounts, totalWords }) {
  const tips = [
    ["Write from the heart", "Your authentic voice connects with readers.", FaHeart],
    ["Edit and reflect", "Good writing becomes clearer after revision.", FaEdit],
    ["Be original", "Share your unique perspective.", FaLightbulb],
  ];

  return (
    <aside className="space-y-5">
      <section className="rounded-xl border border-[#e7dcc8] bg-white p-4 shadow-sm">
        <h2 className="text-sm font-black text-[#17120a]">Writing Tips</h2>
        <div className="mt-4 space-y-4">
          {tips.map(([title, text, Icon]) => (
            <div key={title} className="flex gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                <Icon />
              </span>
              <div>
                <p className="text-sm font-bold text-[#17120a]">{title}</p>
                <p className="mt-1 text-xs leading-5 text-[#52657d]">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-purple-100 bg-gradient-to-br from-purple-50 to-white p-5 shadow-sm">
        <FaQuoteLeft className="text-2xl text-purple-500" />
        <p className="mt-4 text-sm font-bold leading-6 text-purple-900">
          Words have power. Use yours to inspire the world.
        </p>
        <p className="mt-3 text-xs text-purple-700">School writing studio</p>
      </section>

      <section className="rounded-xl border border-[#e7dcc8] bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <FaTrophy className="text-amber-500" />
          <h2 className="text-sm font-black text-[#17120a]">
            Your Achievements
          </h2>
        </div>
        <div className="mt-4 space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-[#52657d]">Articles Published</span>
            <strong className="text-[#17120a]">{counts.APPROVED}</strong>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#52657d]">Total Words</span>
            <strong className="text-[#17120a]">{totalWords}</strong>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#52657d]">In Review</span>
            <strong className="text-[#17120a]">{counts.SUBMITTED}</strong>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-[#e7dcc8] bg-white p-4 shadow-sm">
        <h2 className="text-sm font-black text-[#17120a]">Writing Breakdown</h2>
        <div className="mt-4 space-y-3 text-sm">
          {[
            ["Free Writing", libraryCounts.FREE, FaPenNib],
            ["School Writing", libraryCounts.SCHOOL, FaSchool],
            ["School Magazine", libraryCounts.MAGAZINE, FaBookOpen],
          ].map(([label, value, Icon]) => (
            <div key={label} className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 text-[#52657d]">
                <Icon className="text-xs text-purple-600" />
                {label}
              </span>
              <strong className="text-[#17120a]">{value}</strong>
            </div>
          ))}
        </div>
      </section>
    </aside>
  );
}

export default function StudentWritingWorkspace() {
  const { markSurfaceSeen } = useWorkIndicators();
  const [student, setStudent] = useState(null);
  const [writings, setWritings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState(buildEmptyForm());
  const [readingWriting, setReadingWriting] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [activeLibrary, setActiveLibrary] = useState("ALL");
  const [activeStatus, setActiveStatus] = useState("ALL");
  const [editorMode, setEditorMode] = useState("WRITE");

  const loadWritings = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      setError("");
      const res = await fetch("/api/student/writings", { cache: "no-store" });
      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(payload.message || "Failed to load your writing space");
      }

      setStudent(payload.student || null);
      setWritings(Array.isArray(payload.writings) ? payload.writings : []);
    } catch (loadError) {
      setError(loadError.message || "Failed to load your writing space");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void markSurfaceSeen("student.writing");
  }, [markSurfaceSeen]);

  useEffect(() => {
    void loadWritings();
  }, [loadWritings]);

  useRealtimeChannel(
    ["student-notifications", "work-indicators"],
    useCallback(() => {
      void loadWritings({ silent: true });
    }, [loadWritings])
  );

  const resetForm = useCallback(() => {
    setForm(buildEmptyForm());
    setEditorMode("WRITE");
  }, []);

  const startEdit = useCallback((writing) => {
    setReadingWriting(null);
    setSuccess("");
    setError("");
    setEditorMode("WRITE");
    setForm({
      id: writing.id,
      title: writing.title || "",
      content: writing.content || "",
      category: normalizeCategory(writing.category),
      status: writing.status || "DRAFT",
    });
  }, []);

  const handleSave = async (nextStatus = "DRAFT") => {
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const url = form.id
        ? `/api/student/writings/${form.id}`
        : "/api/student/writings";
      const method = form.id ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          content: form.content,
          category: form.category,
          status: nextStatus,
        }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload.message || "Failed to save writing");
      }

      setSuccess(payload.message || "Writing saved");
      resetForm();
      await loadWritings();
    } catch (saveError) {
      setError(saveError.message || "Failed to save writing");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setError("");
      setSuccess("");
      const res = await fetch(`/api/student/writings/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(payload.message || "Failed to delete writing");
      }

      if (form.id === deleteTarget.id) {
        resetForm();
      }
      setDeleteTarget(null);
      setSuccess(payload.message || "Writing deleted");
      await loadWritings();
    } catch (deleteError) {
      setError(deleteError.message || "Failed to delete writing");
      setDeleteTarget(null);
    }
  };

  const handleCreateRevision = async (writingId) => {
    try {
      setError("");
      setSuccess("");
      const res = await fetch(`/api/student/writings/${writingId}`, {
        method: "POST",
      });
      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(payload.message || "Failed to create revision draft");
      }

      setSuccess(payload.message || "Revision draft created");
      setReadingWriting(null);
      resetForm();
      await loadWritings();
    } catch (revisionError) {
      setError(revisionError.message || "Failed to create revision draft");
    }
  };

  const counts = useMemo(() => {
    const nextCounts = {
      ALL: writings.length,
      DRAFT: 0,
      SUBMITTED: 0,
      APPROVED: 0,
      REJECTED: 0,
    };
    writings.forEach((writing) => {
      const status = String(writing.status || "DRAFT").toUpperCase();
      nextCounts[status] = (nextCounts[status] || 0) + 1;
    });
    return nextCounts;
  }, [writings]);

  const libraryCounts = useMemo(() => {
    const nextCounts = {
      ALL: writings.length,
      FREE: 0,
      SCHOOL: 0,
      MAGAZINE: 0,
    };
    writings.forEach((writing) => {
      const bucket = getLibraryBucket(writing);
      nextCounts[bucket] = (nextCounts[bucket] || 0) + 1;
    });
    return nextCounts;
  }, [writings]);

  const filteredWritings = useMemo(
    () =>
      writings.filter((writing) => {
        const matchesLibrary =
          activeLibrary === "ALL" || getLibraryBucket(writing) === activeLibrary;
        const matchesStatus =
          activeStatus === "ALL" ||
          String(writing.status || "").toUpperCase() === activeStatus;
        return matchesLibrary && matchesStatus;
      }),
    [activeLibrary, activeStatus, writings]
  );

  const totalWords = useMemo(
    () => writings.reduce((sum, writing) => sum + getWordCount(writing.content), 0),
    [writings]
  );

  const activeEditingLabel = useMemo(() => {
    if (!form.id) return "New Draft";
    return form.status === "REJECTED" ? "Revision Draft" : "Editing Draft";
  }, [form.id, form.status]);

  return (
    <div className="space-y-5 text-[#27344a]">
      <WritingStudioHero
        student={student}
        writings={writings}
        libraryCounts={libraryCounts}
        onNewDraft={resetForm}
      />

      {error && <AlertBanner type="error" title="Action needed" message={error} />}
      {success && <AlertBanner type="success" message={success} />}

      <WritingWorkflowPanel
        libraryCounts={libraryCounts}
        onSelectLibrary={setActiveLibrary}
        onSelectStatus={setActiveStatus}
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_310px]">
        <main className="min-w-0 space-y-5">
          <WritingEditor
            form={form}
            setForm={setForm}
            editorMode={editorMode}
            setEditorMode={setEditorMode}
            activeEditingLabel={activeEditingLabel}
            saving={saving}
            onSave={handleSave}
            onReset={resetForm}
          />

          <section className="rounded-xl border border-[#e7dcc8] bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-black text-[#17120a]">
                  Writing Library
                </h2>
                <p className="mt-1 text-sm text-[#52657d]">
                  Free writing, school review work, and school magazine pieces
                  in one manageable view.
                </p>
              </div>
              <select
                value={activeStatus}
                onChange={(event) => setActiveStatus(event.target.value)}
                className="min-h-10 rounded-lg border border-[#e0d4bf] bg-white px-3 text-sm font-bold text-[#40516b] outline-none transition focus:border-purple-400"
              >
                <option value="ALL">All statuses</option>
                <option value="DRAFT">Drafts</option>
                <option value="SUBMITTED">Under Review</option>
                <option value="APPROVED">Published</option>
                <option value="REJECTED">Needs Revision</option>
              </select>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-5">
              {LIBRARY_FILTERS.map(([bucket, label]) => {
                const active = activeLibrary === bucket;
                const Icon =
                  bucket === "FREE"
                    ? FaPenNib
                    : bucket === "SCHOOL"
                    ? FaSchool
                    : bucket === "MAGAZINE"
                    ? FaBookOpen
                    : FaFileAlt;
                return (
                  <button
                    key={bucket}
                    type="button"
                    onClick={() => setActiveLibrary(bucket)}
                    className={`flex min-h-20 items-center justify-between rounded-lg border px-4 py-3 text-left transition ${
                      active
                        ? "border-purple-300 bg-purple-50 text-purple-800 shadow-sm"
                        : "border-[#e7dcc8] bg-white text-[#40516b] hover:border-purple-200"
                    }`}
                  >
                    <span>
                      <span className="block text-xs font-black uppercase">
                        {label}
                      </span>
                      <strong className="mt-1 block text-2xl font-black text-[#17120a]">
                        {libraryCounts[bucket] || 0}
                      </strong>
                    </span>
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                        active
                          ? "bg-white text-purple-700"
                          : "bg-[#f8fbff] text-[#75869b]"
                      }`}
                    >
                      <Icon />
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {[
                ["ALL", "All"],
                ["DRAFT", "Drafts"],
                ["SUBMITTED", "Under Review"],
                ["APPROVED", "Published"],
                ["REJECTED", "Needs Revision"],
              ].map(([status, label]) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setActiveStatus(status)}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                    activeStatus === status
                      ? "bg-purple-700 text-white"
                      : "bg-purple-50 text-purple-700 hover:bg-purple-100"
                  }`}
                >
                  {label} {counts[status] || 0}
                </button>
              ))}
            </div>

            {loading ? (
              <LoadingState
                title="Loading your writings"
                message="Preparing your drafts, submissions, and approved writing."
                className="mt-6"
              />
            ) : writings.length === 0 ? (
              <div className="mt-6">
                <EmptyState
                  icon={FaFileAlt}
                  title="No writing yet"
                  description="Start your first draft or respond to a platform prompt when one is available."
                />
              </div>
            ) : filteredWritings.length === 0 ? (
              <div className="mt-6">
                <EmptyState
                  icon={FaFileAlt}
                  title="Nothing in this status"
                  description="Choose another category or status to see more writing."
                />
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {filteredWritings.map((writing) => (
                  <WritingListItem
                    key={writing.id}
                    writing={writing}
                    onRead={setReadingWriting}
                    onEdit={startEdit}
                    onDelete={setDeleteTarget}
                    onCreateRevision={handleCreateRevision}
                  />
                ))}
              </div>
            )}
          </section>
        </main>

        <SidebarPanels
          counts={counts}
          libraryCounts={libraryCounts}
          totalWords={totalWords}
        />
      </div>

      {readingWriting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#17120a]/70 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-[#d7cdbb] bg-white shadow-2xl">
            <div className="grid gap-5 p-5 md:p-8 xl:grid-cols-[1fr_0.48fr]">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill status={readingWriting.status} />
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${
                      getCategoryMeta(readingWriting.category).chip
                    }`}
                  >
                    {getCategoryMeta(readingWriting.category).label}
                  </span>
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${
                      getLibraryMeta(readingWriting).chip
                    }`}
                  >
                    {getLibraryMeta(readingWriting).label}
                  </span>
                </div>
                <h2 className="mt-4 text-3xl font-black leading-tight text-[#17120a] md:text-4xl">
                  {readingWriting.title}
                </h2>
                <p className="mt-3 max-w-2xl rounded-lg border border-[#e7dcc8] bg-[#fffdf8] px-4 py-3 text-sm font-semibold leading-6 text-[#52657d]">
                  {getWorkflowMessage(readingWriting)}
                </p>
                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm font-semibold text-[#52657d]">
                  <span className="inline-flex items-center gap-1.5">
                    <FaCalendarAlt />
                    Updated {formatDate(readingWriting.updatedAt)}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <FaClock />
                    {getReadTime(readingWriting.content)} min read
                  </span>
                </div>
              </div>

              <div className="flex items-start justify-between gap-3">
                <CategoryArt category={readingWriting.category} className="h-32 flex-1" />
                <button
                  type="button"
                  onClick={() => setReadingWriting(null)}
                  aria-label="Close writing reader"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#d7cdbb] bg-white text-[#0a2f66] transition hover:bg-[#f8fbff]"
                >
                  <FaTimes />
                </button>
              </div>
            </div>

            {readingWriting.reviewNote && (
              <div className="mx-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700 md:mx-8">
                <span className="font-bold">School note:</span>{" "}
                {readingWriting.reviewNote}
              </div>
            )}

            <article className="mx-5 mb-8 mt-5 whitespace-pre-wrap rounded-xl border border-[#d7cdbb] bg-[#fffdf8] p-5 text-base leading-8 text-[#27344a] md:mx-8 md:p-7 md:text-lg">
              {readingWriting.content}
            </article>

            <div className="flex flex-wrap gap-3 border-t border-[#d7cdbb] bg-[#f8fbff] px-5 py-4 md:px-8">
              {["DRAFT", "REJECTED", "SUBMITTED"].includes(
                readingWriting.status
              ) && (
                <button
                  type="button"
                  onClick={() => startEdit(readingWriting)}
                  className="inline-flex items-center gap-2 rounded-lg bg-purple-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-purple-600"
                >
                  <FaEdit />
                  Edit
                </button>
              )}
              {readingWriting.status === "APPROVED" && (
                <button
                  type="button"
                  onClick={() => handleCreateRevision(readingWriting.id)}
                  className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-800 transition hover:bg-emerald-100"
                >
                  <FaEdit />
                  Revise as Draft
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this writing?"
        message={
          deleteTarget
            ? `"${deleteTarget.title}" will be removed from your writing list.`
            : ""
        }
        confirmLabel="Delete writing"
        tone="danger"
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
