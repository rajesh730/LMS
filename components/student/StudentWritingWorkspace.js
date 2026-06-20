"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FaArrowLeft,
  FaArrowRight,
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
  FaLock,
  FaPaperPlane,
  FaPenNib,
  FaPlus,
  FaRegFileAlt,
  FaSchool,
  FaStar,
  FaTags,
  FaTimes,
  FaTrash,
  FaTrophy,
} from "react-icons/fa";
import EmptyState from "@/components/EmptyState";
import Modal from "@/components/Modal";
import StudentQuickNav from "@/components/student/StudentQuickNav";
import AlertBanner from "@/components/ui/AlertBanner";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import LoadingState from "@/components/ui/LoadingState";
import WritingContent from "@/components/WritingContent";
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
    label: "Posted to School",
    chip: "border-amber-200 bg-amber-50 text-amber-800",
    dot: "bg-amber-500",
    icon: FaPaperPlane,
  },
  APPROVED: {
    label: "Selected",
    chip: "border-emerald-200 bg-emerald-50 text-emerald-800",
    dot: "bg-emerald-500",
    icon: FaCheckCircle,
  },
  REJECTED: {
    label: "Private",
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
    return "Private writing. Keep editing, then post it to your school when it is ready.";
  }

  if (status === "SUBMITTED") {
    return "Posted to your school. Your school can keep it on the school wall or select it for the magazine/homepage.";
  }

  if (status === "APPROVED") {
    return "Selected by your school for the magazine or homepage.";
  }

  if (status === "REJECTED") {
    return "Private writing. Keep editing, then post it to school when it is ready.";
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
      className={`pravyo-brand-panel relative overflow-hidden rounded-lg border ${className}`}
    >
      <div className="absolute left-6 top-5 h-16 w-24 rotate-[-8deg] rounded-md border border-white/80 bg-white/75 shadow-sm" />
      <div className="absolute left-16 top-9 h-16 w-24 rotate-[8deg] rounded-md border border-white/80 bg-white/75 shadow-sm" />
      <div className="absolute bottom-7 right-8 h-1 w-28 rotate-[-18deg] rounded-full bg-white/35" />
      <div className="absolute bottom-11 right-12 h-1 w-20 rotate-[-18deg] rounded-full bg-white/35" />
      <Icon className="absolute right-6 top-6 text-4xl text-white/82" />
      <FaPenNib className="absolute bottom-6 left-7 text-2xl text-white/72" />
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
          <p className="mobile-accessory-info text-xs font-black uppercase text-purple-700 sm:block">
            Creative Writing Studio
          </p>
          <h1 className="mobile-accessory-info mt-4 max-w-2xl text-4xl font-black leading-tight text-[#17120a] sm:block md:text-5xl">
            Share your voice.{" "}
            <span className="text-pink-600">Inspire your school.</span>
          </h1>
          <p className="mobile-accessory-info mt-4 max-w-xl text-sm leading-6 text-[#52657d] sm:block md:text-base">
            Express your ideas, stories, and creativity. Your words can become a
            draft, a school magazine article, or a platform prompt response.
          </p>

          <div className="mobile-accessory-info mt-6 grid gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-4">
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

        <div className="mobile-accessory-info pravyo-brand-surface relative min-h-72 overflow-hidden rounded-2xl p-6 sm:block">
          <div className="absolute right-12 top-16 h-32 w-52 rotate-[-6deg] rounded-lg border border-[#d7cdbb] bg-white/80 shadow-xl" />
          <div className="absolute right-24 top-24 h-32 w-52 rotate-[7deg] rounded-lg border border-[#d7cdbb] bg-white/85 shadow-xl" />
          <FaPenNib className="absolute right-12 top-10 text-5xl text-white/78" />
          <FaBookOpen className="absolute bottom-11 left-10 text-6xl text-white/72" />
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
        className="student-writing-new-button mx-5 mb-5 inline-flex items-center gap-2 rounded-lg bg-purple-700 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-purple-600 sm:absolute sm:right-5 sm:top-5 sm:m-0"
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
      next: "See private drafts, school wall posts, magazine pieces, and homepage selections together.",
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
      next: "Private writing stays here until the student posts it to school.",
      action: () => {
        onSelectLibrary("FREE");
        onSelectStatus("DRAFT");
      },
    },
    {
      id: "SCHOOL",
      title: "School Wall",
      count: libraryCounts.SCHOOL,
      icon: FaSchool,
      tone: "border-indigo-100 bg-indigo-50 text-indigo-800",
      next: "Posted writing appears for school sharing unless the school hides it.",
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
      next: "School-selected writing becomes part of the weekly magazine.",
      action: () => {
        onSelectLibrary("MAGAZINE");
        onSelectStatus("APPROVED");
      },
    },
  ];

  return (
    <section className="writing-workflow-panel rounded-xl border border-[#e7dcc8] bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-black text-[#17120a]">Writing Workflow</h2>
          <p className="mt-1 text-sm leading-6 text-[#52657d]">
            Draft freely, post writing to your school, and see selected pieces
            in the school magazine or homepage.
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

function EditorToolbar({ onFormat }) {
  const tools = [
    ["bold", FaBold, "Bold"],
    ["italic", FaItalic, "Italic"],
    ["highlight", FaStar, "Highlight"],
  ];

  return (
    <div className="flex flex-wrap items-center gap-3 border-y border-[#d8dfea] bg-[#f8fafc] px-3 py-2">
      <span className="text-xs font-black uppercase tracking-[0.12em] text-[#475569]">
        Format
      </span>
      <div className="flex flex-wrap items-center gap-2">
        {tools.map(([command, Icon, label]) => (
          <button
            key={command}
            type="button"
            onMouseDown={(event) => {
              event.preventDefault();
              onFormat(command);
            }}
            className="inline-flex h-10 min-w-10 items-center justify-center gap-2 rounded-lg border border-[#c9d3e5] bg-white px-3 text-sm font-black text-[#3120c9] transition hover:border-[#4326e8] hover:bg-[#f4f1ff]"
            aria-label={label}
            title={label}
          >
            <Icon className="text-sm" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function InlineFormattedText({ text }) {
  const pattern =
    /(\{\{highlight\}\}.*?\{\{\/highlight\}\}|\*\*[^*]+\*\*|_[^_]+_)/g;
  const parts = String(text || "").split(pattern).filter(Boolean);

  return parts.map((part, index) => {
    const highlight = part.match(/^\{\{highlight\}\}(.*)\{\{\/highlight\}\}$/);
    if (highlight) {
      return (
        <mark
          key={`${part}-${index}`}
          className="rounded bg-[#fff1a6] px-1 font-semibold text-[#111827]"
        >
          {highlight[1]}
        </mark>
      );
    }

    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={`${part}-${index}`}>{part.slice(2, -2)}</strong>;
    }

    if (part.startsWith("_") && part.endsWith("_")) {
      return <em key={`${part}-${index}`}>{part.slice(1, -1)}</em>;
    }

    return <span key={`${part}-${index}`}>{part}</span>;
  });
}

function renderFormattedContent(content) {
  const lines = String(content || "").split("\n");
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (!line.trim()) {
      blocks.push(<div key={`space-${index}`} className="h-3" />);
      index += 1;
      continue;
    }

    if (/^\s*-\s+/.test(line)) {
      const items = [];
      while (index < lines.length && /^\s*-\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\s*-\s+/, ""));
        index += 1;
      }
      blocks.push(
        <ul key={`ul-${index}`} className="list-disc space-y-2 pl-6">
          {items.map((item, itemIndex) => (
            <li key={`${item}-${itemIndex}`}>
              <InlineFormattedText text={item} />
            </li>
          ))}
        </ul>
      );
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items = [];
      while (index < lines.length && /^\s*\d+\.\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\s*\d+\.\s+/, ""));
        index += 1;
      }
      blocks.push(
        <ol key={`ol-${index}`} className="list-decimal space-y-2 pl-6">
          {items.map((item, itemIndex) => (
            <li key={`${item}-${itemIndex}`}>
              <InlineFormattedText text={item} />
            </li>
          ))}
        </ol>
      );
      continue;
    }

    if (/^\s*>\s?/.test(line)) {
      const quotes = [];
      while (index < lines.length && /^\s*>\s?/.test(lines[index])) {
        quotes.push(lines[index].replace(/^\s*>\s?/, ""));
        index += 1;
      }
      blocks.push(
        <blockquote
          key={`quote-${index}`}
          className="border-l-4 border-purple-200 bg-purple-50/60 px-4 py-3 font-semibold text-[#40516b]"
        >
          {quotes.map((quote, quoteIndex) => (
            <p key={`${quote}-${quoteIndex}`}>
              <InlineFormattedText text={quote} />
            </p>
          ))}
        </blockquote>
      );
      continue;
    }

    blocks.push(
      <p key={`p-${index}`}>
        <InlineFormattedText text={line} />
      </p>
    );
    index += 1;
  }

  return <div className="space-y-3">{blocks}</div>;
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
  resetLabel = "New",
}) {
  const textareaRef = useRef(null);

  const applyFormat = useCallback(
    (command) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart || 0;
      const end = textarea.selectionEnd || 0;
      const before = form.content.slice(0, start);
      const selected = form.content.slice(start, end);
      const after = form.content.slice(end);
      const fallback = selected || "text";
      let replacement = fallback;

      if (command === "bold") replacement = `**${fallback}**`;
      if (command === "italic") replacement = `_${fallback}_`;
      if (command === "highlight") {
        replacement = `{{highlight}}${fallback}{{/highlight}}`;
      }

      const nextContent = `${before}${replacement}${after}`;
      setForm((current) => ({ ...current, content: nextContent }));

      window.requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(start, start + replacement.length);
      });
    },
    [form.content, setForm]
  );

  return (
    <section className="student-writing-editor overflow-hidden rounded-xl border border-[#e7dcc8] bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-[#e7dcc8] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="student-writing-mode-tabs flex items-center gap-2">
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

      <div className="student-writing-format-tools">
        <EditorToolbar onFormat={applyFormat} />
      </div>

      {editorMode === "WRITE" ? (
        <div className="relative">
          <textarea
            ref={textareaRef}
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
        <article className="min-h-[340px] bg-white px-5 py-5 text-base leading-8 text-[#27344a]">
          {form.content
            ? renderFormattedContent(form.content)
            : "Your preview will appear here as you write."}
        </article>
      )}

      <div className="student-writing-actions flex flex-col gap-3 border-t border-[#e7dcc8] bg-[#fffdf8] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="student-writing-extra-actions flex flex-wrap gap-2">
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

        <div className="student-writing-save-actions flex flex-wrap gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => onSave("DRAFT")}
            className="inline-flex items-center gap-2 rounded-lg border border-purple-200 bg-white px-4 py-2 text-sm font-bold text-purple-700 transition hover:bg-purple-50 disabled:opacity-60"
          >
            <FaEdit />
            {saving ? "Saving..." : form.id ? "Update Private" : "Save Private"}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => onSave("SUBMITTED")}
            className="inline-flex items-center gap-2 rounded-lg bg-purple-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-purple-600 disabled:opacity-60"
          >
            <FaPaperPlane />
            {saving
              ? "Posting..."
              : "Post to School"}
          </button>
          {(form.id || form.title || form.content) && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-2 rounded-lg border border-[#e0d4bf] bg-white px-4 py-2 text-sm font-bold text-[#52657d] transition hover:bg-[#f8fbff]"
            >
              {resetLabel === "Cancel" ? <FaTimes /> : <FaPlus />}
              {resetLabel}
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
  onStatusAction,
  onDelete,
}) {
  const categoryMeta = getCategoryMeta(writing.category);
  const statusMeta = getStatusMeta(writing.status);
  const libraryMeta = getLibraryMeta(writing);
  const LibraryIcon = libraryMeta.icon;
  const [menuOpen, setMenuOpen] = useState(false);
  const status = String(writing.status || "DRAFT").toUpperCase();
  const isPrivate = status === "DRAFT" || status === "REJECTED";
  const primaryStatusAction = isPrivate
    ? {
        label: "Send to school",
        icon: FaPaperPlane,
        action: "SUBMITTED",
      }
    : {
        label: "Make private",
        icon: FaLock,
        action: "MAKE_PRIVATE",
      };
  const PrimaryStatusIcon = primaryStatusAction.icon;

  const runMenuAction = (callback) => {
    setMenuOpen(false);
    callback();
  };

  return (
    <article className="student-writing-list-item grid gap-4 rounded-xl border border-[#e7dcc8] bg-white p-3 shadow-sm transition hover:border-purple-200 hover:shadow-md md:grid-cols-[128px_1fr]">
      <CategoryArt category={writing.category} className="h-28" />

      <div className="min-w-0">
        <div className="flex items-start justify-between gap-2">
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
          <div className="student-writing-action-menu relative shrink-0">
            <button
              type="button"
              onClick={() => setMenuOpen((current) => !current)}
              onBlur={(event) => {
                if (!event.currentTarget.parentElement?.contains(event.relatedTarget)) {
                  setMenuOpen(false);
                }
              }}
              className="student-writing-menu-button flex h-9 w-9 items-center justify-center rounded-lg border border-[#d8e0f0] bg-white text-[#52657d] transition hover:bg-[#f8fbff]"
              aria-label="Writing options"
              aria-expanded={menuOpen}
            >
              <FaEllipsisV />
            </button>
            {menuOpen && (
              <div
                className="student-writing-menu absolute right-0 top-10 z-20 w-44 overflow-hidden rounded-lg border border-[#d8e0f0] bg-white py-1 text-sm font-bold text-[#27344a] shadow-lg"
                onMouseDown={(event) => event.preventDefault()}
              >
                <button
                  type="button"
                  onClick={() => runMenuAction(() => onRead(writing))}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-[#f8fbff]"
                >
                  <FaEye className="text-[#1f4e79]" />
                  Open
                </button>
                <button
                  type="button"
                  onClick={() => runMenuAction(() => onEdit(writing))}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-[#f8fbff]"
                >
                  <FaEdit className="text-[#1f4e79]" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() =>
                    runMenuAction(() =>
                      onStatusAction(writing, primaryStatusAction.action)
                    )
                  }
                  className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-[#f8fbff]"
                >
                  <PrimaryStatusIcon className="text-[#1f4e79]" />
                  {primaryStatusAction.label}
                </button>
                <button
                  type="button"
                  onClick={() => runMenuAction(() => onDelete(writing))}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-red-700 hover:bg-red-50"
                >
                  <FaTrash />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
        <h3 className="mt-2 line-clamp-1 text-base font-black text-[#17120a]">
          {writing.title}
        </h3>
        <p className="mt-1 line-clamp-2 text-sm leading-6 text-[#52657d]">
          {getPreview(writing.content, 160)}
        </p>
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
        <button
          type="button"
          onClick={() => onRead(writing)}
          className="student-writing-read-more mt-3 inline-flex items-center gap-2 text-sm font-black text-[#4326e8]"
        >
          Read More
          <FaArrowRight />
        </button>
      </div>
    </article>
  );
}

function SidebarPanels({ counts, libraryCounts, totalWords }) {
  const tips = [
    ["Write from the heart", "Your authentic voice connects with readers.", FaHeart],
    ["Edit and polish", "Good writing becomes clearer when you revisit it.", FaEdit],
    ["Be original", "Share your unique perspective.", FaLightbulb],
  ];

  return (
    <aside className="student-writing-sidebar space-y-5">
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

      <section className="rounded-xl border border-[#d8dfea] bg-white p-5 text-[#111827] shadow-sm">
        <FaLightbulb className="text-2xl text-[#3120c9]" />
        <p className="mt-4 text-sm font-bold leading-6 text-[#111827]">
          Words have power. Use yours to inspire the world.
        </p>
        <p className="mt-3 text-xs font-semibold text-[#475569]">
          School writing studio
        </p>
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
            <span className="text-[#52657d]">Selected Pieces</span>
            <strong className="text-[#17120a]">{counts.APPROVED}</strong>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#52657d]">Total Words</span>
            <strong className="text-[#17120a]">{totalWords}</strong>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#52657d]">School Wall Posts</span>
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
  useWorkIndicators();
  const [student, setStudent] = useState(null);
  const [writings, setWritings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState(buildEmptyForm());
  const [editForm, setEditForm] = useState(buildEmptyForm());
  const [readingWriting, setReadingWriting] = useState(null);
  const [editingWriting, setEditingWriting] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [activeLibrary, setActiveLibrary] = useState("ALL");
  const [activeStatus, setActiveStatus] = useState("ALL");
  const [editorMode, setEditorMode] = useState("WRITE");
  const [editEditorMode, setEditEditorMode] = useState("WRITE");

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
    setEditEditorMode("WRITE");
    setEditingWriting(writing);
    setEditForm({
      id: writing.id,
      title: writing.title || "",
      content: writing.content || "",
      category: normalizeCategory(writing.category),
      status: writing.status || "DRAFT",
    });
  }, []);

  const closeEditDialog = useCallback(() => {
    setEditingWriting(null);
    setEditForm(buildEmptyForm());
    setEditEditorMode("WRITE");
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

  const handleEditSave = async (nextStatus = "DRAFT") => {
    if (!editForm.id) return;

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const res = await fetch(`/api/student/writings/${editForm.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editForm.title,
          content: editForm.content,
          category: editForm.category,
          status: nextStatus,
        }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload.message || "Failed to save writing");
      }

      setSuccess(payload.message || "Writing saved");
      closeEditDialog();
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
      if (editForm.id === deleteTarget.id) {
        closeEditDialog();
      }
      setDeleteTarget(null);
      setSuccess(payload.message || "Writing deleted");
      await loadWritings();
    } catch (deleteError) {
      setError(deleteError.message || "Failed to delete writing");
      setDeleteTarget(null);
    }
  };

  const handleStatusAction = async (writing, action) => {
    try {
      setError("");
      setSuccess("");

      const isMakePrivate = action === "MAKE_PRIVATE";
      const res = await fetch(`/api/student/writings/${writing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isMakePrivate
            ? { action: "MAKE_PRIVATE" }
            : {
                title: writing.title,
                content: writing.content,
                category: writing.category,
                status: action,
              }
        ),
      });
      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(payload.message || "Failed to update writing");
      }

      if (isMakePrivate && form.id === writing.id) {
        resetForm();
      }
      if (isMakePrivate && editForm.id === writing.id) {
        closeEditDialog();
      }

      setSuccess(payload.message || "Writing updated");
      await loadWritings();
    } catch (actionError) {
      setError(actionError.message || "Failed to update writing");
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
    return "Editing Draft";
  }, [form.id]);

  return (
    <div className="student-writing-mobile-shell space-y-5 text-[#27344a]">
      <StudentQuickNav className="sm:hidden" />
      <div className="student-writing-hero-wrap">
        <WritingStudioHero
          student={student}
          writings={writings}
          libraryCounts={libraryCounts}
          onNewDraft={resetForm}
        />
      </div>

      {error && <AlertBanner type="error" title="Action needed" message={error} />}
      {success && <AlertBanner type="success" message={success} />}

      <WritingWorkflowPanel
        libraryCounts={libraryCounts}
        onSelectLibrary={setActiveLibrary}
        onSelectStatus={setActiveStatus}
      />

      <div className="student-writing-content-grid grid gap-5 xl:grid-cols-[1fr_310px]">
        <main className="student-writing-content-main min-w-0 space-y-5">
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

          <section className="student-writing-library rounded-xl border border-[#e7dcc8] bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-black text-[#17120a]">
                  Writing Library
                </h2>
                <p className="mt-1 text-sm text-[#52657d]">
                  Free writing, school wall posts, and school magazine pieces
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
                <option value="SUBMITTED">Posted to School</option>
                <option value="APPROVED">Selected</option>
                <option value="REJECTED">Private</option>
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

            <div className="student-writing-status-chips mt-4 flex flex-wrap gap-2">
              {[
                ["ALL", "All"],
                ["DRAFT", "Drafts"],
                ["SUBMITTED", "Posted"],
                ["APPROVED", "Selected"],
                ["REJECTED", "Private"],
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
                message="Preparing your private drafts, school wall posts, and selected writing."
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
                    onStatusAction={handleStatusAction}
                    onDelete={setDeleteTarget}
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
          <div className="student-writing-reader-modal max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-[#d7cdbb] bg-white shadow-2xl">
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

              <div className="student-writing-reader-art flex items-start justify-between gap-3">
                <CategoryArt category={readingWriting.category} className="h-32 flex-1" />
              </div>
            </div>

            <article className="mx-5 mb-8 mt-5 rounded-xl border border-[#d7cdbb] bg-[#fffdf8] p-5 md:mx-8 md:p-7">
              <WritingContent
                content={readingWriting.content}
                className="text-base leading-7 text-[#27344a] md:text-lg"
              />
            </article>

            <div className="flex flex-wrap gap-3 border-t border-[#d7cdbb] bg-[#f8fbff] px-5 py-4 md:px-8">
              <button
                type="button"
                onClick={() => setReadingWriting(null)}
                className="inline-flex items-center gap-2 rounded-lg border border-[#d7cdbb] bg-white px-4 py-2 text-sm font-bold text-[#0a2f66] transition hover:bg-[#f8fbff]"
              >
                <FaArrowLeft />
                Back to writing
              </button>
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
            </div>
          </div>
        </div>
      )}

      <Modal
        isOpen={Boolean(editingWriting)}
        onClose={closeEditDialog}
        title="Edit writing"
        panelClassName="student-writing-edit-panel"
        headerClassName="student-writing-edit-header"
        titleClassName="student-writing-edit-title"
        bodyClassName="student-writing-edit-body"
      >
        <div className="student-writing-edit-dialog">
          <WritingEditor
            form={editForm}
            setForm={setEditForm}
            editorMode={editEditorMode}
            setEditorMode={setEditEditorMode}
            activeEditingLabel="Editing writing"
            saving={saving}
            onSave={handleEditSave}
            onReset={closeEditDialog}
            resetLabel="Cancel"
          />
        </div>
      </Modal>

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
