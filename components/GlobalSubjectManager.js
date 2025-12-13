"use client";

import { useState, useEffect, useRef } from "react";
import { FaPlus, FaEdit, FaPause, FaPlay, FaSearch, FaDownload, FaUpload } from "react-icons/fa";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function GlobalSubjectManager() {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    academicType: "CORE",
    color: "#3b82f6",
    icon: "book",
    syllabus: "",
  });

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/subjects");
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      setSubjects(data.data?.subjects || data.subjects || []);
      setError("");
    } catch (err) {
      console.error("Fetch error:", err);
      setError(err.message || "Failed to load subjects");
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const method = editingId ? "PUT" : "POST";
      const url = editingId ? `/api/subjects/${editingId}` : "/api/subjects";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          subjectType: "GLOBAL",
        }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.message);

      setSuccess(editingId ? "Subject updated successfully" : "Subject created successfully");
      setFormData({
        name: "",
        code: "",
        description: "",
        academicType: "CORE",
        color: "#3b82f6",
        icon: "book",
        syllabus: "",
      });
      setEditingId(null);
      setShowForm(false);
      fetchSubjects();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleStatusToggle = async (id, currentStatus) => {
    try {
      const newStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
      const response = await fetch(`/api/subjects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error("Failed to update status");

      setSuccess(`Subject ${newStatus.toLowerCase()} successfully`);
      fetchSubjects();
    } catch (err) {
      setError(err.message);
    }
  };

  const fileInputRef = useRef(null);

  const handleExport = async () => {
    try {
      const response = await fetch("/api/subjects/bulk?action=export");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `subjects-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setSuccess("Subjects exported successfully!");
    } catch (err) {
      setError("Failed to export subjects");
    }
  };

  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/subjects/bulk", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Import failed");
      }

      setSuccess(
        `Successfully imported ${data.created} subjects${
          data.errors?.length ? `. ${data.errors.length} errors encountered.` : "!"
        }`
      );

      if (data.errors?.length) {
        setError(data.errors.join("\n"));
      }

      fetchSubjects();
    } catch (err) {
      setError(err.message || "Failed to import subjects");
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  if (loading) return <LoadingSpinner />;

  const filteredSubjects = subjects.filter((s) =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-2xl font-bold text-white">Global Subjects</h2>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
            title="Download subjects as CSV"
          >
            <FaDownload /> Download
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition"
            title="Upload subjects from CSV"
          >
            <FaUpload /> Import
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleImport}
            className="hidden"
          />
          <button
            onClick={() => {
              setShowForm(!showForm);
              setEditingId(null);
              setFormData({
                name: "",
                code: "",
                description: "",
                academicType: "CORE",
                color: "#3b82f6",
                icon: "book",
                syllabus: "",
              });
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
          >
            <FaPlus /> Create Subject
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-lg text-red-400">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-500/10 border border-green-500/30 p-4 rounded-lg text-green-400">
          {success}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-slate-800 border border-slate-700 p-6 rounded-lg space-y-4">
          <h3 className="text-lg font-semibold text-white">
            {editingId ? "Edit Subject" : "Create New Subject"}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Subject Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="col-span-2 bg-slate-700 text-white p-3 rounded border border-slate-600"
                required
              />

              <input
                type="text"
                placeholder="Code (e.g., MATH)"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="bg-slate-700 text-white p-3 rounded border border-slate-600"
                required
              />

              <select
                value={formData.academicType}
                onChange={(e) => setFormData({ ...formData, academicType: e.target.value })}
                className="bg-slate-700 text-white p-3 rounded border border-slate-600"
              >
                <option value="CORE">Core</option>
                <option value="ELECTIVE">Elective</option>
                <option value="EXTRA_CURRICULAR">Extra Curricular</option>
              </select>

              <textarea
                placeholder="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="col-span-2 bg-slate-700 text-white p-3 rounded border border-slate-600"
                rows="2"
              />

              <input
                type="url"
                placeholder="Syllabus URL (optional)"
                value={formData.syllabus}
                onChange={(e) => setFormData({ ...formData, syllabus: e.target.value })}
                className="col-span-2 bg-slate-700 text-white p-3 rounded border border-slate-600"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded"
              >
                {editingId ? "Update" : "Create"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <FaSearch className="absolute left-3 top-3 text-slate-400" />
        <input
          type="text"
          placeholder="Search subjects..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-slate-800 text-white rounded border border-slate-700"
        />
      </div>

      {/* Subjects Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-slate-300">
          <thead className="bg-slate-800 border-b border-slate-700">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Code</th>
              <th className="px-4 py-3 text-left">Type</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {filteredSubjects.filter((s) => s.subjectType === "GLOBAL").map((subject) => (
              <tr key={subject._id} className="hover:bg-slate-700/50">
                <td className="px-4 py-3">{subject.name}</td>
                <td className="px-4 py-3 font-mono">{subject.code}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs">
                    {subject.academicType}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      subject.status === "ACTIVE"
                        ? "bg-green-500/20 text-green-300"
                        : "bg-red-500/20 text-red-300"
                    }`}
                  >
                    {subject.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button
                    onClick={() => {
                      setEditingId(subject._id);
                      setFormData({
                        name: subject.name,
                        code: subject.code,
                        description: subject.description,
                        academicType: subject.academicType,
                        color: subject.color,
                        icon: subject.icon,
                        syllabus: subject.syllabus || "",
                      });
                      setShowForm(true);
                    }}
                    className="text-blue-400 hover:text-blue-300"
                  >
                    <FaEdit />
                  </button>
                  <button
                    onClick={() => handleStatusToggle(subject._id, subject.status)}
                    className={subject.status === "ACTIVE" ? "text-yellow-400" : "text-green-400"}
                  >
                    {subject.status === "ACTIVE" ? <FaPause /> : <FaPlay />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredSubjects.filter((s) => s.subjectType === "GLOBAL").length === 0 && (
        <div className="text-center py-8 text-slate-400">
          No global subjects found
        </div>
      )}
    </div>
  );
}
