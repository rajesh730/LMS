"use client";

import { useCallback, useEffect, useState } from "react";
import { FaCheck, FaExchangeAlt, FaTimes } from "react-icons/fa";
import AlertBanner from "@/components/ui/AlertBanner";

function schoolName(school) {
  return school?.schoolName || school?.name || "School";
}

function studentName(transfer) {
  return transfer.student?.name || transfer.studentNameSnapshot || "Student";
}

export default function StudentTransferPanel({ grades = [], onChanged }) {
  const [open, setOpen] = useState(false);
  const [transfers, setTransfers] = useState({
    releaseRequests: [],
    releasedTransfers: [],
    admissionRequests: [],
    incoming: [],
    outgoing: [],
  });
  const [busyId, setBusyId] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [admissionDrafts, setAdmissionDrafts] = useState({});
  const [rollInfo, setRollInfo] = useState({});
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/students/transfer", { cache: "no-store" });
      const json = await res.json();
      if (res.ok) {
        setTransfers({
          releaseRequests: json.data?.releaseRequests || [],
          releasedTransfers: json.data?.releasedTransfers || [],
          admissionRequests: json.data?.admissionRequests || [],
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

  const releaseRequests = transfers.releaseRequests || [];
  const releasedTransfers = transfers.releasedTransfers || [];
  const admissionRequests = transfers.admissionRequests || [];
  const legacyIncoming = (transfers.incoming || []).filter((t) => t.status === "PENDING");
  const legacyOutgoing = (transfers.outgoing || []).filter((t) => t.status === "PENDING");
  const pendingCount =
    releaseRequests.length +
    releasedTransfers.length +
    admissionRequests.length +
    legacyIncoming.length +
    legacyOutgoing.length;

  const decide = async (id, action, body = {}) => {
    try {
      setBusyId(id);
      setFeedback(null);
      const res = await fetch(`/api/students/transfer/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...body }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Action failed");
      setFeedback({ type: "success", title: "Transfer updated", message: json.message });
      await load();
      onChanged?.();
    } catch (error) {
      setFeedback({ type: "error", title: "Action failed", message: error.message });
    } finally {
      setBusyId("");
    }
  };

  const updateAdmissionDraft = (id, patch) => {
    setAdmissionDrafts((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || {}), ...patch },
    }));
  };

  const openReject = (id, action) => {
    setRejectTarget({ id, action });
    setRejectReason("");
  };

  const confirmReject = async () => {
    if (!rejectTarget) return;
    const { id, action } = rejectTarget;
    const reason = rejectReason.trim();
    setRejectTarget(null);
    setRejectReason("");
    await decide(id, action, { reason });
  };

  // Inline reason box shown under a row's Reject button before confirming.
  const renderRejectBox = (transfer) => {
    if (rejectTarget?.id !== transfer._id) return null;
    return (
      <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3">
        <label className="block text-xs font-black text-rose-700">
          Reason for rejection (shared with the student)
        </label>
        <textarea
          value={rejectReason}
          maxLength={300}
          autoFocus
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="e.g. Dues pending, please clear before transfer."
          className="mt-1 min-h-16 w-full rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm outline-none"
        />
        <div className="mt-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setRejectTarget(null);
              setRejectReason("");
            }}
            className="inline-flex h-8 items-center rounded-lg border border-[#e1e7f2] bg-white px-3 text-xs font-black text-[#52657d] hover:bg-[#f8fbff]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busyId === transfer._id}
            onClick={confirmReject}
            className="inline-flex h-8 items-center rounded-lg bg-rose-600 px-3 text-xs font-black text-white hover:bg-rose-500 disabled:opacity-50"
          >
            Confirm Reject
          </button>
        </div>
      </div>
    );
  };

  // Ask the server for the next free roll number in a grade and prefill it,
  // unless the admin has already typed one. Also stores the taken numbers so the
  // UI can warn before submitting (instead of failing on the server).
  const loadRollSuggestion = useCallback(async (transferId, grade) => {
    if (!grade) return;
    try {
      const res = await fetch(
        `/api/students/transfer/roll-suggestion?grade=${encodeURIComponent(grade)}`,
        { cache: "no-store" }
      );
      const json = await res.json();
      if (!res.ok) return;
      const suggested = json.data?.suggestedRollNumber || "";
      const taken = json.data?.takenRollNumbers || [];
      setRollInfo((prev) => ({ ...prev, [transferId]: { suggested, taken } }));
      setAdmissionDrafts((prev) => {
        const current = prev[transferId] || {};
        if (current.toRollNumber) return prev;
        return { ...prev, [transferId]: { ...current, toRollNumber: suggested } };
      });
    } catch {
      // non-fatal — admin can still type a roll number manually
    }
  }, []);

  const handleGradeChange = (transferId, grade) => {
    updateAdmissionDraft(transferId, { toGrade: grade, toRollNumber: "" });
    setRollInfo((prev) => {
      const next = { ...prev };
      delete next[transferId];
      return next;
    });
    void loadRollSuggestion(transferId, grade);
  };

  // Prefill a suggestion for each incoming admission once it appears.
  const admissionIds = admissionRequests.map((t) => t._id).join(",");
  useEffect(() => {
    admissionRequests.forEach((transfer) => {
      if (rollInfo[transfer._id]) return;
      const grade =
        admissionDrafts[transfer._id]?.toGrade ?? transfer.student?.grade ?? "";
      if (grade) void loadRollSuggestion(transfer._id, grade);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [admissionIds]);

  return (
    <div className="rounded-2xl border border-[#e1e7f2] bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
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
              Approve release requests and admit students joining your school.
            </span>
          </span>
          {pendingCount > 0 && (
            <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-black text-white">
              {pendingCount}
            </span>
          )}
        </button>
      </div>

      {feedback && (
        <div className="mt-3">
          <AlertBanner type={feedback.type} title={feedback.title} message={feedback.message} />
        </div>
      )}

      {open && (
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <div className="rounded-xl border border-[#e1e7f2] bg-[#f8fbff] p-4">
            <p className="text-sm font-black text-[#17120a]">
              Transfer Approvals ({releaseRequests.length})
            </p>
            <p className="mt-1 text-xs text-[#52657d]">
              Students from your school requesting a transfer code.
            </p>
            <div className="mt-3 space-y-2">
              {releaseRequests.length === 0 ? (
                <p className="text-xs text-[#75869b]">No release requests.</p>
              ) : (
                releaseRequests.map((transfer) => (
                  <div
                    key={transfer._id}
                    className="rounded-lg border border-[#e1e7f2] bg-white p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-[#17120a]">
                          {studentName(transfer)}
                        </p>
                        <p className="mt-1 text-xs text-[#52657d]">
                          {transfer.student?.grade || "Grade not set"} · Roll{" "}
                          {transfer.student?.rollNumber || "not set"}
                        </p>
                        {transfer.reason && (
                          <p className="mt-2 text-xs leading-5 text-[#52657d]">
                            {transfer.reason}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 gap-1.5">
                        <button
                          type="button"
                          disabled={busyId === transfer._id}
                          onClick={() => decide(transfer._id, "approve_release")}
                          className="inline-flex h-8 items-center gap-1 rounded-lg bg-emerald-600 px-2.5 text-xs font-black text-white hover:bg-emerald-500 disabled:opacity-50"
                        >
                          <FaCheck /> Approve
                        </button>
                        <button
                          type="button"
                          disabled={busyId === transfer._id}
                          onClick={() => openReject(transfer._id, "reject_release")}
                          className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#e1e7f2] bg-white px-2.5 text-xs font-black text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                        >
                          <FaTimes /> Reject
                        </button>
                      </div>
                    </div>
                    {renderRejectBox(transfer)}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-xl border border-[#e1e7f2] bg-[#f8fbff] p-4">
            <p className="text-sm font-black text-[#17120a]">
              Released Transfers ({releasedTransfers.length})
            </p>
            <p className="mt-1 text-xs text-[#52657d]">
              Transfer codes already issued. You can cancel until another school admits the student.
            </p>
            <div className="mt-3 space-y-2">
              {releasedTransfers.length === 0 ? (
                <p className="text-xs text-[#75869b]">No active released transfers.</p>
              ) : (
                releasedTransfers.map((transfer) => (
                  <div
                    key={transfer._id}
                    className="rounded-lg border border-[#e1e7f2] bg-white p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-[#17120a]">
                          {studentName(transfer)}
                        </p>
                        <p className="mt-1 text-xs text-[#52657d]">
                          Code {transfer.transferCode || "issued"} ·{" "}
                          {transfer.status === "PENDING_ADMISSION"
                            ? `Waiting for ${schoolName(transfer.toSchool)}`
                            : "Waiting for student to choose school"}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={busyId === transfer._id}
                        onClick={() => decide(transfer._id, "cancel")}
                        className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border border-[#e1e7f2] bg-white px-2.5 text-xs font-black text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                      >
                        Cancel Transfer
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-xl border border-[#e1e7f2] bg-[#f8fbff] p-4">
            <p className="text-sm font-black text-[#17120a]">
              Incoming Admissions ({admissionRequests.length})
            </p>
            <p className="mt-1 text-xs text-[#52657d]">
              Released students asking to join your school.
            </p>
            <div className="mt-3 space-y-3">
              {admissionRequests.length === 0 ? (
                <p className="text-xs text-[#75869b]">No admission requests.</p>
              ) : (
                admissionRequests.map((transfer) => {
                  const draft = admissionDrafts[transfer._id] || {};
                  const toGrade = draft.toGrade ?? transfer.student?.grade ?? "";
                  const toRollNumber = draft.toRollNumber ?? "";
                  const info = rollInfo[transfer._id];
                  const trimmedRoll = String(toRollNumber).trim();
                  const rollTaken = Boolean(
                    info?.taken?.includes(trimmedRoll) && trimmedRoll
                  );

                  return (
                    <div
                      key={transfer._id}
                      className="rounded-lg border border-[#e1e7f2] bg-white p-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-[#17120a]">
                          {studentName(transfer)}
                        </p>
                        <p className="mt-1 text-xs text-[#52657d]">
                          From {schoolName(transfer.fromSchool)} · Code{" "}
                          {transfer.transferCode || "issued"}
                        </p>
                      </div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {grades.length > 0 ? (
                          <select
                            value={toGrade}
                            onChange={(e) =>
                              handleGradeChange(transfer._id, e.target.value)
                            }
                            className="h-10 rounded-lg border border-[#dbe5f4] bg-white px-3 text-sm font-semibold text-[#17120a]"
                          >
                            <option value="">Select grade</option>
                            {grades.map((grade) => (
                              <option key={grade} value={grade}>
                                {grade}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            value={toGrade}
                            onChange={(e) =>
                              handleGradeChange(transfer._id, e.target.value)
                            }
                            placeholder="Grade"
                            className="h-10 rounded-lg border border-[#dbe5f4] bg-white px-3 text-sm"
                          />
                        )}
                        <input
                          value={toRollNumber}
                          onChange={(e) =>
                            updateAdmissionDraft(transfer._id, {
                              toRollNumber: e.target.value,
                            })
                          }
                          placeholder="Roll number"
                          className={`h-10 rounded-lg border bg-white px-3 text-sm ${
                            rollTaken ? "border-rose-400" : "border-[#dbe5f4]"
                          }`}
                        />
                      </div>
                      {toGrade && (
                        <div className="mt-2 text-xs">
                          {rollTaken ? (
                            <p className="font-semibold text-rose-600">
                              Roll number {trimmedRoll} is already used in{" "}
                              {toGrade}.{" "}
                              {info?.suggested && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateAdmissionDraft(transfer._id, {
                                      toRollNumber: info.suggested,
                                    })
                                  }
                                  className="font-black text-purple-700 underline"
                                >
                                  Use {info.suggested}
                                </button>
                              )}
                            </p>
                          ) : (
                            info?.suggested && (
                              <p className="text-[#52657d]">
                                Next available in {toGrade}:{" "}
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateAdmissionDraft(transfer._id, {
                                      toRollNumber: info.suggested,
                                    })
                                  }
                                  className="font-black text-purple-700 underline"
                                >
                                  {info.suggested}
                                </button>
                              </p>
                            )
                          )}
                        </div>
                      )}
                      <div className="mt-3 flex justify-end gap-2">
                        <button
                          type="button"
                          disabled={busyId === transfer._id}
                          onClick={() => openReject(transfer._id, "reject_admission")}
                          className="inline-flex h-9 items-center gap-1 rounded-lg border border-[#e1e7f2] bg-white px-3 text-xs font-black text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          disabled={
                            busyId === transfer._id ||
                            !toGrade ||
                            !trimmedRoll ||
                            rollTaken
                          }
                          onClick={() =>
                            decide(transfer._id, "approve_admission", {
                              toGrade,
                              toRollNumber: trimmedRoll,
                            })
                          }
                          className="inline-flex h-9 items-center gap-1 rounded-lg bg-emerald-600 px-3 text-xs font-black text-white hover:bg-emerald-500 disabled:opacity-50"
                        >
                          Admit Student
                        </button>
                      </div>
                      {renderRejectBox(transfer)}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {(legacyIncoming.length > 0 || legacyOutgoing.length > 0) && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 xl:col-span-2">
              <p className="text-sm font-black text-amber-900">
                Legacy transfer requests
              </p>
              <p className="mt-1 text-xs text-amber-800">
                These were created before the student-initiated transfer flow.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
