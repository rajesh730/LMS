"use client";

import { useCallback, useEffect, useState } from "react";
import {
  FaExchangeAlt,
  FaCheck,
  FaTimes,
  FaArrowRight,
  FaUserPlus,
} from "react-icons/fa";
import AlertBanner from "@/components/ui/AlertBanner";

function schoolName(school) {
  return school?.schoolName || school?.name || "Another school";
}

export default function StudentTransferPanel({ grades = [], onChanged }) {
  const [open, setOpen] = useState(false);
  const [transfers, setTransfers] = useState({ incoming: [], outgoing: [] });
  const [busyId, setBusyId] = useState("");
  const [feedback, setFeedback] = useState(null);

  // Claim modal
  const [modalOpen, setModalOpen] = useState(false);
  const [step, setStep] = useState("search");
  const [form, setForm] = useState({
    platformStudentId: "",
    dateOfBirth: "",
    toGrade: "",
    toRollNumber: "",
  });
  const [found, setFound] = useState(null);
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/students/transfer", { cache: "no-store" });
      const json = await res.json();
      if (res.ok) {
        setTransfers({
          incoming: json.data?.incoming || [],
          outgoing: json.data?.outgoing || [],
        });
      }
    } catch {
      // non-fatal
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const pendingIncoming = transfers.incoming.filter((t) => t.status === "PENDING");
  const pendingOutgoing = transfers.outgoing.filter((t) => t.status === "PENDING");
  const pendingCount = pendingIncoming.length + pendingOutgoing.length;

  const decide = async (id, action) => {
    try {
      setBusyId(id);
      setFeedback(null);
      const res = await fetch(`/api/students/transfer/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Action failed");
      setFeedback({ type: "success", title: "Done", message: json.message });
      await load();
      onChanged?.();
    } catch (error) {
      setFeedback({ type: "error", title: "Action failed", message: error.message });
    } finally {
      setBusyId("");
    }
  };

  const resetModal = () => {
    setStep("search");
    setForm({ platformStudentId: "", dateOfBirth: "", toGrade: "", toRollNumber: "" });
    setFound(null);
  };

  const searchStudent = async () => {
    try {
      setWorking(true);
      setFeedback(null);
      const res = await fetch("/api/students/transfer/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platformStudentId: form.platformStudentId.trim(),
          dateOfBirth: form.dateOfBirth,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Lookup failed");
      setFound(json.data.student);
      setForm((prev) => ({ ...prev, toGrade: json.data.student.grade || "" }));
      setStep("confirm");
    } catch (error) {
      setFeedback({ type: "error", title: "Not found", message: error.message });
    } finally {
      setWorking(false);
    }
  };

  const submitClaim = async () => {
    try {
      setWorking(true);
      setFeedback(null);
      const res = await fetch("/api/students/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platformStudentId: form.platformStudentId.trim(),
          dateOfBirth: form.dateOfBirth,
          toGrade: form.toGrade,
          toRollNumber: form.toRollNumber.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Request failed");
      setFeedback({ type: "success", title: "Request sent", message: json.message });
      setModalOpen(false);
      resetModal();
      await load();
    } catch (error) {
      setFeedback({ type: "error", title: "Request failed", message: error.message });
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="rounded-2xl border border-[#e1e7f2] bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 text-left"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]">
            <FaExchangeAlt />
          </span>
          <span>
            <span className="block text-sm font-black text-[#17120a]">
              Student Transfers
            </span>
            <span className="block text-xs text-[#52657d]">
              Bring in a student from another school, or approve students leaving.
            </span>
          </span>
          {pendingCount > 0 && (
            <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-black text-white">
              {pendingCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => {
            resetModal();
            setModalOpen(true);
          }}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-purple-700 px-4 text-sm font-black text-white shadow-sm transition hover:bg-purple-800"
        >
          <FaUserPlus />
          Transfer in a student
        </button>
      </div>

      {feedback && (
        <div className="mt-3">
          <AlertBanner type={feedback.type} title={feedback.title} message={feedback.message} />
        </div>
      )}

      {open && (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {/* Incoming: students leaving us — we approve */}
          <div className="rounded-xl border border-[#e1e7f2] bg-[#f8fbff] p-4">
            <p className="text-sm font-black text-[#17120a]">
              Leaving your school ({pendingIncoming.length})
            </p>
            <p className="mt-1 text-xs text-[#52657d]">
              Another school is claiming these students. Approve to release them.
            </p>
            <div className="mt-3 space-y-2">
              {pendingIncoming.length === 0 ? (
                <p className="text-xs text-[#75869b]">No pending requests.</p>
              ) : (
                pendingIncoming.map((t) => (
                  <div
                    key={t._id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-[#e1e7f2] bg-white p-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-[#17120a]">
                        {t.studentNameSnapshot || "Student"}
                      </p>
                      <p className="truncate text-xs text-[#52657d]">
                        → {schoolName(t.toSchool)} · {t.toGrade}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <button
                        type="button"
                        disabled={busyId === t._id}
                        onClick={() => decide(t._id, "approve")}
                        className="inline-flex h-8 items-center gap-1 rounded-lg bg-emerald-600 px-2.5 text-xs font-black text-white hover:bg-emerald-500 disabled:opacity-50"
                      >
                        <FaCheck /> Approve
                      </button>
                      <button
                        type="button"
                        disabled={busyId === t._id}
                        onClick={() => decide(t._id, "reject")}
                        className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#e1e7f2] bg-white px-2.5 text-xs font-black text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                      >
                        <FaTimes /> Reject
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Outgoing: we are claiming — awaiting origin */}
          <div className="rounded-xl border border-[#e1e7f2] bg-[#f8fbff] p-4">
            <p className="text-sm font-black text-[#17120a]">
              Coming to your school ({pendingOutgoing.length})
            </p>
            <p className="mt-1 text-xs text-[#52657d]">
              Waiting for the current school to approve.
            </p>
            <div className="mt-3 space-y-2">
              {pendingOutgoing.length === 0 ? (
                <p className="text-xs text-[#75869b]">No pending requests.</p>
              ) : (
                pendingOutgoing.map((t) => (
                  <div
                    key={t._id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-[#e1e7f2] bg-white p-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-[#17120a]">
                        {t.studentNameSnapshot || "Student"}
                      </p>
                      <p className="truncate text-xs text-[#52657d]">
                        from {schoolName(t.fromSchool)} · {t.toGrade}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={busyId === t._id}
                      onClick={() => decide(t._id, "cancel")}
                      className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border border-[#e1e7f2] bg-white px-2.5 text-xs font-black text-[#52657d] hover:bg-[#f1f5fb] disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Claim modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(16,20,47,0.5)] p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-[#e1e7f2] bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-[#17120a]">
                Transfer in a student
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg px-2 py-1 text-sm font-bold text-[#52657d] hover:bg-[#f1f5fb]"
              >
                <FaTimes />
              </button>
            </div>

            {feedback && (
              <div className="mt-3">
                <AlertBanner type={feedback.type} title={feedback.title} message={feedback.message} />
              </div>
            )}

            {step === "search" ? (
              <div className="mt-4 space-y-3">
                <p className="text-xs text-[#52657d]">
                  Ask the student for their Pravyo platform ID, then verify with
                  their date of birth.
                </p>
                <div>
                  <label className="mb-1 block text-xs font-bold text-[#27344a]">
                    Platform student ID
                  </label>
                  <input
                    value={form.platformStudentId}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, platformStudentId: e.target.value }))
                    }
                    placeholder="STU-2025-123456"
                    className="w-full rounded-xl border border-[#dbe5f4] bg-white px-3 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-[#27344a]">
                    Date of birth
                  </label>
                  <input
                    type="date"
                    value={form.dateOfBirth}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, dateOfBirth: e.target.value }))
                    }
                    className="w-full rounded-xl border border-[#dbe5f4] bg-white px-3 py-2.5 text-sm"
                  />
                </div>
                <button
                  type="button"
                  onClick={searchStudent}
                  disabled={working || !form.platformStudentId || !form.dateOfBirth}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-purple-700 px-4 py-2.5 text-sm font-black text-white transition hover:bg-purple-800 disabled:opacity-50"
                >
                  {working ? "Searching..." : "Find student"}
                  {!working && <FaArrowRight />}
                </button>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <div className="rounded-xl border border-[#e1e7f2] bg-[#f8fbff] p-3">
                  <p className="text-sm font-black text-[#17120a]">{found?.name}</p>
                  <p className="text-xs text-[#52657d]">
                    Currently at {found?.currentSchoolName} · {found?.grade}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-bold text-[#27344a]">
                      Target grade
                    </label>
                    {grades.length > 0 ? (
                      <select
                        value={form.toGrade}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, toGrade: e.target.value }))
                        }
                        className="w-full rounded-xl border border-[#dbe5f4] bg-white px-3 py-2.5 text-sm"
                      >
                        <option value="">Select grade</option>
                        {grades.map((g) => (
                          <option key={g} value={g}>
                            {g}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        value={form.toGrade}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, toGrade: e.target.value }))
                        }
                        placeholder="Grade 10"
                        className="w-full rounded-xl border border-[#dbe5f4] bg-white px-3 py-2.5 text-sm"
                      />
                    )}
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-[#27344a]">
                      Roll number
                    </label>
                    <input
                      value={form.toRollNumber}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, toRollNumber: e.target.value }))
                      }
                      placeholder="Optional"
                      className="w-full rounded-xl border border-[#dbe5f4] bg-white px-3 py-2.5 text-sm"
                    />
                  </div>
                </div>
                <p className="text-xs text-[#52657d]">
                  Their current school must approve. Their achievements and writing
                  stay on their profile.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setStep("search")}
                    className="inline-flex flex-1 items-center justify-center rounded-xl border border-[#dbe5f4] bg-white px-4 py-2.5 text-sm font-black text-[#52657d] hover:bg-[#f1f5fb]"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={submitClaim}
                    disabled={working || !form.toGrade}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-purple-700 px-4 py-2.5 text-sm font-black text-white hover:bg-purple-800 disabled:opacity-50"
                  >
                    {working ? "Sending..." : "Send request"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
