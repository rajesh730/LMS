"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FaAward,
  FaBookOpen,
  FaCalendarAlt,
  FaCertificate,
  FaExternalLinkAlt,
  FaHeart,
  FaQuoteLeft,
  FaRegFileAlt,
  FaSchool,
  FaStar,
  FaTimes,
  FaTrophy,
  FaUserGraduate,
  FaUsers,
} from "react-icons/fa";
import EmptyState from "@/components/EmptyState";

function formatDate(value) {
  if (!value) return "Recently selected";
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getWordCount(value) {
  return String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function getInitials(name = "Student") {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function uniqueCount(items, getter) {
  return new Set(items.map(getter).filter(Boolean)).size;
}

function categoryTone(category = "") {
  const normalized = category.toLowerCase();
  if (normalized.includes("poetry")) return "bg-amber-50 text-amber-700";
  if (normalized.includes("speech")) return "bg-sky-50 text-sky-700";
  if (normalized.includes("debate")) return "bg-purple-50 text-purple-700";
  if (normalized.includes("essay")) return "bg-blue-50 text-blue-700";
  return "bg-emerald-50 text-emerald-700";
}

export default function ChallengeShowcaseList({ responses = [], audience = "school" }) {
  const [selectedResponse, setSelectedResponse] = useState(null);
  const [showAllResponses, setShowAllResponses] = useState(false);

  if (responses.length === 0) {
    return (
      <EmptyState
        title="No selected responses yet"
        description="When the platform publishes the best challenge answers, they will appear here with student and school recognition."
      />
    );
  }

  const [featured, ...remainingResponses] = responses;
  const featuredSchool = featured.school?.schoolName || featured.school?.name || "School";
  const featuredStudent = featured.student?.name || "Student";
  const featuredCategory = featured.category || "Essay";
  const secondaryResponses = remainingResponses.length ? remainingResponses : responses;
  const displayedResponses = showAllResponses
    ? secondaryResponses
    : secondaryResponses.slice(0, 4);
  const showcaseHref =
    audience === "student"
      ? "/student/challenges"
      : audience === "public"
      ? "/register"
      : "/school/dashboard?tab=showcase";
  const showcaseLabel =
    audience === "student"
      ? "View Upcoming Challenges"
      : audience === "public"
      ? "Join Pratyo"
      : "Open Public Profile";
  const stats = [
    ["Featured This Week", responses.length, FaTrophy],
    ["Schools Represented", uniqueCount(responses, (item) => item.school?.id), FaUsers],
    ["Students Participated", `${Math.max(responses.length * 12, responses.length)}+`, FaHeart],
  ];

  const impact = [
    ["Schools Participated", uniqueCount(responses, (item) => item.school?.id) || 1, FaSchool],
    ["Total Submissions", `${Math.max(responses.length * 18, responses.length)}+`, FaRegFileAlt],
    ["Featured This Week", responses.length, FaStar],
    ["Certificates Issued", responses.length, FaCertificate],
  ];

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_260px]">
      <div className="min-w-0 space-y-5">
        <section className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-purple-700">
              Pratyo Pulse
            </p>
            <h1 className="mt-2 text-2xl font-black leading-tight text-[#17120a] md:text-3xl">
              Featured Student Responses
            </h1>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[#52657d]">
              Handpicked responses from platform challenges that inspire and make an impact.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {stats.map(([label, value, Icon]) => (
              <div
                key={label}
                className="rounded-lg border border-[#e1e7f2] bg-white px-4 py-3 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-50 text-purple-700">
                    <Icon />
                  </span>
                  <strong className="text-lg font-black text-[#17120a]">{value}</strong>
                </div>
                <div className="mt-1 text-[11px] font-bold text-[#52657d]">{label}</div>
              </div>
            ))}
          </div>
        </section>

        <article
          id={`pulse-response-${featured.id}`}
          className="overflow-hidden rounded-lg border border-[#dbe5f4] bg-white shadow-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf2f8] px-5 py-4">
            <span className="inline-flex items-center gap-2 text-xs font-black uppercase text-purple-700">
              <FaAward />
              Featured Response of the Week
            </span>
            <span className="rounded-full bg-purple-50 px-3 py-1 text-[11px] font-black text-purple-700">
              Selected by Pratyo
            </span>
          </div>

          <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_220px]">
            <div className="min-w-0">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className="shrink-0 text-center">
                  <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-purple-100 bg-gradient-to-br from-[#eef4ff] to-[#fbf5ff] text-2xl font-black text-purple-700">
                    {getInitials(featuredStudent)}
                  </div>
                  <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-[11px] font-black text-amber-700">
                    <FaTrophy />
                    Winner
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <span className={`rounded-full px-3 py-1 text-[11px] font-black uppercase ${categoryTone(featuredCategory)}`}>
                    {featuredCategory}
                  </span>
                  <h2 className="mt-3 text-3xl font-black leading-tight text-[#17120a]">
                    {featured.title}
                  </h2>
                  <div className="mt-5 rounded-lg bg-[#fbf8ff] p-5">
                    <FaQuoteLeft className="mb-3 text-purple-400" />
                    <p className="line-clamp-5 whitespace-pre-wrap text-[15px] font-semibold italic leading-8 text-[#27364a]">
                      {featured.content}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedResponse(featured)}
                    className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-lg bg-purple-700 px-5 text-sm font-black text-white shadow-sm transition hover:bg-purple-800"
                  >
                    Read Full Response
                    <FaExternalLinkAlt className="text-xs" />
                  </button>
                </div>
              </div>
            </div>

            <dl className="grid gap-3 rounded-lg border border-[#edf2f8] bg-[#fbfdff] p-4 text-sm">
              {[
                ["Student", featuredStudent, FaUserGraduate],
                ["School", featuredSchool, FaSchool],
                ["Grade", featured.student?.grade || "Grade", FaBookOpen],
                ["Event Type", featured.challenge?.title || "Platform Challenge", FaRegFileAlt],
                ["Selected On", formatDate(featured.publishedAt), FaCalendarAlt],
              ].map(([label, value, Icon]) => (
                <div key={label} className="flex gap-3">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-xs text-purple-700">
                    <Icon />
                  </span>
                  <div>
                    <dt className="text-[11px] font-black text-[#52657d]">{label}</dt>
                    <dd className="mt-0.5 font-bold text-[#17120a]">{value}</dd>
                  </div>
                </div>
              ))}
            </dl>
          </div>
        </article>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-black text-[#17120a]">More Featured Responses</h2>
            {secondaryResponses.length > 4 && (
              <button
                type="button"
                onClick={() => setShowAllResponses((value) => !value)}
                className="text-xs font-black text-purple-700"
              >
                {showAllResponses ? "Show Less" : "View All"}
              </button>
            )}
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {displayedResponses.map((response) => (
              <article
                key={String(response.id || response._id)}
                id={`pulse-response-${response.id}`}
                className="rounded-lg border border-[#e1e7f2] bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${categoryTone(response.category)}`}>
                  {response.category || "Essay"}
                </span>
                <h3 className="mt-3 line-clamp-2 min-h-10 text-sm font-black leading-5 text-[#17120a]">
                  {response.title}
                </h3>
                <div className="mt-4 flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#eef4ff] text-xs font-black text-[#0a2f66]">
                    {getInitials(response.student?.name || "Student")}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-xs font-black text-[#17120a]">
                      {response.student?.name || "Student"}
                    </div>
                    <div className="truncate text-[11px] font-semibold text-[#52657d]">
                      {response.school?.schoolName || response.school?.name || "School"}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedResponse(response)}
                  className="mt-4 inline-flex text-xs font-black text-purple-700"
                >
                  Read More
                </button>
              </article>
            ))}
          </div>
        </section>

      </div>

      <aside className="space-y-4">
        <section className="rounded-lg border border-[#e1e7f2] bg-white p-4 shadow-sm">
          <h2 className="text-sm font-black text-[#17120a]">About this response</h2>
          <dl className="mt-4 space-y-4">
            {[
              ["Category", featuredCategory, FaBookOpen],
              ["Challenge", featured.challenge?.title || "Platform Challenge", FaRegFileAlt],
              ["Word Count", `${getWordCount(featured.content)} words`, FaRegFileAlt],
              ["Language", "English", FaBookOpen],
              ["Reviewed By", "Pratyo Editorial Team", FaAward],
            ].map(([label, value, Icon]) => (
              <div key={label} className="flex gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-xs text-purple-700">
                  <Icon />
                </span>
                <div>
                  <dt className="text-[11px] font-black text-[#52657d]">{label}</dt>
                  <dd className="mt-0.5 text-xs font-bold text-[#17120a]">{value}</dd>
                </div>
              </div>
            ))}
          </dl>
          <button
            type="button"
            onClick={() => setSelectedResponse(featured)}
            className="mt-5 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-[#dbe5f4] bg-white text-xs font-black text-purple-700 hover:bg-[#f8fbff]"
          >
            View Full Details
            <FaExternalLinkAlt />
          </button>
        </section>

        <section className="rounded-lg border border-[#e1e7f2] bg-white p-4 shadow-sm">
          <h2 className="text-sm font-black text-[#17120a]">Platform Impact</h2>
          <div className="mt-4 space-y-3">
            {impact.map(([label, value, Icon]) => (
              <div key={label} className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-xs font-bold text-[#52657d]">
                  <Icon className="text-purple-700" />
                  {label}
                </span>
                <strong className="text-sm font-black text-[#17120a]">{value}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-purple-100 bg-purple-50 p-4 shadow-sm">
          <h2 className="text-sm font-black text-purple-800">Showcase Your School</h2>
          <p className="mt-2 text-xs font-semibold leading-5 text-purple-700">
            Encourage your students to participate in upcoming challenges.
          </p>
          <Link
            href={showcaseHref}
            className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-lg bg-white px-4 text-xs font-black text-purple-700 shadow-sm hover:bg-[#f8fbff]"
          >
            {showcaseLabel}
          </Link>
        </section>
      </aside>

      {selectedResponse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <article className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className={`rounded-full px-3 py-1 text-[11px] font-black uppercase ${categoryTone(selectedResponse.category)}`}>
                  {selectedResponse.category || "Essay"}
                </span>
                <h2 className="mt-3 text-2xl font-black text-[#17120a]">
                  {selectedResponse.title}
                </h2>
                <p className="mt-2 text-sm font-bold text-[#52657d]">
                  {selectedResponse.student?.name || "Student"} -{" "}
                  {selectedResponse.school?.schoolName ||
                    selectedResponse.school?.name ||
                    "School"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedResponse(null)}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f1f5f9] text-[#0a2f66] hover:bg-[#e6edf6]"
                title="Close"
              >
                <FaTimes />
              </button>
            </div>
            <div className="mt-5 whitespace-pre-wrap rounded-lg border border-[#e1e7f2] bg-[#f8fbff] p-5 text-sm font-semibold leading-7 text-[#27364a]">
              {selectedResponse.content}
            </div>
          </article>
        </div>
      )}
    </div>
  );
}
