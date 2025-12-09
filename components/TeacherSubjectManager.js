"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FaBook,
  FaPlus,
  FaListUl,
  FaQuestionCircle,
  FaStar,
  FaHistory,
  FaStickyNote,
} from "react-icons/fa";

export default function TeacherSubjectManager() {
  const [subjects, setSubjects] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // forms
  const [chapterTitle, setChapterTitle] = useState("");
  const [chapterOrder, setChapterOrder] = useState("");
  const [question, setQuestion] = useState({
    text: "",
    points: 1,
    options: "",
    tags: { important: false, past: false },
    chapterId: "",
  });
  const [note, setNote] = useState({ title: "", content: "" });

  useEffect(() => {
    const loadSubjects = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/teacher/subjects", { cache: "no-store" });
        if (!res.ok) {
          const msg =
            res.status === 401 ? "Unauthorized" : "Failed to load subjects";
          console.warn(msg, res.status);
          setError(msg);
          setSubjects([]);
          return;
        }
        const json = await res.json();
        setSubjects(json.subjects || []);
        if (json.subjects?.length) setSelectedId(json.subjects[0]._id);
      } catch (err) {
        console.error(err);
        setError("Could not load subjects");
      } finally {
        setLoading(false);
      }
    };
    loadSubjects();
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    const loadContent = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/teacher/subjects/${selectedId}/content`, {
          cache: "no-store",
        });
        if (!res.ok) {
          const msg =
            res.status === 404
              ? "No content yet for this subject"
              : "Failed to load subject content";
          console.warn(msg, res.status);
          setError(msg);
          setContent(null);
          return;
        }
        const json = await res.json();
        setContent(json.data);
      } catch (err) {
        console.error(err);
        setError("Could not load subject content");
      } finally {
        setLoading(false);
      }
    };
    loadContent();
  }, [selectedId]);

  const chapters = useMemo(() => content?.chapters || [], [content]);

  const handleAddChapter = async () => {
    if (!chapterTitle || !selectedId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/teacher/chapters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId: selectedId,
          title: chapterTitle,
          order: chapterOrder ? Number(chapterOrder) : undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to add chapter");
      setChapterTitle("");
      setChapterOrder("");
      // reload content
      setSelectedId(selectedId);
    } catch (err) {
      console.error(err);
      setError("Could not add chapter");
    } finally {
      setSaving(false);
    }
  };

  const handleAddQuestion = async () => {
    if (!question.text || !question.chapterId) return;
    setSaving(true);
    try {
      const optionsArray = (question.options || "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((text) => ({ text, isCorrect: text.startsWith("*") }));

      const cleanOptions = optionsArray.map((opt) => ({
        text: opt.text.replace(/^\*/g, ""),
        isCorrect: opt.isCorrect,
      }));

      const tags = [];
      if (question.tags.important) tags.push("important");
      if (question.tags.past) tags.push("past");

      const res = await fetch("/api/teacher/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chapterId: question.chapterId,
          text: question.text,
          points: Number(question.points) || 1,
          options: cleanOptions,
          type: "MCQ",
          tags,
        }),
      });
      if (!res.ok) throw new Error("Failed to add question");
      setQuestion({
        text: "",
        points: 1,
        options: "",
        tags: { important: false, past: false },
        chapterId: question.chapterId,
      });
      setSelectedId(selectedId);
    } catch (err) {
      console.error(err);
      setError("Could not add question");
    } finally {
      setSaving(false);
    }
  };

  const handleAddNote = async () => {
    if (!note.title || !note.content || !selectedId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/teacher/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId: selectedId,
          title: note.title,
          content: note.content,
        }),
      });
      if (!res.ok) throw new Error("Failed to add note");
      setNote({ title: "", content: "" });
    } catch (err) {
      console.error(err);
      setError("Could not add note");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-6">
      <div className="flex items-center gap-2 text-white">
        <FaBook className="text-emerald-400" />
        <h2 className="text-xl font-semibold">My Subjects</h2>
      </div>

      {error && (
        <div className="bg-red-900/40 text-red-100 border border-red-700 rounded-lg p-3 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-slate-400 text-sm">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-1 space-y-2">
            {subjects.map((sub) => (
              <button
                key={sub._id}
                onClick={() => setSelectedId(sub._id)}
                className={`w-full text-left px-3 py-2 rounded-lg border transition ${
                  selectedId === sub._id
                    ? "border-emerald-500 bg-emerald-500/10 text-white"
                    : "border-slate-700 bg-slate-800 text-slate-200 hover:border-slate-600"
                }`}
              >
                <div className="font-semibold">{sub.name}</div>
                <div className="text-xs text-slate-400">
                  {sub.classroom?.name || "Class"}
                </div>
              </button>
            ))}
            {subjects.length === 0 && (
              <div className="text-slate-400 text-sm">
                No subjects assigned.
              </div>
            )}
          </div>

          <div className="lg:col-span-3 space-y-6">
            {!content ? (
              <div className="text-slate-400 text-sm">
                Select a subject to manage chapters and questions.
              </div>
            ) : (
              <>
                {/* Add chapter */}
                <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-white text-sm font-semibold">
                    <FaListUl className="text-emerald-400" /> Add Chapter
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input
                      value={chapterTitle}
                      onChange={(e) => setChapterTitle(e.target.value)}
                      placeholder="Chapter title"
                      className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                    />
                    <input
                      value={chapterOrder}
                      onChange={(e) => setChapterOrder(e.target.value)}
                      placeholder="Order (optional)"
                      className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                    />
                    <button
                      onClick={handleAddChapter}
                      disabled={saving}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg px-4 py-2 text-sm font-semibold"
                    >
                      <FaPlus className="inline mr-1" /> Add
                    </button>
                  </div>
                </div>

                {/* Add note */}
                <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-white text-sm font-semibold">
                    <FaStickyNote className="text-amber-400" /> Share Note with
                    Class
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input
                      value={note.title}
                      onChange={(e) =>
                        setNote({ ...note, title: e.target.value })
                      }
                      placeholder="Note title"
                      className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                    />
                    <textarea
                      value={note.content}
                      onChange={(e) =>
                        setNote({ ...note, content: e.target.value })
                      }
                      placeholder="Content"
                      className="md:col-span-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                      rows={2}
                    />
                    <button
                      onClick={handleAddNote}
                      disabled={saving}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg px-4 py-2 text-sm font-semibold"
                    >
                      <FaPlus className="inline mr-1" /> Post Note
                    </button>
                  </div>
                </div>

                {/* Add question */}
                <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-white text-sm font-semibold">
                    <FaQuestionCircle className="text-blue-400" /> Add MCQ
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <select
                      value={question.chapterId}
                      onChange={(e) =>
                        setQuestion({ ...question, chapterId: e.target.value })
                      }
                      className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                    >
                      <option value="">Select chapter</option>
                      {chapters.map((ch) => (
                        <option key={ch._id} value={ch._id}>
                          {ch.title}
                        </option>
                      ))}
                    </select>
                    <input
                      value={question.text}
                      onChange={(e) =>
                        setQuestion({ ...question, text: e.target.value })
                      }
                      placeholder="Question text"
                      className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                    />
                    <input
                      value={question.points}
                      onChange={(e) =>
                        setQuestion({ ...question, points: e.target.value })
                      }
                      placeholder="Marks"
                      className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                    />
                  </div>
                  <textarea
                    value={question.options}
                    onChange={(e) =>
                      setQuestion({ ...question, options: e.target.value })
                    }
                    placeholder="Options (one per line, prefix * for correct)"
                    className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm w-full"
                    rows={3}
                  />
                  <div className="flex items-center gap-4 text-sm text-slate-200">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={question.tags.important}
                        onChange={(e) =>
                          setQuestion({
                            ...question,
                            tags: {
                              ...question.tags,
                              important: e.target.checked,
                            },
                          })
                        }
                      />
                      <span className="flex items-center gap-1 text-amber-300">
                        <FaStar /> Important
                      </span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={question.tags.past}
                        onChange={(e) =>
                          setQuestion({
                            ...question,
                            tags: { ...question.tags, past: e.target.checked },
                          })
                        }
                      />
                      <span className="flex items-center gap-1 text-sky-300">
                        <FaHistory /> Past Question
                      </span>
                    </label>
                    <button
                      onClick={handleAddQuestion}
                      disabled={saving}
                      className="ml-auto bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-4 py-2 text-sm font-semibold"
                    >
                      <FaPlus className="inline mr-1" /> Add Question
                    </button>
                  </div>
                </div>

                {/* Chapters + questions list */}
                <div className="space-y-4">
                  {chapters.length === 0 && (
                    <div className="text-slate-400 text-sm">
                      No chapters yet.
                    </div>
                  )}
                  {chapters.map((ch) => (
                    <div
                      key={ch._id}
                      className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 space-y-3"
                    >
                      <div className="flex items-center gap-2 text-white">
                        <FaListUl className="text-emerald-400" />
                        <div className="font-semibold">{ch.title}</div>
                        <span className="text-xs text-slate-400">
                          Order {ch.order}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {(ch.questions || []).map((q) => (
                          <div
                            key={q._id}
                            className="bg-slate-900/60 border border-slate-700 rounded-lg p-3"
                          >
                            <div className="text-white font-semibold">
                              {q.text}
                            </div>
                            <div className="text-slate-400 text-xs mb-1">
                              Marks: {q.points}
                            </div>
                            <div className="flex flex-wrap gap-2 mb-2">
                              {q.tags?.includes("important") && (
                                <span className="px-2 py-1 text-xs rounded-full bg-amber-500/20 text-amber-200">
                                  Important
                                </span>
                              )}
                              {q.tags?.includes("past") && (
                                <span className="px-2 py-1 text-xs rounded-full bg-sky-500/20 text-sky-200">
                                  Past
                                </span>
                              )}
                            </div>
                            <div className="space-y-1">
                              {q.options?.map((opt, idx) => (
                                <div
                                  key={idx}
                                  className={`text-slate-200 text-sm flex items-start gap-2 ${
                                    opt.isCorrect
                                      ? "bg-emerald-900/40 border border-emerald-700"
                                      : "bg-slate-900/40 border border-slate-800"
                                  } rounded px-2 py-1`}
                                >
                                  <span className="text-slate-500 text-xs mt-[2px]">
                                    {String.fromCharCode(65 + idx)}.
                                  </span>
                                  <span>{opt.text}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                        {(ch.questions || []).length === 0 && (
                          <div className="text-slate-400 text-sm">
                            No questions yet.
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
