"use client";

import { useEffect, useState } from "react";
import { FaCalendarAlt, FaBookOpen, FaGamepad } from "react-icons/fa";

export default function StudentClassContent() {
  const [data, setData] = useState({ events: [], notes: [], games: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/student/class-content", {
          cache: "no-store",
        });
        if (!res.ok) {
          const msg = `Failed to load class content (status ${res.status})`;
          throw new Error(msg);
        }
        const json = await res.json();
        setData(json.data || { events: [], notes: [], games: [] });
      } catch (err) {
        console.error("class content error", err);
        setError(
          "Grade content is not available yet. Make sure you are logged in as a student with an assigned grade."
        );
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 text-slate-300">
        Loading your class updates...
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/30 border border-red-700 text-red-100 p-4 rounded-xl text-sm">
        {error}
      </div>
    );
  }

  const { events, notes, games } = data;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Events */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-center gap-2 text-white mb-3">
          <FaCalendarAlt className="text-yellow-400" />
          <h3 className="text-lg font-semibold">Class Events</h3>
        </div>
        {events.length === 0 ? (
          <p className="text-slate-400 text-sm">
            No upcoming events for your class.
          </p>
        ) : (
          <div className="space-y-3">
            {events.map((ev) => (
              <div
                key={ev._id}
                className="bg-slate-800/60 border border-slate-700 rounded-xl p-3"
              >
                <div className="text-white font-semibold">{ev.title}</div>
                <div className="text-slate-400 text-sm line-clamp-2">
                  {ev.description}
                </div>
                <div className="text-slate-300 text-xs mt-1">
                  {new Date(ev.date).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-center gap-2 text-white mb-3">
          <FaBookOpen className="text-emerald-400" />
          <h3 className="text-lg font-semibold">Notes from Teachers</h3>
        </div>
        {notes.length === 0 ? (
          <p className="text-slate-400 text-sm">No notes shared yet.</p>
        ) : (
          <div className="space-y-3">
            {notes.map((note) => (
              <div
                key={note._id}
                className="bg-slate-800/60 border border-slate-700 rounded-xl p-3"
              >
                <div className="text-white font-semibold">{note.title}</div>
                <div className="text-slate-300 text-sm whitespace-pre-line">
                  {note.content}
                </div>
                <div className="text-slate-500 text-xs mt-1">
                  {new Date(note.createdAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Games */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-center gap-2 text-white mb-3">
          <FaGamepad className="text-purple-400" />
          <h3 className="text-lg font-semibold">Practice Games (MCQ)</h3>
        </div>
        {games.length === 0 ? (
          <p className="text-slate-400 text-sm">
            No practice questions right now.
          </p>
        ) : (
          <div className="space-y-3">
            {games.map((q) => (
              <div
                key={q._id}
                className="bg-slate-800/60 border border-slate-700 rounded-xl p-3"
              >
                <div className="text-white font-semibold">{q.text}</div>
                <div className="text-slate-400 text-xs mb-2">
                  Marks: {q.points || 1}
                </div>
                <div className="space-y-1">
                  {q.options?.map((opt, idx) => (
                    <div
                      key={idx}
                      className="text-slate-200 text-sm flex items-start gap-2 bg-slate-900/60 rounded px-2 py-1"
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
          </div>
        )}
      </div>
    </div>
  );
}
