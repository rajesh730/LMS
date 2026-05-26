"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FaBold,
  FaBookOpen,
  FaBookmark,
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

const CATEGORY_META = {
  ESSAY: {
    label: "Essay",
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
  REPORT: {
    label: "Report",
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
  STORY: {
    label: "Story",
    icon: FaBookmark,
    accent: "text-rose-700",
    chip: "border-rose-200 bg-rose-50 text-rose-700",
    art: "from-rose-100 via-white to-orange-100",
  },
  OTHER: {
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

const CATEGORY_OPTIONS = Object.keys(CATEGORY_META);

function normalizeCategory(value) {
  const category = String(value || "OTHER").toUpperCase();
  return CATEGORY_META[category] ? category : "OTHER";
}

function getCategoryMeta(value) {
  return CATEGORY_META[normalizeCategory(value)];
}

function getStatusMeta(value) {
  return STATUS_META[String(value || "DRAFT").toUpperCase()] || STATUS_META.DRAFT;
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
    category: "ESSAY",
    status: "DRAFT",
    challengeId: "",
    challengeTitle: "",
    challengePrompt: "",
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

function WritingStudioHero({ student, writings, counts, totalWords, onNewDraft }) {
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
            draft, a school magazine article, or a platform challenge response.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              [FaFileAlt, writings.length, "Writings", "purple"],
              [FaRegFileAlt, counts.DRAFT, "Drafts", "pink"],
              [FaPaperPlane, counts.SUBMITTED, "Review", "amber"],
              [FaEye, totalWords, "Words", "emerald"],
            ].map(([Icon, value, label, tone]) => {
              const tones = {
                purple: "border-purple-100 bg-purple-50 text-purple-700",
                pink: "border-pink-100 bg-pink-50 text-pink-700",
                amber: "border-amber-100 bg-amber-50 text-amber-700",
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

function ChallengeStrip({ challenges, loading, onRespond }) {
  if (loading) {
    return (
      <LoadingState
        title="Loading challenges"
        message="Preparing active platform writing topics."
      />
    );
  }

  if (challenges.length === 0) {
    return (
      <section className="rounded-xl border border-[#e7dcc8] bg-white p-5 shadow-sm">
        <EmptyState
          icon={FaLightbulb}
          title="No active challenges"
          description="Platform writing topics will appear here when super admin publishes a new challenge."
        />
      </section>
    );
  }

  return (
    <section className="space-y-3">
      {challenges.map((challenge) => (
        <article
          key={challenge.id}
          className="flex flex-col gap-4 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 via-white to-rose-50 p-4 shadow-sm md:flex-row md:items-center md:justify-between"
        >
          <div className="flex min-w-0 items-start gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-amber-400 text-white shadow-sm">
              <FaTrophy className="text-xl" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase text-amber-700">
                Active Challenge
              </p>
              <h2 className="mt-1 line-clamp-1 text-base font-black text-[#17120a]">
                {challenge.title}
              </h2>
              <p className="mt-1 line-clamp-2 text-sm leading-6 text-[#52657d]">
                {challenge.prompt}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 md:justify-end">
            {challenge.deadline && (
              <div className="rounded-lg border-l border-amber-200 px-4 text-sm">
                <p className="text-xs font-semibold text-[#52657d]">
                  Submit before
                </p>
                <p className="font-black text-red-600">
                  {formatShortDate(challenge.deadline)}
                </p>
              </div>
            )}
            {challenge.response ? (
              <StatusPill status={challenge.response.status} />
            ) : (
              <button
                type="button"
                onClick={() => onRespond(challenge)}
                className="inline-flex items-center gap-2 rounded-lg border border-purple-200 bg-white px-4 py-2 text-sm font-bold text-purple-700 transition hover:bg-purple-50"
              >
                View Details
              </button>
            )}
          </div>
        </article>
      ))}
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

        {!form.challengeId ? (
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
        ) : (
          <div className="flex min-h-12 items-center rounded-lg border border-purple-200 bg-purple-50 px-4 text-sm font-bold text-purple-700">
            Challenge
          </div>
        )}
      </div>

      {form.challengeId && (
        <div className="mx-4 mb-4 rounded-lg border border-purple-200 bg-purple-50 p-4 text-sm text-purple-800">
          <p className="font-bold">Challenge response: {form.challengeTitle}</p>
          {form.challengePrompt && (
            <p className="mt-2 line-clamp-3 whitespace-pre-wrap leading-6 text-[#40516b]">
              {form.challengePrompt}
            </p>
          )}
        </div>
      )}

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
          {!form.challengeId && (
            <button
              type="button"
              disabled={saving}
              onClick={() => onSave("DRAFT")}
              className="inline-flex items-center gap-2 rounded-lg border border-purple-200 bg-white px-4 py-2 text-sm font-bold text-purple-700 transition hover:bg-purple-50 disabled:opacity-60"
            >
              <FaEdit />
              {saving ? "Saving..." : form.id ? "Update Draft" : "Save Draft"}
            </button>
          )}
          <button
            type="button"
            disabled={saving}
            onClick={() => onSave("SUBMITTED")}
            className="inline-flex items-center gap-2 rounded-lg bg-purple-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-purple-600 disabled:opacity-60"
          >
            <FaPaperPlane />
            {saving
              ? "Submitting..."
              : form.challengeId
              ? "Submit Response"
              : form.status === "REJECTED"
              ? "Edit & Resubmit"
              : "Submit for Review"}
          </button>
          {(form.id || form.title || form.content || form.challengeId) && (
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
  const canEdit = ["DRAFT", "REJECTED", "SUBMITTED"].includes(writing.status);
  const canDelete = ["DRAFT", "REJECTED"].includes(writing.status);
  const canRevise = writing.status === "APPROVED";
  const actionLabel =
    writing.status === "APPROVED"
      ? "Read"
      : writing.status === "DRAFT"
      ? "Edit"
      : writing.status === "REJECTED"
      ? "Revise"
      : "Continue";

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
        </div>
        <h3 className="mt-2 line-clamp-1 text-base font-black text-[#17120a]">
          {writing.title}
        </h3>
        <p className="mt-1 line-clamp-2 text-sm leading-6 text-[#52657d]">
          {getPreview(writing.content, 160)}
        </p>
        {writing.submissionSource === "PLATFORM_CHALLENGE" && (
          <p className="mt-1 text-xs font-bold text-purple-700">
            Challenge: {writing.challengeTitle || "Student Challenge"}
          </p>
        )}
        {writing.reviewNote && (
          <p className="mt-2 line-clamp-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold leading-5 text-red-700">
            School note: {writing.reviewNote}
          </p>
        )}
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

function SidebarPanels({ counts, totalWords }) {
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
    </aside>
  );
}

export default function StudentWritingWorkspace() {
  const { markSurfaceSeen } = useWorkIndicators();
  const [student, setStudent] = useState(null);
  const [writings, setWritings] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [challengesLoading, setChallengesLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState(buildEmptyForm());
  const [readingWriting, setReadingWriting] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
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

  const loadChallenges = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) setChallengesLoading(true);
      const res = await fetch("/api/student/challenges", { cache: "no-store" });
      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(payload.message || "Failed to load student challenges");
      }

      setChallenges(Array.isArray(payload.challenges) ? payload.challenges : []);
    } catch (loadError) {
      setError(loadError.message || "Failed to load student challenges");
    } finally {
      if (!silent) setChallengesLoading(false);
    }
  }, []);

  useEffect(() => {
    void markSurfaceSeen("student.writing");
  }, [markSurfaceSeen]);

  useEffect(() => {
    void loadWritings();
    void loadChallenges();
  }, [loadChallenges, loadWritings]);

  useRealtimeChannel(
    ["student-notifications", "work-indicators"],
    useCallback(() => {
      void loadWritings({ silent: true });
      void loadChallenges({ silent: true });
    }, [loadChallenges, loadWritings])
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
      category: writing.category || "ESSAY",
      status: writing.status || "DRAFT",
      challengeId: writing.challenge || "",
      challengeTitle: writing.challengeTitle || "",
      challengePrompt: "",
    });
  }, []);

  const startChallengeResponse = useCallback(
    (challenge) => {
      setSuccess("");
      setError("");
      setEditorMode("WRITE");

      if (challenge.response?.id) {
        const existingWriting = writings.find(
          (writing) => writing.id === challenge.response.id
        );
        if (existingWriting) {
          startEdit(existingWriting);
          return;
        }
      }

      setForm({
        ...buildEmptyForm(),
        title: challenge.title,
        category: "ESSAY",
        challengeId: challenge.id,
        challengeTitle: challenge.title,
        challengePrompt: challenge.prompt,
      });
    },
    [startEdit, writings]
  );

  const handleSave = async (nextStatus = "DRAFT") => {
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      if (form.challengeId) {
        if (nextStatus !== "SUBMITTED") {
          setError("Challenge responses are submitted directly to platform review.");
          return;
        }

        const res = await fetch("/api/student/challenge-submissions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            challengeId: form.challengeId,
            title: form.title,
            content: form.content,
            category: form.category,
          }),
        });

        const payload = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(payload.message || "Failed to submit challenge response");
        }

        setSuccess(payload.message || "Challenge response submitted");
        resetForm();
        await loadChallenges();
        return;
      }

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
          challengeId: form.challengeId,
        }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload.message || "Failed to save writing");
      }

      setSuccess(payload.message || "Writing saved");
      resetForm();
      await loadWritings();
      await loadChallenges();
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

  const filteredWritings = useMemo(
    () =>
      activeStatus === "ALL"
        ? writings
        : writings.filter(
            (writing) => String(writing.status || "").toUpperCase() === activeStatus
          ),
    [activeStatus, writings]
  );

  const totalWords = useMemo(
    () => writings.reduce((sum, writing) => sum + getWordCount(writing.content), 0),
    [writings]
  );

  const activeEditingLabel = useMemo(() => {
    if (form.challengeId) return "Challenge Response";
    if (!form.id) return "New Draft";
    return form.status === "REJECTED" ? "Revision Draft" : "Editing Draft";
  }, [form.challengeId, form.id, form.status]);

  return (
    <div className="space-y-5 text-[#27344a]">
      <WritingStudioHero
        student={student}
        writings={writings}
        counts={counts}
        totalWords={totalWords}
        onNewDraft={resetForm}
      />

      {error && <AlertBanner type="error" title="Action needed" message={error} />}
      {success && <AlertBanner type="success" message={success} />}

      <ChallengeStrip
        challenges={challenges}
        loading={challengesLoading}
        onRespond={startChallengeResponse}
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
                  My Writings
                </h2>
                <p className="mt-1 text-sm text-[#52657d]">
                  Drafts, school review items, published pieces, and revisions.
                </p>
              </div>
              <select
                value={activeStatus}
                onChange={(event) => setActiveStatus(event.target.value)}
                className="min-h-10 rounded-lg border border-[#e0d4bf] bg-white px-3 text-sm font-bold text-[#40516b] outline-none transition focus:border-purple-400"
              >
                <option value="ALL">Sort: Latest</option>
                <option value="DRAFT">Drafts</option>
                <option value="SUBMITTED">Under Review</option>
                <option value="APPROVED">Published</option>
                <option value="REJECTED">Needs Revision</option>
              </select>
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
                  description="Start your first draft or respond to a platform challenge when one is available."
                />
              </div>
            ) : filteredWritings.length === 0 ? (
              <div className="mt-6">
                <EmptyState
                  icon={FaFileAlt}
                  title="Nothing in this status"
                  description="Choose another status to see more writing."
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

        <SidebarPanels counts={counts} totalWords={totalWords} />
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
                </div>
                <h2 className="mt-4 text-3xl font-black leading-tight text-[#17120a] md:text-4xl">
                  {readingWriting.title}
                </h2>
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
