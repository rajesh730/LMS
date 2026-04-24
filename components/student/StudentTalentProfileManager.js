"use client";

import { useCallback, useEffect, useState } from "react";
import { FaPlus, FaSpinner, FaStar, FaTrophy, FaUsers } from "react-icons/fa";

const EMPTY_MEDIA = { type: "LINK", title: "", url: "", isFeatured: false };

export default function StudentTalentProfileManager() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [achievements, setAchievements] = useState([]);
  const [studentMeta, setStudentMeta] = useState(null);
  const [stats, setStats] = useState({
    eventsParticipated: 0,
    submissionsCount: 0,
    awardsCount: 0,
  });
  const [formData, setFormData] = useState({
    headline: "",
    bio: "",
    skillLevel: "BEGINNER",
    visibility: "SCHOOL_ONLY",
    isPubliclyFeatured: false,
    media: [EMPTY_MEDIA],
  });

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/student/talent-profile", {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to load profile");
      }

      const profile = data.data.profile;
      setStudentMeta(data.data.student);
      setAchievements(data.data.achievements || []);
      setStats(
        data.data.stats || {
          eventsParticipated: 0,
          submissionsCount: 0,
          awardsCount: 0,
        }
      );
      setFormData({
        headline: profile?.headline || "",
        bio: profile?.bio || "",
        skillLevel: profile?.skillLevel || "BEGINNER",
        visibility: profile?.visibility || "SCHOOL_ONLY",
        isPubliclyFeatured: Boolean(profile?.isPubliclyFeatured),
        media:
          profile?.media?.length > 0
            ? profile.media.map((item) => ({
                type: item.type || "LINK",
                title: item.title || "",
                url: item.url || "",
                isFeatured: Boolean(item.isFeatured),
              }))
            : [EMPTY_MEDIA],
      });
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const updateMedia = (index, key, value) => {
    setFormData((prev) => {
      const media = [...prev.media];
      media[index] = { ...media[index], [key]: value };
      return { ...prev, media };
    });
  };

  const addMedia = () => {
    setFormData((prev) => ({
      ...prev,
      media: [...prev.media, EMPTY_MEDIA],
    }));
  };

  const removeMedia = (index) => {
    setFormData((prev) => {
      const media = [...prev.media];
      media.splice(index, 1);
      return { ...prev, media: media.length ? media : [EMPTY_MEDIA] };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/student/talent-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to save profile");
      }
      await loadProfile();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8 text-slate-300 flex items-center gap-3">
        <FaSpinner className="animate-spin" />
        Loading talent profile...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-4">
        {[
          ["Events", stats.eventsParticipated, <FaUsers className="text-blue-400" key="events" />],
          ["Submissions", stats.submissionsCount, <FaStar className="text-emerald-400" key="subs" />],
          ["Awards", stats.awardsCount, <FaTrophy className="text-yellow-400" key="awards" />],
        ].map(([label, value, icon]) => (
          <div
            key={label}
            className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5"
          >
            <div className="flex items-center justify-between">
              <p className="text-slate-400">{label}</p>
              {icon}
            </div>
            <p className="text-3xl font-bold text-white mt-3">{value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white">My Talent Profile</h2>
          <p className="text-slate-400 mt-1">
            Shape how your school, mentors, and future public showcases understand your strengths.
          </p>
          {studentMeta && (
            <p className="text-sm text-slate-500 mt-2">
              {studentMeta.name} • {studentMeta.grade}
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-300 mb-1">Headline</label>
              <input
                type="text"
                value={formData.headline}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, headline: e.target.value }))
                }
                className="w-full rounded-xl bg-slate-800 text-white p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Debater, vocalist, maker, performer..."
              />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1">Skill Level</label>
              <select
                value={formData.skillLevel}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, skillLevel: e.target.value }))
                }
                className="w-full rounded-xl bg-slate-800 text-white p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {["BEGINNER", "EMERGING", "INTERMEDIATE", "ADVANCED", "EXPERT"].map(
                  (level) => (
                    <option key={level} value={level}>
                      {level.replaceAll("_", " ")}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-1">Bio</label>
            <textarea
              value={formData.bio}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, bio: e.target.value }))
              }
              className="w-full rounded-xl bg-slate-800 text-white p-3 h-28 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="What do you practice, what kind of events do you enjoy, and what are you working toward?"
            />
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-300 mb-1">Visibility</label>
              <select
                value={formData.visibility}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, visibility: e.target.value }))
                }
                className="w-full rounded-xl bg-slate-800 text-white p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="PRIVATE">Private</option>
                <option value="SCHOOL_ONLY">School only</option>
                <option value="PUBLIC">Public</option>
              </select>
            </div>
            <label className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={formData.isPubliclyFeatured}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    isPubliclyFeatured: e.target.checked,
                  }))
                }
                className="rounded border-slate-600 bg-slate-800 text-blue-500"
              />
              Allow mentors or school admins to feature this profile publicly
            </label>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm text-slate-300">Portfolio Links</label>
              <button
                type="button"
                onClick={addMedia}
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                <FaPlus className="inline mr-2" />
                Add link
              </button>
            </div>
            <div className="space-y-3">
              {formData.media.map((item, index) => (
                <div
                  key={`${index}-${item.url}`}
                  className="grid md:grid-cols-[150px_1fr_1fr_auto] gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-4"
                >
                  <select
                    value={item.type}
                    onChange={(e) => updateMedia(index, "type", e.target.value)}
                    className="rounded-xl bg-slate-800 text-white p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {["LINK", "VIDEO", "AUDIO", "IMAGE", "DOCUMENT"].map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={item.title}
                    onChange={(e) => updateMedia(index, "title", e.target.value)}
                    className="rounded-xl bg-slate-800 text-white p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Performance title"
                  />
                  <input
                    type="url"
                    value={item.url}
                    onChange={(e) => updateMedia(index, "url", e.target.value)}
                    className="rounded-xl bg-slate-800 text-white p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://..."
                  />
                  <button
                    type="button"
                    onClick={() => removeMedia(index)}
                    className="rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 px-4"
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
              className="rounded-xl bg-blue-600 hover:bg-blue-500 text-white px-5 py-3 font-medium disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Talent Profile"}
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
        <h3 className="text-xl font-bold text-white mb-4">Recent Achievements</h3>
        {achievements.length === 0 ? (
          <p className="text-slate-500">No published achievements yet.</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {achievements.map((achievement) => (
              <div
                key={achievement._id}
                className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4"
              >
                <p className="text-white font-semibold">{achievement.title}</p>
                <p className="text-sm text-slate-400 mt-1">
                  {achievement.placement.replaceAll("_", " ")} - {achievement.level}
                </p>
                {achievement.event?.title && (
                  <p className="text-xs text-slate-500 mt-2">
                    Event: {achievement.event.title}
                  </p>
                )}
                {achievement.totalScore > 0 && (
                  <p className="text-xs text-emerald-300 mt-2">
                    Score: {achievement.totalScore}
                    {achievement.scorePercentage > 0
                      ? ` (${achievement.scorePercentage}%)`
                      : ""}
                  </p>
                )}
                {achievement.description && (
                  <p className="text-sm text-slate-300 mt-3">
                    {achievement.description}
                  </p>
                )}
                {achievement.certificateUrl && (
                  <a
                    href={achievement.certificateUrl}
                    className="inline-flex text-sm text-blue-400 hover:text-blue-300 mt-3"
                    target="_blank"
                    rel="noreferrer"
                  >
                    View Certificate
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
