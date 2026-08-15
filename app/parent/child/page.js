"use client";

import { useState } from "react";
import Link from "next/link";
import { FaCheckCircle, FaExternalLinkAlt } from "react-icons/fa";
import {
  useParentApp,
  useParentResource,
} from "@/components/parent/ParentAppContext";
import ChildAvatar from "@/components/parent/ChildAvatar";
import ParentEmptyState from "@/components/parent/ParentEmptyState";
import WritingReader from "@/components/parent/WritingReader";
import { formatParentDate } from "@/lib/parentFormat";

/**
 * "My Child" — the complete portfolio (§18).
 *
 * Tabbed rather than one long scroll, because the four collections answer
 * different questions and a parent usually arrives wanting one of them.
 *
 * What is deliberately absent: anything internal to the school. No disciplinary
 * record, no teacher notes, no administrative flags. The API does not return
 * them, and this screen has nowhere to put them (§18).
 */

const TABS = [
  { key: "profile", labelKey: "child.profile" },
  { key: "achievements", labelKey: "child.achievements" },
  { key: "writing", labelKey: "child.writing" },
  { key: "certificates", labelKey: "child.certificates" },
];

export default function ParentChildPage() {
  const { t, selectedChildId, preferences } = useParentApp();
  const { loading, error, data, reload } = useParentResource(
    "/api/parent/portfolio"
  );

  const [tab, setTab] = useState("profile");
  const [openWritingId, setOpenWritingId] = useState(null);

  if (!selectedChildId) return null;

  if (loading) {
    return <div className="h-72 animate-pulse rounded-2xl bg-slate-100" />;
  }

  if (error || !data) {
    return (
      <ParentEmptyState
        emoji="⚠️"
        tone="neutral"
        title={error || t("common.somethingWrong")}
        action={
          <button
            type="button"
            onClick={reload}
            className="min-h-[48px] rounded-xl bg-[var(--brand-primary)] px-6 font-bold text-white"
          >
            {t("common.retry")}
          </button>
        }
      />
    );
  }

  const { child, achievements, writings, certificates, schoolsAttended } = data;
  const calendar = preferences.calendarPreference;
  const name = child.name;

  return (
    <div className="space-y-5">
      <header className="flex flex-col items-center rounded-2xl border border-[var(--brand-border)] bg-white p-5 text-center">
        <ChildAvatar name={child.name} photoUrl={child.photoUrl} size={88} />
        <h1 className="mt-3 text-xl font-bold text-[var(--brand-ink)]">
          {child.name}
        </h1>
        <p className="text-sm text-[var(--brand-muted)]">
          {child.grade}
          {child.grade && child.school?.name ? " · " : ""}
          {child.school?.name}
        </p>

        <div className="mt-4 grid w-full grid-cols-3 gap-2">
          <Stat value={achievements.length} label={t("child.achievements")} />
          <Stat value={writings.length} label={t("child.writing")} />
          <Stat value={certificates.length} label={t("child.certificates")} />
        </div>
      </header>

      <div className="-mx-4 overflow-x-auto px-4 scrollbar-hidden">
        <div className="flex w-max gap-2">
          {TABS.map((entry) => (
            <button
              key={entry.key}
              type="button"
              onClick={() => setTab(entry.key)}
              aria-pressed={tab === entry.key}
              className={[
                "min-h-[40px] whitespace-nowrap rounded-full border px-4 text-sm font-semibold transition-colors",
                tab === entry.key
                  ? "border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white"
                  : "border-[var(--brand-border)] bg-white text-[var(--brand-muted)]",
              ].join(" ")}
            >
              {t(entry.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {tab === "profile" ? (
        <ProfileTab
          child={child}
          schoolsAttended={schoolsAttended}
          calendar={calendar}
          t={t}
        />
      ) : null}

      {tab === "achievements" ? (
        achievements.length === 0 ? (
          <ParentEmptyState
            emoji="🏆"
            tone="neutral"
            title={t("child.noAchievements", { name })}
          />
        ) : (
          <ul className="space-y-3">
            {achievements.map((achievement) => (
              <li
                key={achievement.id}
                className="rounded-2xl border border-[var(--brand-border)] bg-white p-4"
              >
                <div className="flex gap-3">
                  <span aria-hidden="true" className="text-2xl">
                    {achievement.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold uppercase tracking-wide text-[var(--brand-ink)]">
                      {achievement.title}
                    </h3>
                    <p className="text-sm font-semibold text-amber-700">
                      {achievement.placement}
                    </p>
                    {achievement.eventTitle ? (
                      <p className="text-sm text-[var(--brand-muted)]">
                        {achievement.eventTitle}
                      </p>
                    ) : null}
                    <p className="mt-1 text-xs text-[var(--brand-muted)]">
                      {formatParentDate(achievement.date, {
                        calendar,
                        relative: false,
                      })}
                      {" · "}
                      {achievement.schoolName}
                    </p>
                    {achievement.verified ? (
                      <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                        <FaCheckCircle aria-hidden="true" className="h-3.5 w-3.5" />
                        {t("child.verified")}
                      </p>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )
      ) : null}

      {tab === "writing" ? (
        writings.length === 0 ? (
          <ParentEmptyState
            emoji="✍️"
            tone="neutral"
            title={t("child.noWriting", { name })}
          />
        ) : (
          <ul className="space-y-3">
            {writings.map((writing) => (
              <li
                key={writing.id}
                className="rounded-2xl border border-[var(--brand-border)] bg-white p-4"
              >
                <div className="flex items-start gap-3">
                  <span aria-hidden="true" className="text-2xl">
                    {writing.categoryEmoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--brand-muted)]">
                      {t(writing.categoryLabelKey)}
                    </p>
                    <h3 className="font-bold leading-snug text-[var(--brand-ink)]">
                      {writing.title}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-sm text-[var(--brand-muted)]">
                      {writing.preview}
                    </p>
                    <p className="mt-1 text-xs text-[var(--brand-muted)]">
                      {formatParentDate(writing.date, {
                        calendar,
                        relative: false,
                      })}
                      {" · "}
                      {writing.schoolName}
                    </p>
                    {writing.teacherReviewed ? (
                      <p className="mt-1.5 inline-block rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700">
                        {t("child.teacherReviewed")}
                      </p>
                    ) : null}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setOpenWritingId(writing.id)}
                  className="mt-3 min-h-[48px] w-full rounded-xl bg-[var(--brand-primary)] font-bold text-white"
                >
                  {t("home.read")}
                </button>
              </li>
            ))}
          </ul>
        )
      ) : null}

      {tab === "certificates" ? (
        certificates.length === 0 ? (
          <ParentEmptyState
            emoji="📜"
            tone="neutral"
            title={t("child.noCertificates")}
          />
        ) : (
          <ul className="space-y-3">
            {certificates.map((certificate) => (
              <li
                key={certificate.id}
                className="rounded-2xl border border-[var(--brand-border)] bg-white p-4"
              >
                <div className="flex items-start gap-3">
                  <span aria-hidden="true" className="text-2xl">
                    📜
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-[var(--brand-ink)]">
                      {certificate.title}
                    </h3>
                    {certificate.eventTitle ? (
                      <p className="text-sm text-[var(--brand-muted)]">
                        {certificate.eventTitle}
                      </p>
                    ) : null}
                    <p className="mt-1 text-xs text-[var(--brand-muted)]">
                      {formatParentDate(certificate.issuedAt, {
                        calendar,
                        relative: false,
                      })}
                      {" · "}
                      {certificate.schoolName}
                    </p>
                    {certificate.certificateCode ? (
                      <p className="mt-1 font-mono text-[11px] text-[var(--brand-muted)]">
                        {t("child.certificateId")}: {certificate.certificateCode}
                      </p>
                    ) : null}
                    <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                      <FaCheckCircle aria-hidden="true" className="h-3.5 w-3.5" />
                      {t("child.verified")}
                    </p>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  {certificate.certificateUrl ? (
                    <a
                      href={certificate.certificateUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] text-sm font-bold text-white"
                    >
                      {t("child.viewCertificate")}
                    </a>
                  ) : null}
                  {certificate.verifyPath ? (
                    <Link
                      href={certificate.verifyPath}
                      className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl border-2 border-[var(--brand-primary)] text-sm font-bold text-[var(--brand-primary)]"
                    >
                      {t("child.verifyCertificate")}
                      <FaExternalLinkAlt aria-hidden="true" className="h-3 w-3" />
                    </Link>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )
      ) : null}

      {openWritingId ? (
        <WritingReader
          writingId={openWritingId}
          onClose={() => setOpenWritingId(null)}
        />
      ) : null}
    </div>
  );
}

function Stat({ value, label }) {
  return (
    <div className="rounded-xl bg-slate-50 px-2 py-2">
      <p className="text-lg font-bold text-[var(--brand-ink)]">{value}</p>
      <p className="text-[11px] leading-tight text-[var(--brand-muted)]">
        {label}
      </p>
    </div>
  );
}

/**
 * Profile tab, including "Schools Attended" — the visible proof that the
 * portfolio is portable and that the previous school keeps its credit (§24).
 */
function ProfileTab({ child, schoolsAttended, calendar, t }) {
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-[var(--brand-border)] bg-white p-4">
        <dl className="space-y-2 text-sm">
          <Row label={t("child.grade")} value={child.grade} />
          {child.rollNumber ? (
            <Row label="Roll number" value={child.rollNumber} />
          ) : null}
          {child.platformStudentId ? (
            <Row label="Pravyo ID" value={child.platformStudentId} mono />
          ) : null}
          <Row label={t("common.school")} value={child.school?.name} />
        </dl>
      </section>

      <section className="rounded-2xl border border-[var(--brand-border)] bg-white p-4">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-[var(--brand-muted)]">
          {t("child.schoolsAttended")}
        </h2>
        <ol className="space-y-3">
          {schoolsAttended.map((entry, index) => (
            <li key={`${entry.schoolId}-${index}`} className="flex gap-3">
              <span aria-hidden="true" className="text-lg">
                🏫
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-[var(--brand-ink)]">
                  {entry.name}
                </p>
                <p className="text-xs text-[var(--brand-muted)]">
                  {[entry.grade, entry.academicYear]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <p className="text-xs text-[var(--brand-muted)]">
                  {formatParentDate(entry.startedAt, {
                    calendar,
                    relative: false,
                  })}
                  {entry.endedAt
                    ? ` – ${formatParentDate(entry.endedAt, {
                        calendar,
                        relative: false,
                      })}`
                    : " – Present"}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function Row({ label, value, mono = false }) {
  if (!value) return null;
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-[var(--brand-muted)]">{label}</dt>
      <dd
        className={`font-semibold text-[var(--brand-ink)] ${mono ? "font-mono text-xs" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}
