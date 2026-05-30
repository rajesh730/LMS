"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  FaCalendarAlt,
  FaCheckSquare,
  FaExternalLinkAlt,
  FaGlobe,
  FaImage,
  FaLink,
  FaLock,
  FaPlus,
  FaSave,
  FaSpinner,
  FaStar,
  FaTrophy,
  FaUsers,
} from "react-icons/fa";

const EMPTY_FORM = {
  tagline: "",
  summary: "",
  coverImageUrl: "",
  websiteUrl: "",
  visibility: "PRIVATE",
  featuredEvents: [],
  publicHighlights: [""],
};

const FALLBACK_COVER =
  "https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=900&q=80";

function eventId(event) {
  return event?._id || event?.id || "";
}

function eventLabel(event) {
  return event?.eventType || event?.type || "COMPETITION";
}

function visibleHighlights(profile) {
  return (profile.publicHighlights || []).filter((item) => item.trim());
}

function normalizeHighlights(highlights = []) {
  return highlights.map((item) => String(item || "").trim()).filter(Boolean);
}

function MetricRow({ label, value, icon: Icon }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-[#e1e7f2] bg-white px-4 py-3">
      <span className="inline-flex items-center gap-2 text-xs font-bold text-[#52657d]">
        <Icon className="text-purple-700" />
        {label}
      </span>
      <strong className="text-lg font-black text-[#17120a]">{value}</strong>
    </div>
  );
}

export default function ShowcaseProfileManager() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  const [profile, setProfile] = useState(EMPTY_FORM);
  const [eventOptions, setEventOptions] = useState([]);
  const [showAllEvents, setShowAllEvents] = useState(false);

  const publicSchoolUrl = useMemo(() => {
    if (!profile?.school) return "";
    return `/schools/${profile.school}`;
  }, [profile]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError("");

      try {
        const [profileRes, eventsRes] = await Promise.all([
          fetch("/api/school/showcase-profile", { cache: "no-store" }),
          fetch("/api/events", { cache: "no-store" }),
        ]);

        const profileJson = await profileRes.json();
        const eventsJson = await eventsRes.json();

        if (!profileRes.ok) {
          throw new Error(profileJson.message || "Failed to load showcase profile");
        }

        const nextProfile = profileJson.data || EMPTY_FORM;
        setProfile({
          tagline: nextProfile.tagline || "",
          summary: nextProfile.summary || "",
          coverImageUrl: nextProfile.coverImageUrl || "",
          websiteUrl: nextProfile.websiteUrl || "",
          visibility: nextProfile.visibility || "PRIVATE",
          featuredEvents: (nextProfile.featuredEvents || []).map((item) =>
            typeof item === "string" ? item : item._id || item.id
          ),
          publicHighlights:
            nextProfile.publicHighlights?.length > 0
              ? nextProfile.publicHighlights
              : [""],
          school:
            typeof nextProfile.school === "string"
              ? nextProfile.school
              : nextProfile.school?._id || nextProfile.school?.id || "",
          schoolName: nextProfile.school?.schoolName || nextProfile.school?.name || "",
          highlightMetrics: nextProfile.highlightMetrics || {},
          updatedAt: nextProfile.updatedAt || null,
        });

        setEventOptions(
          (eventsJson.events || []).filter(
            (event) => event.lifecycleStatus !== "ARCHIVED"
          )
        );
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const updateHighlight = (index, value) => {
    setProfile((prev) => {
      const next = [...(prev.publicHighlights || [""])];
      next[index] = value;
      return { ...prev, publicHighlights: next };
    });
  };

  const addHighlight = () => {
    setProfile((prev) => ({
      ...prev,
      publicHighlights: [...(prev.publicHighlights || []), ""],
    }));
  };

  const removeHighlight = (index) => {
    setProfile((prev) => {
      const next = [...(prev.publicHighlights || [])];
      next.splice(index, 1);
      return { ...prev, publicHighlights: next.length ? next : [""] };
    });
  };

  const toggleSelection = (key, id) => {
    setProfile((prev) => {
      const current = prev[key] || [];
      const next = current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id];
      return { ...prev, [key]: next };
    });
  };

  const selectAllEvents = () => {
    const allIds = eventOptions.map(eventId).filter(Boolean);
    setProfile((prev) => ({
      ...prev,
      featuredEvents:
        prev.featuredEvents?.length === allIds.length ? [] : allIds,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSavedMessage("");

    try {
      const payload = {
        tagline: profile.tagline,
        summary: profile.summary,
        coverImageUrl: profile.coverImageUrl,
        websiteUrl: profile.websiteUrl,
        visibility: profile.visibility,
        featuredEvents: profile.featuredEvents,
        publicHighlights: normalizeHighlights(profile.publicHighlights),
      };

      const res = await fetch("/api/school/showcase-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to save showcase profile");
      }

      const saved = data.data;
      setProfile((prev) => ({
        ...prev,
        school:
          typeof saved.school === "string" ? saved.school : saved.school?._id || "",
        highlightMetrics: saved.highlightMetrics || prev.highlightMetrics,
        updatedAt: saved.updatedAt || new Date().toISOString(),
      }));
      setSavedMessage("Showcase profile saved.");
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-[#e1e7f2] bg-white p-6 text-[#52657d] shadow-sm">
        <FaSpinner className="animate-spin text-purple-700" />
        Loading public showcase profile...
      </div>
    );
  }

  const schoolName = profile.schoolName || "Orbit English School";
  const tagline = profile.tagline || "Inspiring minds. Building futures.";
  const coverImage = profile.coverImageUrl || FALLBACK_COVER;
  const metrics = profile.highlightMetrics || {};
  const highlights = visibleHighlights(profile);
  const displayedEvents = showAllEvents ? eventOptions : eventOptions.slice(0, 8);

  return (
    <form onSubmit={handleSubmit} className="space-y-5 text-[#17120a]">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <main className="space-y-4">
          <section className="rounded-lg border border-[#e1e7f2] bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-purple-700 text-2xl text-white">
                  <FaGlobe />
                </span>
                <div>
                  <h1 className="text-2xl font-black text-[#17120a]">
                    Public School Showcase
                  </h1>
                  <p className="mt-2 max-w-xl text-sm font-semibold leading-6 text-[#52657d]">
                    Control how your school appears before login, on public event pages and in featured school sections.
                  </p>
                </div>
              </div>
              {publicSchoolUrl && (
                <Link
                  href={publicSchoolUrl}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-purple-200 bg-white px-5 text-xs font-black text-purple-700 hover:bg-purple-50"
                >
                  View Public Page
                  <FaExternalLinkAlt />
                </Link>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-[#e1e7f2] bg-white p-5 shadow-sm">
            <div className="grid gap-5 md:grid-cols-2">
              <label>
                <div className="mb-2 flex items-center gap-2 text-xs font-black text-[#27364a]">
                  <FaCalendarAlt className="text-[#52657d]" />
                  Tagline
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={profile.tagline}
                    maxLength={120}
                    onChange={(e) =>
                      setProfile((prev) => ({ ...prev, tagline: e.target.value }))
                    }
                    className="h-11 w-full rounded-lg border border-[#dbe5f4] bg-white px-3 pr-16 text-sm font-semibold text-[#17120a] outline-none"
                    placeholder="Inspiring minds. Building futures."
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[#52657d]">
                    {(profile.tagline || "").length}/120
                  </span>
                </div>
              </label>

              <label>
                <div className="mb-2 flex items-center gap-2 text-xs font-black text-[#27364a]">
                  <FaGlobe className="text-[#52657d]" />
                  Visibility
                </div>
                <select
                  value={profile.visibility}
                  onChange={(e) =>
                    setProfile((prev) => ({ ...prev, visibility: e.target.value }))
                  }
                  className="h-11 w-full rounded-lg border border-[#dbe5f4] bg-white px-3 text-sm font-semibold text-[#17120a] outline-none"
                >
                  <option value="PRIVATE">Private</option>
                  <option value="PUBLIC">Public</option>
                </select>
                <p className="mt-2 text-xs font-semibold text-[#52657d]">
                  Only approved public achievements appear on your public profile.
                </p>
              </label>
            </div>

            <label className="mt-5 block">
              <div className="mb-2 flex items-center gap-2 text-xs font-black text-[#27364a]">
                <FaCheckSquare className="text-[#52657d]" />
                Summary
              </div>
              <div className="relative">
                <textarea
                  value={profile.summary}
                  maxLength={500}
                  onChange={(e) =>
                    setProfile((prev) => ({ ...prev, summary: e.target.value }))
                  }
                  className="min-h-28 w-full rounded-lg border border-[#dbe5f4] bg-white px-3 py-3 pb-8 text-sm font-semibold leading-6 text-[#17120a] outline-none"
                  placeholder="Explain your school culture, activity strengths, and what families should know."
                />
                <span className="absolute bottom-3 right-3 text-[10px] font-bold text-[#52657d]">
                  {(profile.summary || "").length}/500
                </span>
              </div>
            </label>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-[#e1e7f2] bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2 text-xs font-black text-[#27364a]">
                <FaImage className="text-[#52657d]" />
                Cover Image
              </div>
              <div className="flex gap-4">
                <div
                  className="h-20 w-32 rounded-lg bg-cover bg-center"
                  style={{ backgroundImage: `url("${coverImage}")` }}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold text-[#52657d]">
                    Recommended: 1200 x 400px
                  </p>
                  <input
                    type="url"
                    value={profile.coverImageUrl}
                    onChange={(e) =>
                      setProfile((prev) => ({ ...prev, coverImageUrl: e.target.value }))
                    }
                    className="mt-3 h-10 w-full rounded-lg border border-[#dbe5f4] px-3 text-xs font-semibold text-[#17120a] outline-none"
                    placeholder="https://..."
                  />
                </div>
              </div>
            </div>

            <label className="rounded-lg border border-[#e1e7f2] bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2 text-xs font-black text-[#27364a]">
                <FaLink className="text-[#52657d]" />
                Website URL
              </div>
              <input
                type="url"
                value={profile.websiteUrl}
                onChange={(e) =>
                  setProfile((prev) => ({ ...prev, websiteUrl: e.target.value }))
                }
                className="h-11 w-full rounded-lg border border-[#dbe5f4] px-3 text-sm font-semibold text-[#17120a] outline-none"
                placeholder="https://schoolname.edu.np"
              />
              <p className="mt-2 text-xs font-semibold text-[#52657d]">
                This link will be displayed on your public profile.
              </p>
            </label>
          </section>

          <section className="rounded-lg border border-[#e1e7f2] bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-black text-[#17120a]">
                  <FaCalendarAlt className="text-purple-700" />
                  Featured Events
                </h2>
                <p className="mt-1 text-xs font-semibold text-[#52657d]">
                  Select events you want to showcase on your public profile.
                </p>
              </div>
              <button
                type="button"
                onClick={selectAllEvents}
                className="inline-flex items-center gap-2 text-xs font-black text-purple-700"
              >
                Select All
                <FaCheckSquare />
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {eventOptions.length === 0 ? (
                <p className="text-sm font-semibold text-[#52657d]">
                  No active events available to feature yet.
                </p>
              ) : (
                displayedEvents.map((event) => {
                  const id = eventId(event);
                  return (
                    <label
                      key={id}
                      className="flex min-h-10 items-center justify-between gap-3 rounded-lg border border-[#e1e7f2] bg-white px-3 py-2 text-xs font-black text-[#0a2f66]"
                    >
                      <span className="inline-flex min-w-0 items-center gap-2">
                        <input
                          type="checkbox"
                          checked={profile.featuredEvents.includes(id)}
                          onChange={() => toggleSelection("featuredEvents", id)}
                          className="h-4 w-4 accent-purple-700"
                        />
                        <span className="truncate">{event.title}</span>
                      </span>
                      <span className="rounded-full bg-purple-50 px-2 py-1 text-[9px] font-black uppercase text-purple-700">
                        {eventLabel(event)}
                      </span>
                    </label>
                  );
                })
              )}
            </div>

            {eventOptions.length > 8 && (
              <button
                type="button"
                onClick={() => setShowAllEvents((value) => !value)}
                className="mx-auto mt-3 block text-xs font-black text-purple-700"
              >
                {showAllEvents ? "Show fewer events" : "Show more events"}
              </button>
            )}
          </section>

          <section className="rounded-lg border border-[#e1e7f2] bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-black text-[#17120a]">
                  <FaStar className="text-purple-700" />
                  Public Highlights
                </h2>
                <p className="mt-1 text-xs font-semibold text-[#52657d]">
                  Add key achievements or strengths to highlight on your public profile.
                </p>
              </div>
              <button
                type="button"
                onClick={addHighlight}
                className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-purple-200 bg-white px-3 text-xs font-black text-purple-700 hover:bg-purple-50"
              >
                <FaPlus />
                Add Highlight
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {(profile.publicHighlights || [""]).map((highlight, index) => (
                <span
                  key={`highlight-${index}`}
                  className="inline-flex items-center gap-2 rounded-lg bg-purple-50 px-3 py-2"
                >
                  <input
                    type="text"
                    value={highlight}
                    onChange={(e) => updateHighlight(index, e.target.value)}
                    className="w-44 bg-transparent text-xs font-black text-purple-800 outline-none"
                    placeholder="Top achievement..."
                  />
                  <button
                    type="button"
                    onClick={() => removeHighlight(index)}
                    className="text-xs font-black text-purple-700"
                    title="Remove highlight"
                  >
                    x
                  </button>
                </span>
              ))}
            </div>
          </section>

          {error && <p className="text-sm font-bold text-rose-600">{error}</p>}
          {savedMessage && <p className="text-sm font-bold text-emerald-700">{savedMessage}</p>}
        </main>

        <aside className="space-y-4">
          <section className="rounded-lg border border-[#e1e7f2] bg-white p-4 shadow-sm">
            <h2 className="text-sm font-black text-[#17120a]">Profile Preview</h2>
            <div className="mt-4 overflow-hidden rounded-lg border border-[#e1e7f2] bg-white">
              <div
                className="h-28 w-full bg-cover bg-center"
                style={{ backgroundImage: `url("${coverImage}")` }}
              />
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-700">
                    <FaLock />
                  </span>
                  <div className="min-w-0">
                    <h3 className="truncate text-lg font-black text-[#17120a]">
                      {schoolName}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-xs font-semibold text-[#52657d]">
                      {tagline}
                    </p>
                  </div>
                </div>
                {highlights.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {highlights.slice(0, 3).map((highlight, index) => (
                      <span
                        key={`preview-highlight-${index}`}
                        className="rounded-full bg-purple-50 px-2.5 py-1 text-[10px] font-black text-purple-700"
                      >
                        {highlight}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                  {[
                    ["Events", FaCalendarAlt],
                    ["Achievements", FaTrophy],
                    ["Students", FaUsers],
                    ["Programs", FaBookIcon],
                  ].map(([label, Icon]) => (
                    <div key={label}>
                      <Icon className="mx-auto text-purple-700" />
                      <div className="mt-1 text-[10px] font-bold text-[#52657d]">
                        {label}
                      </div>
                    </div>
                  ))}
                </div>

                {publicSchoolUrl && (
                  <Link
                    href={publicSchoolUrl}
                    className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-purple-200 text-xs font-black text-purple-700 hover:bg-purple-50"
                  >
                    Visit Public Page
                    <FaExternalLinkAlt />
                  </Link>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-[#e1e7f2] bg-white p-4 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-black text-[#17120a]">
              <FaChartIcon />
              Public Activity Metrics
            </h2>
            <p className="mt-2 text-xs font-semibold leading-5 text-[#52657d]">
              Track how your school is performing on the public platform.
            </p>
            <div className="mt-4 space-y-3">
              <MetricRow label="Events Hosted" value={metrics.eventsHosted || 0} icon={FaCalendarAlt} />
              <MetricRow label="Joined Events" value={metrics.eventsParticipated || 0} icon={FaUsers} />
              <MetricRow label="Awards & Achievements" value={metrics.awardsCount || 0} icon={FaTrophy} />
              <MetricRow
                label="Participation Rate"
                value={`${metrics.studentParticipationRate || 0}%`}
                icon={FaStar}
              />
            </div>
          </section>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-purple-700 px-5 text-sm font-black text-white shadow-sm hover:bg-purple-800 disabled:opacity-60"
          >
            <FaSave />
            {saving ? "Saving..." : "Save Showcase Profile"}
          </button>

          <p className="text-center text-[11px] font-semibold text-[#52657d]">
            Last updated:{" "}
            {profile.updatedAt ? new Date(profile.updatedAt).toLocaleString() : "Not saved yet"}
          </p>
        </aside>
      </div>
    </form>
  );
}

function FaBookIcon(props) {
  return <FaCheckSquare {...props} />;
}

function FaChartIcon() {
  return <span className="text-purple-700">▮▮▮</span>;
}
