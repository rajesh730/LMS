"use client";

import { useEffect, useMemo, useState } from "react";
import { FaExternalLinkAlt, FaGlobe, FaSpinner, FaStar } from "react-icons/fa";

const EMPTY_FORM = {
  tagline: "",
  summary: "",
  coverImageUrl: "",
  websiteUrl: "",
  visibility: "PUBLIC",
  featuredEvents: [],
  publicHighlights: [""],
};

export default function ShowcaseProfileManager() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState(EMPTY_FORM);
  const [eventOptions, setEventOptions] = useState([]);

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
          visibility: nextProfile.visibility || "PUBLIC",
          featuredEvents: (nextProfile.featuredEvents || []).map((item) =>
            typeof item === "string" ? item : item._id
          ),
          publicHighlights:
            nextProfile.publicHighlights?.length > 0
              ? nextProfile.publicHighlights
              : [""],
          school:
            typeof nextProfile.school === "string"
              ? nextProfile.school
              : nextProfile.school?._id || "",
          highlightMetrics: nextProfile.highlightMetrics || {},
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const payload = {
        tagline: profile.tagline,
        summary: profile.summary,
        coverImageUrl: profile.coverImageUrl,
        websiteUrl: profile.websiteUrl,
        visibility: profile.visibility,
        featuredEvents: profile.featuredEvents,
        publicHighlights: (profile.publicHighlights || []).filter(Boolean),
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
      }));
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 text-slate-300 flex items-center gap-2">
        <FaSpinner className="animate-spin" />
        Loading public showcase profile...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <FaGlobe className="text-blue-400" />
              Public School Showcase
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Control how your school appears before login, on public event pages,
              and in featured school sections.
            </p>
          </div>
          {publicSchoolUrl && (
            <a
              href={publicSchoolUrl}
              className="px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 text-sm inline-flex items-center gap-2"
            >
              View Public Page
              <FaExternalLinkAlt />
            </a>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-300 mb-1">Tagline</label>
              <input
                type="text"
                value={profile.tagline}
                onChange={(e) =>
                  setProfile((prev) => ({ ...prev, tagline: e.target.value }))
                }
                className="w-full bg-slate-800 text-white rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Where creativity, confidence, and community grow."
              />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1">Visibility</label>
              <select
                value={profile.visibility}
                onChange={(e) =>
                  setProfile((prev) => ({ ...prev, visibility: e.target.value }))
                }
                className="w-full bg-slate-800 text-white rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="PUBLIC">Public</option>
                <option value="INVITED">Invited / limited</option>
                <option value="PRIVATE">Private</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-1">Summary</label>
            <textarea
              value={profile.summary}
              onChange={(e) =>
                setProfile((prev) => ({ ...prev, summary: e.target.value }))
              }
              className="w-full bg-slate-800 text-white rounded p-2 h-28 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Explain your school culture, activity strengths, and what families should know."
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-300 mb-1">Cover Image URL</label>
              <input
                type="url"
                value={profile.coverImageUrl}
                onChange={(e) =>
                  setProfile((prev) => ({ ...prev, coverImageUrl: e.target.value }))
                }
                className="w-full bg-slate-800 text-white rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1">Website URL</label>
              <input
                type="url"
                value={profile.websiteUrl}
                onChange={(e) =>
                  setProfile((prev) => ({ ...prev, websiteUrl: e.target.value }))
                }
                className="w-full bg-slate-800 text-white rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://your-school-site.example"
              />
            </div>
          </div>

          <div>
            <div>
              <label className="block text-sm text-slate-300 mb-2">Featured Events</label>
              <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/70 p-3 space-y-2">
                {eventOptions.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No active events available to feature yet.
                  </p>
                ) : (
                  eventOptions.map((event) => (
                    <label
                      key={event._id}
                      className="flex items-center gap-3 text-sm text-slate-300"
                    >
                      <input
                        type="checkbox"
                        checked={profile.featuredEvents.includes(event._id)}
                        onChange={() => toggleSelection("featuredEvents", event._id)}
                        className="rounded border-slate-600 bg-slate-800 text-blue-500"
                      />
                      <span>
                        {event.title}
                        <span className="text-slate-500 ml-2">
                          {event.eventType || "EVENT"}
                        </span>
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm text-slate-300">Public Highlights</label>
              <button
                type="button"
                onClick={addHighlight}
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                Add highlight
              </button>
            </div>
            <div className="space-y-3">
              {(profile.publicHighlights || [""]).map((highlight, index) => (
                <div key={`${index}-${highlight}`} className="flex gap-3">
                  <input
                    type="text"
                    value={highlight}
                    onChange={(e) => updateHighlight(index, e.target.value)}
                    className="flex-1 bg-slate-800 text-white rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Top 3 in district debate, annual arts festival host, 6 active clubs..."
                  />
                  <button
                    type="button"
                    onClick={() => removeHighlight(index)}
                    className="px-3 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-300">{error}</p>}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Showcase Profile"}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
          <FaStar className="text-yellow-400" />
          Public Activity Metrics
        </h3>
          <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            ["Events Hosted", profile.highlightMetrics?.eventsHosted || 0],
            ["Joined Events", profile.highlightMetrics?.eventsParticipated || 0],
            ["Awards", profile.highlightMetrics?.awardsCount || 0],
            ["Active Clubs", profile.highlightMetrics?.clubsCount || 0],
            [
              "Participation Rate",
              `${profile.highlightMetrics?.studentParticipationRate || 0}%`,
            ],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-xl border border-slate-800 bg-slate-950/70 p-4"
            >
              <p className="text-xs uppercase tracking-wide text-slate-500">
                {label}
              </p>
              <p className="text-2xl font-bold text-white mt-2">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
