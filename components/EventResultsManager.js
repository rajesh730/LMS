"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import {
  FaAward,
  FaCertificate,
  FaCheckCircle,
  FaDownload,
  FaEllipsisH,
  FaEye,
  FaMedal,
  FaSearch,
  FaTrophy,
  FaUndo,
  FaUsers,
} from "react-icons/fa";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

function formatStatus(value) {
  if (value === "RUNNER_UP") return "1st Runner Up";
  if (value === "THIRD_PLACE") return "2nd Runner Up";
  if (value === "NOT_ATTEMPTED") return "Not Attempted";
  return String(value || "").replaceAll("_", " ");
}

function statusTone(status) {
  if (status === "WINNER") return "border-amber-200 bg-amber-50 text-amber-800";
  if (status === "RUNNER_UP") return "border-slate-200 bg-slate-100 text-slate-700";
  if (status === "THIRD_PLACE") return "border-orange-200 bg-orange-50 text-orange-700";
  if (status === "FINALIST" || status === "SELECTED") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }
  if (status === "DISQUALIFIED") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function placementIcon(status, index) {
  if (status === "WINNER") return <FaTrophy />;
  if (status === "RUNNER_UP" || status === "THIRD_PLACE") return <FaMedal />;
  if (status === "FINALIST" || status === "SELECTED") return <FaAward />;
  return index + 1;
}

export default function EventResultsManager({
  title = "Event Results",
  description = "Review final statuses and publish certificates.",
  fixedEventId = "",
  embedded = false,
  readOnly = false,
}) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [editingCertificate, setEditingCertificate] = useState(null);
  const [certificateName, setCertificateName] = useState("");
  const [expandedTeams, setExpandedTeams] = useState({});
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [publishPublicly, setPublishPublicly] = useState(false);
  const [reopenOpen, setReopenOpen] = useState(false);

  const eventId = fixedEventId;

  const loadDetail = useCallback(async () => {
    if (!eventId) return;
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`/api/events/${eventId}/results`, {
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "Failed to load results.");
      }
      setDetail(data.data);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const participants = useMemo(() => detail?.participants || [], [detail?.participants]);
  const issuedResults = useMemo(() => detail?.results || [], [detail?.results]);
  const isTeamEvent =
    String(detail?.event?.participationFormat || "INDIVIDUAL").toUpperCase() ===
    "TEAM";
  const isPlatformEvent =
    String(detail?.event?.eventScope || "").toUpperCase() === "PLATFORM";
  const resultsPublished = Boolean(detail?.event?.resultsPublished);

  // Mirror the event's current public-visibility setting whenever results load,
  // so the organizer's "make public" choice starts from the saved state.
  useEffect(() => {
    setPublishPublicly(Boolean(detail?.publishPublicly));
  }, [detail?.publishPublicly]);

  const saveResults = useCallback(async ({ publish = false, reopen = false } = {}) => {
    if (!eventId || participants.length === 0) return;
    try {
      setSaving(true);
      setMessage(
        publish
          ? "Publishing final results and issuing certificates..."
          : reopen
          ? "Reopening results for correction..."
          : "Preparing draft results and certificate previews..."
      );
      setError("");
      const res = await fetch(`/api/events/${eventId}/results`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resultsPublished: publish,
          publishPublicly: publish && isPlatformEvent ? publishPublicly : false,
          confirmPublish: publish,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "Failed to save results.");
      }
      setMessage(
        publish
          ? "Final results published and certificates issued."
          : reopen
          ? "Results reopened. Fix the placements in the Rounds tab, then publish again."
          : "Draft results and certificate previews are ready for review."
      );
      await loadDetail();
    } catch (saveError) {
      setError(saveError.message);
      setMessage("");
    } finally {
      setSaving(false);
    }
  }, [eventId, loadDetail, participants.length, isPlatformEvent, publishPublicly]);

  const resultSummary = useMemo(() => {
    const source = participants;
    return {
      winnerCount: source.filter((participant) => participant.finalStatus === "WINNER")
        .length,
      runnerUpCount: source.filter(
        (participant) => participant.finalStatus === "RUNNER_UP"
      ).length,
      thirdPlaceCount: source.filter(
        (participant) => participant.finalStatus === "THIRD_PLACE"
      ).length,
      finalistCount: source.filter(
        (participant) =>
          participant.finalStatus === "FINALIST" ||
          participant.finalStatus === "SELECTED"
      ).length,
      participantCount: source.length,
      certificateCount: issuedResults.filter((result) => result.certificateIssuedAt)
        .length,
    };
  }, [issuedResults, participants]);

  const filteredParticipants = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return participants.filter((participant) => {
      const status = participant.finalStatus || "";
      const statusMatches = statusFilter === "ALL" || status === statusFilter;
      const participantName = isTeamEvent
        ? participant.teamName || "School Team"
        : participant.student?.name || participant.teamName || "Student";
      const schoolName = participant.school?.schoolName || "School";
      const searchMatches =
        !normalizedSearch ||
        `${participantName} ${schoolName}`.toLowerCase().includes(normalizedSearch);
      return statusMatches && searchMatches;
    });
  }, [isTeamEvent, participants, searchTerm, statusFilter]);

  const groupedIssuedResults = useMemo(() => {
    if (!isTeamEvent) return [];
    const teamRows = issuedResults.filter(
      (result) => String(result.recipientType || "STUDENT").toUpperCase() === "TEAM"
    );
    const memberRows = issuedResults.filter(
      (result) => String(result.recipientType || "STUDENT").toUpperCase() !== "TEAM"
    );
    const membersByParent = new Map();
    memberRows.forEach((result) => {
      const parentId = String(
        result.parentAchievement?._id || result.parentAchievement || ""
      );
      if (!parentId) return;
      if (!membersByParent.has(parentId)) membersByParent.set(parentId, []);
      membersByParent.get(parentId).push(result);
    });

    return teamRows.map((team) => ({
      team,
      members: membersByParent.get(String(team._id)) || [],
    }));
  }, [isTeamEvent, issuedResults]);

  const openCertificateEditor = (result) => {
    setEditingCertificate(result);
    setCertificateName(
      result.certificateRecipientName ||
        result.teamName ||
        result.student?.name ||
        "Student"
    );
  };

  const updateCertificateName = async () => {
    if (!editingCertificate) return;
    try {
      setSaving(true);
      setError("");
      setMessage("");
      const targetId = editingCertificate.resultId || editingCertificate._id;
      const res = await fetch(`/api/events/${eventId}/results/${targetId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save",
          certificateRecipientName: certificateName,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "Failed to update certificate name.");
      }
      setEditingCertificate(null);
      setMessage(data.message || "Certificate name updated.");
      await loadDetail();
    } catch (updateError) {
      setError(updateError.message);
    } finally {
      setSaving(false);
    }
  };

  const bulkDownloadCertificates = () => {
    const certificateIds = issuedResults
      .filter((result) => result.certificateIssuedAt)
      .map((result) => {
        const targetId = result.resultId || result._id;
        return targetId ? String(targetId) : "";
      })
      .filter(Boolean);

    if (!certificateIds.length) {
      setError("No certificate PDFs are ready for bulk download yet.");
      return;
    }

    const params = new URLSearchParams({
      ids: certificateIds.join(","),
      download: "pdf",
    });
    window.open(`/certificates/bulk?${params.toString()}`, "_blank", "noopener,noreferrer");
    setMessage("Opened one bulk certificate print file. Use Save as PDF in the print dialog.");
  };

  const toggleTeamExpansion = (teamId) => {
    setExpandedTeams((current) => ({
      ...current,
      [teamId]: !current[teamId],
    }));
  };

  const statusFilters = [
    ["ALL", "All Status", participants.length],
    ["WINNER", "Winner", resultSummary.winnerCount],
    ["RUNNER_UP", "1st Runner Up", resultSummary.runnerUpCount],
    ["THIRD_PLACE", "2nd Runner Up", resultSummary.thirdPlaceCount],
    ["FINALIST", "Finalists", resultSummary.finalistCount],
    ["DISQUALIFIED", "Disqualified", participants.filter((p) => p.finalStatus === "DISQUALIFIED").length],
  ];

  const statCards = [
    ["Winner", resultSummary.winnerCount, FaTrophy, "border-amber-200 bg-amber-50 text-amber-700"],
    ["1st Runner Up", resultSummary.runnerUpCount, FaAward, "border-blue-200 bg-blue-50 text-blue-700"],
    ["2nd Runner Up", resultSummary.thirdPlaceCount, FaMedal, "border-orange-200 bg-orange-50 text-orange-700"],
    ["Finalists", resultSummary.finalistCount, FaMedal, "border-sky-200 bg-sky-50 text-sky-700"],
    ["Participants", resultSummary.participantCount, FaUsers, "border-emerald-200 bg-emerald-50 text-emerald-700"],
    ["Certificates Issued", resultSummary.certificateCount, FaCertificate, "border-purple-200 bg-purple-50 text-purple-700"],
  ];

  return (
    <div className="space-y-5">
      <section
        className={
          embedded
            ? "rounded-lg border border-[#dbe5f4] bg-white p-4 shadow-sm"
            : "rounded-lg border border-[#1c4a8d] bg-[#081b39]/70 p-5"
        }
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-xl text-purple-700">
              <FaTrophy />
            </span>
            <div>
              <h2 className={`text-xl font-black ${embedded ? "text-[#17120a]" : "text-white"}`}>
                {title}
              </h2>
              <p className={`mt-1 text-xs font-semibold ${embedded ? "text-[#52657d]" : "text-[#cddfff]"}`}>
                {description}
              </p>
              <div className="mt-3 flex flex-wrap gap-3 text-[11px] font-bold text-[#52657d]">
                <span>{detail?.event?.date ? new Date(detail.event.date).toLocaleDateString() : "Event date"}</span>
                <span>
                  {resultSummary.certificateCount} / {participants.length}{" "}
                  certificate{participants.length === 1 ? "" : "s"} issued
                </span>
                <span className="inline-flex items-center gap-1 text-emerald-700">
                  <FaCheckCircle />
                  {saving
                    ? "Saving"
                    : resultsPublished
                    ? "Published"
                    : "Ready to publish"}
                </span>
              </div>
            </div>
          </div>
          {!readOnly && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {isPlatformEvent && !resultsPublished && (
              <label
                className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold ${
                  embedded
                    ? "border-[#dbe5f4] bg-white text-[#0a2f66]"
                    : "border-[#1c4a8d] bg-[#081b39]/60 text-[#cddfff]"
                }`}
                title="When enabled, these results and certificates appear on the public event page."
              >
                <input
                  type="checkbox"
                  checked={publishPublicly}
                  disabled={saving || loading}
                  onChange={(e) => setPublishPublicly(e.target.checked)}
                />
                Make results public
              </label>
            )}
            <button
              type="button"
              disabled={saving || loading || participants.length === 0 || resultsPublished}
              onClick={() => saveResults({ publish: true })}
              className="inline-flex min-h-10 items-center justify-center rounded-lg bg-[#0a2f66] px-4 text-xs font-black text-white hover:bg-[#1150a1] disabled:opacity-50"
            >
              Publish Final Results
            </button>
            {resultsPublished && (
              <button
                type="button"
                disabled={saving || loading}
                onClick={() => setReopenOpen(true)}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 text-xs font-black text-amber-800 hover:bg-amber-100 disabled:opacity-50"
              >
                <FaUndo />
                Reopen for Correction
              </button>
            )}
          </div>
          )}
        </div>
        <p className={`mt-3 text-xs font-semibold ${embedded ? "text-[#52657d]" : "text-[#cddfff]"}`}>
          {readOnly
            ? resultsPublished
              ? "Final results are published. You can view the placements and download your certificate below."
              : "Results have not been published yet. Final placements and certificates will appear here once your school publishes them."
            : participants.length === 0
            ? "No participants are enrolled yet. Register students and run the rounds before publishing results."
            : resultsPublished
            ? "Results are published and certificates issued — students and schools can view them. Made a mistake? Use Reopen for Correction to safely edit placements and republish."
            : "Review the placements below, then Publish Final Results to issue certificates. Nothing is issued until you publish."}
        </p>
        {message && <div className="mt-4 text-sm font-semibold text-[#1150a1]">{message}</div>}
        {error && <div className="mt-4 text-sm font-semibold text-[#d97706]">{error}</div>}
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {statCards.map(([label, value, Icon, tone]) => (
          <div key={label} className={`rounded-lg border px-4 py-3 ${tone}`}>
            <div className="flex items-center justify-between gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/80">
                <Icon />
              </span>
              <strong className="text-2xl font-black text-[#17120a]">{value}</strong>
            </div>
            <div className="mt-2 text-xs font-black">{label}</div>
          </div>
        ))}
      </div>

      <section className="rounded-lg border border-[#dbe5f4] bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-black text-[#17120a]">Final Placements</h3>
            <p className="mt-1 text-xs font-semibold text-[#52657d]">
              Draft placements are calculated from approved participation and round history. Publishing requires organizer confirmation.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-10 rounded-lg border border-[#dbe5f4] bg-white px-3 text-xs font-bold text-[#0a2f66] outline-none"
            >
              {statusFilters.map(([value, label, count]) => (
                <option key={value} value={value}>
                  {label} ({count})
                </option>
              ))}
            </select>
            <label className="relative block">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#52657d]" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search participant..."
                className="h-10 w-full rounded-lg border border-[#dbe5f4] bg-white pl-9 pr-3 text-xs font-semibold text-[#0a2f66] outline-none sm:w-64"
              />
            </label>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {statusFilters.slice(1).map(([value, label, count]) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatusFilter(value)}
              className={`rounded-lg border px-4 py-2 text-xs font-black transition ${
                statusFilter === value
                  ? "border-purple-600 bg-purple-50 text-purple-700"
                  : "border-[#dbe5f4] bg-white text-[#0a2f66] hover:bg-[#f8fbff]"
              }`}
            >
              {label} ({count})
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {loading ? (
            <div className="rounded-lg border border-[#dbe5f4] bg-[#f8fbff] px-4 py-8 text-center text-sm font-bold text-[#52657d]">
              Loading results...
            </div>
          ) : filteredParticipants.length === 0 ? (
            <div className="rounded-lg border border-[#dbe5f4] bg-[#f8fbff] px-4 py-8 text-center text-sm font-bold text-[#52657d]">
              No eligible participants found yet.
            </div>
          ) : (
            filteredParticipants.map((participant, index) => {
              const name = isTeamEvent
                ? participant.teamName || "School Team"
                : participant.student?.name || participant.teamName || "Student";
              const status = participant.finalStatus || "PARTICIPANT";
              return (
                <div
                  key={participant.teamKey || participant.studentId}
                  className={`grid gap-3 rounded-lg border px-4 py-3 md:grid-cols-[minmax(0,2fr)_1fr_1fr_1.2fr_auto] md:items-center ${statusTone(status)}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-sm font-black">
                      {placementIcon(status, index)}
                    </span>
                    <div>
                      <div className="font-black text-[#17120a]">{name}</div>
                      <div className="mt-1 text-xs font-semibold text-[#52657d]">
                        {participant.school?.schoolName || "School"}
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-black uppercase text-[#52657d]">Highest Round</div>
                    <div className="text-xs font-black text-[#17120a]">
                      {participant.highestRoundReached > 0
                        ? `Round ${participant.highestRoundReached}`
                        : "Registration"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-black uppercase text-[#52657d]">Certificate Status</div>
                    <div className="inline-flex items-center gap-1 text-xs font-black text-emerald-700">
                      {participant.certificateIssuedAt ? "Issued" : "Draft"} <FaCheckCircle />
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-black uppercase text-[#52657d]">Certificate Name</div>
                    <div className="text-xs font-bold text-[#0a2f66]">
                      {participant.certificateRecipientName || name}
                    </div>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase text-[#0a2f66]">
                    {formatStatus(status)}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </section>

      <section className="rounded-lg border border-[#dbe5f4] bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-black text-[#17120a]">Certificate Management</h3>
            <p className="mt-1 text-xs font-semibold text-[#52657d]">
              Draft certificate records can be reviewed before final certificates are issued.
            </p>
          </div>
          <button
            type="button"
            disabled={saving || !issuedResults.length}
            onClick={bulkDownloadCertificates}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#dbe5f4] bg-white px-4 text-xs font-black text-[#0a2f66] hover:bg-[#f8fbff] disabled:opacity-50"
          >
            <FaDownload />
            Bulk Download
          </button>
        </div>

        <div className="overflow-x-auto rounded-lg border border-[#dbe5f4]">
          <table className="min-w-full text-left">
            <thead className="bg-[#f8fbff] text-[11px] uppercase text-[#52657d]">
              <tr>
                <th className="px-4 py-3">{isTeamEvent ? "Team" : "Student"}</th>
                <th className="px-4 py-3">School</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Certificate State</th>
                <th className="px-4 py-3 text-right">Options</th>
              </tr>
            </thead>
            <tbody>
              {isTeamEvent ? (
                !groupedIssuedResults.length ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-10 text-center text-sm font-bold text-[#52657d]">
                      Prepare draft results to create certificate previews.
                    </td>
                  </tr>
                ) : (
                  groupedIssuedResults.map(({ team, members }) => (
                    <Fragment key={team._id || team.resultId || team.teamName}>
                      <tr className="border-t border-[#edf2f8]">
                        <td className="px-4 py-4 font-black text-[#17120a]">
                          {team.teamName || team.certificateRecipientName || "School Team"}
                          <div className="mt-1 text-xs font-semibold text-[#52657d]">
                            {members.length} member certificate{members.length === 1 ? "" : "s"}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm font-semibold text-[#0a2f66]">
                          {team.school?.schoolName || "School"}
                        </td>
                        <td className="px-4 py-4 text-sm font-semibold text-[#0a2f66]">
                          {formatStatus(team.finalStatus || team.placement)}
                        </td>
                        <td className="px-4 py-4 text-sm font-bold text-emerald-700">
                          {team.certificateIssuedAt ? "Issued" : "Preparing"}
                        </td>
                        <td className="px-4 py-4">
                          <CertificateActions
                            result={team}
                            onEdit={openCertificateEditor}
                            onToggleMembers={() => toggleTeamExpansion(String(team._id))}
                            memberCount={members.length}
                            expanded={expandedTeams[String(team._id)]}
                            canEdit={!readOnly}
                          />
                        </td>
                      </tr>
                      {expandedTeams[String(team._id)] &&
                        members.map((member) => (
                          <tr key={member._id} className="border-t border-[#edf2f8] bg-[#f8fbff]">
                            <td className="px-4 py-4 font-bold text-[#17120a]">
                              {member.certificateRecipientName || member.student?.name || "Student"}
                            </td>
                            <td className="px-4 py-4 text-sm font-semibold text-[#0a2f66]">
                              {team.school?.schoolName || "School"}
                            </td>
                            <td className="px-4 py-4 text-sm font-semibold text-[#0a2f66]">
                              {formatStatus(member.finalStatus || member.placement)}
                            </td>
                            <td className="px-4 py-4 text-sm font-bold text-emerald-700">
                              {member.certificateIssuedAt ? "Issued" : "Preparing"}
                            </td>
                            <td className="px-4 py-4">
                              <CertificateActions result={member} onEdit={openCertificateEditor} canEdit={!readOnly} />
                            </td>
                          </tr>
                        ))}
                    </Fragment>
                  ))
                )
              ) : !issuedResults.length ? (
                <tr>
                  <td colSpan="5" className="px-6 py-10 text-center text-sm font-bold text-[#52657d]">
                    Prepare draft results to create certificate previews.
                  </td>
                </tr>
              ) : (
                issuedResults.map((result) => (
                  <tr key={result._id} className="border-t border-[#edf2f8]">
                    <td className="px-4 py-4 font-black text-[#17120a]">
                      {result.certificateRecipientName ||
                        result.teamName ||
                        result.student?.name ||
                        "Student"}
                    </td>
                    <td className="px-4 py-4 text-sm font-semibold text-[#0a2f66]">
                      {result.school?.schoolName || "School"}
                    </td>
                    <td className="px-4 py-4 text-sm font-semibold text-[#0a2f66]">
                      {formatStatus(result.finalStatus || result.placement)}
                    </td>
                    <td className="px-4 py-4 text-sm font-bold text-emerald-700">
                      {result.certificateIssuedAt ? "Issued" : "Preparing"}
                    </td>
                    <td className="px-4 py-4">
                      <CertificateActions result={result} onEdit={openCertificateEditor} canEdit={!readOnly} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {editingCertificate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-xl rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-black text-[#17120a]">Edit Certificate Name</h3>
              <button
                type="button"
                onClick={() => setEditingCertificate(null)}
                className="text-sm font-bold text-[#52657d] hover:text-[#17120a]"
              >
                Close
              </button>
            </div>
            <label>
              <div className="mb-1 text-sm font-bold text-[#52657d]">
                Name shown on certificate
              </div>
              <input
                value={certificateName}
                onChange={(event) => setCertificateName(event.target.value)}
                className="w-full rounded-lg border border-[#dbe5f4] px-3 py-2.5 text-[#17120a] outline-none focus:border-blue-500"
              />
            </label>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={updateCertificateName}
                disabled={saving}
                className="rounded-lg bg-[#0a2f66] px-4 py-2.5 text-sm font-black text-white hover:bg-[#1150a1] disabled:opacity-60"
              >
                Save Name
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={reopenOpen}
        title="Reopen results for correction?"
        message="Issued certificates will be temporarily withdrawn and results return to draft. Fix the placements in the Rounds tab, then publish again to re-issue corrected certificates."
        confirmLabel="Reopen for correction"
        tone="danger"
        busy={saving}
        onClose={() => setReopenOpen(false)}
        onConfirm={() => {
          setReopenOpen(false);
          saveResults({ reopen: true });
        }}
      />
    </div>
  );
}

function CertificateActions({
  result,
  onEdit,
  onToggleMembers,
  memberCount = 0,
  expanded = false,
  canEdit = true,
}) {
  const targetId = result.resultId || result._id;

  return (
    <div className="flex justify-end gap-2">
      {typeof onToggleMembers === "function" && (
        <button
          type="button"
          onClick={onToggleMembers}
          className="rounded-lg border border-[#dbe5f4] bg-white px-3 py-2 text-xs font-black text-[#0a2f66] hover:bg-[#f8fbff]"
        >
          {expanded ? "Hide" : `Members (${memberCount})`}
        </button>
      )}
      <a
        href={`/certificates/${targetId}?preview=1`}
        target="_blank"
        rel="noreferrer"
        className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f1f5f9] text-[#0a2f66] hover:bg-[#e6edf6]"
        title="Preview certificate"
      >
        <FaEye />
      </a>
      {result.certificateIssuedAt && (
        <a
          href={`/certificates/${targetId}?download=pdf`}
          target="_blank"
          rel="noreferrer"
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f1f5f9] text-[#0a2f66] hover:bg-[#e6edf6]"
          title="Download certificate"
        >
          <FaDownload />
        </a>
      )}
      {canEdit && (
        <button
          type="button"
          onClick={() => onEdit(result)}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f1f5f9] text-[#0a2f66] hover:bg-[#e6edf6]"
          title="Edit certificate name"
        >
          <FaEllipsisH />
        </button>
      )}
    </div>
  );
}
