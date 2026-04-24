"use client";

import { useCallback, useEffect, useState } from "react";
import {
  FaEdit,
  FaPlus,
  FaSpinner,
  FaTrash,
  FaUsers,
} from "react-icons/fa";

const CLUB_TYPES = [
  "PERFORMING_ARTS",
  "VISUAL_ARTS",
  "STEM",
  "LANGUAGE",
  "LEADERSHIP",
  "SERVICE",
  "SPORTS",
  "GENERAL",
];

const VISIBILITY_OPTIONS = ["PRIVATE", "SCHOOL_ONLY", "PUBLIC"];

const EMPTY_FORM = {
  name: "",
  slug: "",
  description: "",
  clubType: "GENERAL",
  coordinators: [],
  members: [],
  visibility: "SCHOOL_ONLY",
  isPubliclyListed: false,
  foundedAt: "",
  status: "ACTIVE",
};

function toSlug(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toggleValue(list, value) {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];
}

export default function ClubManager() {
  const [clubs, setClubs] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [clubsRes, teachersRes, studentsRes] = await Promise.all([
        fetch("/api/clubs", { cache: "no-store" }),
        fetch("/api/teachers?limit=200", { cache: "no-store" }),
        fetch("/api/students?limit=200&status=ACTIVE", { cache: "no-store" }),
      ]);

      const [clubsJson, teachersJson, studentsJson] =
        await Promise.all([
          clubsRes.json(),
          teachersRes.json(),
          studentsRes.json(),
        ]);

      if (!clubsRes.ok) {
        throw new Error(clubsJson.message || "Failed to load clubs");
      }
      if (!teachersRes.ok) {
        throw new Error(teachersJson.message || "Failed to load mentors");
      }
      if (!studentsRes.ok) {
        throw new Error(studentsJson.message || "Failed to load students");
      }

      setClubs(clubsJson.data || []);
      setTeachers(teachersJson.teachers || []);
      setStudents(studentsJson.students || []);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const resetForm = () => {
    setEditingId(null);
    setFormData(EMPTY_FORM);
  };

  const startEdit = (club) => {
    setEditingId(club._id);
    setFormData({
      name: club.name || "",
      slug: club.slug || "",
      description: club.description || "",
      clubType: club.clubType || "GENERAL",
      coordinators: (club.coordinators || []).map((item) =>
        typeof item === "string" ? item : item._id
      ),
      members: (club.members || []).map((item) =>
        typeof item === "string" ? item : item._id
      ),
      visibility: club.visibility || "SCHOOL_ONLY",
      isPubliclyListed: Boolean(club.isPubliclyListed),
      foundedAt: club.foundedAt ? String(club.foundedAt).slice(0, 10) : "",
      status: club.status || "ACTIVE",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    const payload = {
      ...formData,
      slug: formData.slug || toSlug(formData.name),
      foundedAt: formData.foundedAt || null,
    };

    try {
      const res = await fetch(editingId ? `/api/clubs/${editingId}` : "/api/clubs", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to save club");
      }

      await loadData();
      resetForm();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this club?")) return;
    setError("");

    try {
      const res = await fetch(`/api/clubs/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to delete club");
      }
      await loadData();
      if (editingId === id) resetForm();
    } catch (deleteError) {
      setError(deleteError.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <FaUsers className="text-fuchsia-400" />
              Clubs and Activity Groups
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Build the club structure behind your school’s extracurricular identity.
            </p>
          </div>
          <button
            type="button"
            onClick={resetForm}
            className="px-3 py-2 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 text-sm"
          >
            <FaPlus className="inline mr-2" />
            New Club
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-300 mb-1">Club Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => {
                const name = e.target.value;
                setFormData((prev) => ({
                  ...prev,
                  name,
                  slug: editingId ? prev.slug : toSlug(name),
                }));
              }}
              className="w-full bg-slate-800 text-white rounded p-2 focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
              placeholder="Debate Society, Robotics Club..."
              required
            />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">Slug</label>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, slug: toSlug(e.target.value) }))
              }
              className="w-full bg-slate-800 text-white rounded p-2 focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
              placeholder="debate-society"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">Club Type</label>
            <select
              value={formData.clubType}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, clubType: e.target.value }))
              }
              className="w-full bg-slate-800 text-white rounded p-2 focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
            >
              {CLUB_TYPES.map((option) => (
                <option key={option} value={option}>
                  {option.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">Visibility</label>
            <select
              value={formData.visibility}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, visibility: e.target.value }))
              }
              className="w-full bg-slate-800 text-white rounded p-2 focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
            >
              {VISIBILITY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm text-slate-300 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, description: e.target.value }))
              }
              className="w-full bg-slate-800 text-white rounded p-2 h-24 focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
              placeholder="What this club does, who it serves, and what it showcases publicly."
            />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-2">Mentors / Coordinators</label>
            <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/70 p-3 space-y-2">
              {teachers.length === 0 ? (
                <p className="text-sm text-slate-500">No mentors available yet.</p>
              ) : (
                teachers.map((teacher) => (
                  <label
                    key={teacher._id}
                    className="flex items-center gap-3 text-sm text-slate-300"
                  >
                    <input
                      type="checkbox"
                      checked={formData.coordinators.includes(teacher._id)}
                      onChange={() =>
                        setFormData((prev) => ({
                          ...prev,
                          coordinators: toggleValue(prev.coordinators, teacher._id),
                        }))
                      }
                      className="rounded border-slate-600 bg-slate-800 text-fuchsia-500"
                    />
                    <span>
                      {teacher.name}
                      <span className="text-slate-500 ml-2">
                        {teacher.subject || "General focus"}
                      </span>
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-2">Student Members</label>
            <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/70 p-3 space-y-2">
              {students.length === 0 ? (
                <p className="text-sm text-slate-500">No active students available.</p>
              ) : (
                students.map((student) => (
                  <label
                    key={student._id}
                    className="flex items-center gap-3 text-sm text-slate-300"
                  >
                    <input
                      type="checkbox"
                      checked={formData.members.includes(student._id)}
                      onChange={() =>
                        setFormData((prev) => ({
                          ...prev,
                          members: toggleValue(prev.members, student._id),
                        }))
                      }
                      className="rounded border-slate-600 bg-slate-800 text-fuchsia-500"
                    />
                    <span>
                      {student.name}
                      <span className="text-slate-500 ml-2">{student.grade}</span>
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-300 mb-1">Founded Date</label>
              <input
                type="date"
                value={formData.foundedAt}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, foundedAt: e.target.value }))
                }
                className="w-full bg-slate-800 text-white rounded p-2 focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, status: e.target.value }))
                }
                className="w-full bg-slate-800 text-white rounded p-2 focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
              >
                <option value="ACTIVE">Active</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
            <label className="flex items-center gap-3 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={formData.isPubliclyListed}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    isPubliclyListed: e.target.checked,
                  }))
                }
                className="rounded border-slate-600 bg-slate-800 text-fuchsia-500"
              />
              Show this club on the public school profile
            </label>
          </div>
          <div className="md:col-span-2 flex items-center justify-between pt-2">
            <div className="text-sm text-red-300 min-h-5">{error}</div>
            <div className="flex gap-3">
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-lg bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-medium disabled:opacity-60"
              >
                {saving ? "Saving..." : editingId ? "Update Club" : "Create Club"}
              </button>
            </div>
          </div>
        </form>
      </div>

      <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
        <h3 className="text-lg font-semibold text-white mb-4">Existing Clubs</h3>
        {loading ? (
          <div className="text-slate-400 flex items-center gap-2">
            <FaSpinner className="animate-spin" />
            Loading clubs...
          </div>
        ) : clubs.length === 0 ? (
          <p className="text-slate-500 italic">No clubs have been set up yet.</p>
        ) : (
          <div className="grid lg:grid-cols-2 gap-4">
            {clubs.map((club) => (
              <div
                key={club._id}
                className="rounded-xl border border-slate-800 bg-slate-950/70 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-white font-semibold">{club.name}</h4>
                      <span className="text-xs px-2 py-1 rounded-full bg-slate-800 text-slate-300">
                        {String(club.clubType || "GENERAL").replaceAll("_", " ")}
                      </span>
                      {club.isPubliclyListed && (
                        <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          Public
                        </span>
                      )}
                    </div>
                    <p className="text-xs uppercase tracking-wide text-slate-500 mt-1">
                      {club.visibility?.replaceAll("_", " ")} visibility
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(club)}
                      className="p-2 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700"
                      title="Edit club"
                    >
                      <FaEdit />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(club._id)}
                      className="p-2 rounded-lg bg-red-500/10 text-red-300 hover:bg-red-500/20"
                      title="Delete club"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
                {club.description && (
                  <p className="text-sm text-slate-400 mt-3">{club.description}</p>
                )}
                <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
                  <div className="rounded-lg bg-slate-900 border border-slate-800 p-3">
                    <p className="text-slate-500 text-xs uppercase tracking-wide">
                      Mentors
                    </p>
                    <p className="text-white font-semibold mt-1">
                      {(club.coordinators || []).length}
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-900 border border-slate-800 p-3">
                    <p className="text-slate-500 text-xs uppercase tracking-wide">
                      Members
                    </p>
                    <p className="text-white font-semibold mt-1">
                      {(club.members || []).length}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
