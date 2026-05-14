"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { FaCertificate, FaDownload, FaEye, FaPaperPlane, FaSave, FaTrophy } from "react-icons/fa";

function formatStatus(value) {
  if (value === "RUNNER_UP") return "Runner Up";
  if (value === "NOT_ATTEMPTED") return "Not Attempted";
  return String(value || "").replaceAll("_", " ");
}

export default function EventResultsManager({
  title = "Event Results",
  description = "Review final statuses and publish certificates.",
  fixedEventId = "",
  embedded = false,
}) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [publishPublicly, setPublishPublicly] = useState(true);
  const [editingCertificate, setEditingCertificate] = useState(null);
  const [certificateName, setCertificateName] = useState("");
  const [expandedTeams, setExpandedTeams] = useState({});

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
      setPublishPublicly(Boolean(data.data.publishPublicly));
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const saveResults = async () => {
    try {
      setSaving(true);
      setMessage("");
      setError("");
      const res = await fetch(`/api/events/${eventId}/results`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resultsPublished: false,
          publishPublicly,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "Failed to save results.");
      }
      setMessage("Result snapshot refreshed from current round statuses.");
      await loadDetail();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

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

  const sendAllCertificatesToSchools = async () => {
    if (!issuedResults.length) return;
    try {
      setSaving(true);
      setError("");
      setMessage("");

      for (const result of issuedResults) {
        const targetId = result._id || result.resultId;
        const res = await fetch(`/api/events/${eventId}/results/${targetId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "send_to_school",
            certificateRecipientName:
              result.certificateRecipientName ||
              result.teamName ||
              result.student?.name ||
              "Student",
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.message || "Failed to send certificates to schools.");
        }
      }

      setMessage("All certificates were sent to their corresponding schools.");
      await loadDetail();
    } catch (sendError) {
      setError(sendError.message);
    } finally {
      setSaving(false);
    }
  };

  const bulkDownloadCertificates = () => {
    const certificateLinks = issuedResults
      .map((result) => {
        const targetId = result.resultId || result._id;
        return targetId ? `/certificates/${targetId}?download=pdf&preview=1` : "";
      })
      .filter(Boolean);

    if (!certificateLinks.length) {
      setError("No certificate PDFs are ready for bulk download yet.");
      return;
    }

    certificateLinks.forEach((link, index) => {
      window.setTimeout(() => {
        window.open(`${link}?download=pdf`, "_blank", "noopener,noreferrer");
      }, index * 250);
    });

    setMessage("Opened certificate PDF downloads in new tabs.");
  };

  const participants = useMemo(() => detail?.participants || [], [detail?.participants]);
  const issuedResults = useMemo(() => detail?.results || [], [detail?.results]);
  const isTeamEvent =
    String(detail?.event?.participationFormat || "INDIVIDUAL").toUpperCase() ===
    "TEAM";
  const resultSummary = useMemo(() => {
    const source = participants;
    return {
      winnerCount: source.filter((participant) => participant.finalStatus === "WINNER")
        .length,
      runnerUpCount: source.filter(
        (participant) => participant.finalStatus === "RUNNER_UP"
      ).length,
      finalistCount: source.filter(
        (participant) =>
          participant.finalStatus === "FINALIST" ||
          participant.finalStatus === "SELECTED"
      ).length,
      participantCount: source.filter(
        (participant) =>
          !["WINNER", "RUNNER_UP", "FINALIST", "SELECTED"].includes(
            participant.finalStatus
          )
      ).length,
    };
  }, [participants]);
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
      if (!membersByParent.has(parentId)) {
        membersByParent.set(parentId, []);
      }
      membersByParent.get(parentId).push(result);
    });

    return teamRows.map((team) => ({
      team,
      members: membersByParent.get(String(team._id)) || [],
    }));
  }, [isTeamEvent, issuedResults]);

  const toggleTeamExpansion = (teamId) => {
    setExpandedTeams((current) => ({
      ...current,
      [teamId]: !current[teamId],
    }));
  };

  return (
    <div className="space-y-6">
      <div
        className={
          embedded
            ? "rounded-2xl border border-[#d6e6fb] bg-white p-6 shadow-sm"
            : "rounded-2xl border border-[#1c4a8d] bg-[#081b39]/70 p-6"
        }
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2
              className={`flex items-center gap-2 text-xl font-semibold ${
                embedded ? "text-[#0a2f66]" : "text-white"
              }`}
            >
              <FaTrophy className="text-[#ffb21c]" />
              {title}
            </h2>
            <p className={`mt-1 text-sm ${embedded ? "text-[#5f84b7]" : "text-[#cddfff]"}`}>
              {description}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:items-end">
            <label className="inline-flex items-center gap-2 text-sm text-[#33598f]">
              <input
                type="checkbox"
                checked={publishPublicly}
                onChange={(e) => setPublishPublicly(e.target.checked)}
              />
              Publish results on the public event page
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={saveResults}
                className="inline-flex items-center gap-2 rounded-xl bg-[#0a2f66] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1150a1] disabled:opacity-60"
              >
                <FaSave />
                Save Snapshot
              </button>
            </div>
          </div>
        </div>
        {message && <div className="mt-4 text-sm text-[#1150a1]">{message}</div>}
        {error && <div className="mt-4 text-sm text-[#d97706]">{error}</div>}
      </div>

      {isTeamEvent && (
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">
              Winners
            </div>
            <div className="mt-2 text-3xl font-bold text-amber-900">
              {resultSummary.winnerCount}
            </div>
            <p className="mt-2 text-sm text-amber-700">
              Teams finishing with first-place recognition.
            </p>
          </div>
          <div className="rounded-2xl border border-violet-200 bg-violet-50 px-5 py-4">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-700">
              Runner Up
            </div>
            <div className="mt-2 text-3xl font-bold text-violet-900">
              {resultSummary.runnerUpCount}
            </div>
            <p className="mt-2 text-sm text-violet-700">
              Teams finishing in the final runner-up position.
            </p>
          </div>
          <div className="rounded-2xl border border-[#d6e6fb] bg-[#f7fbff] px-5 py-4">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#33598f]">
              Finalists
            </div>
            <div className="mt-2 text-3xl font-bold text-[#0a2f66]">
              {resultSummary.finalistCount}
            </div>
            <p className="mt-2 text-sm text-[#5f84b7]">
              Teams reaching the shortlist or final placement stage.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Other Participants
            </div>
            <div className="mt-2 text-3xl font-bold text-slate-900">
              {resultSummary.participantCount}
            </div>
            <p className="mt-2 text-sm text-slate-500">
              Teams with participation recognition only.
            </p>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-[#d6e6fb] bg-white">
        <div className="border-b border-[#d6e6fb] px-6 py-5">
          <h3 className="text-lg font-bold text-[#0a2f66]">Final Status List</h3>
          <p className="mt-1 text-sm text-[#5f84b7]">
            This list is generated from round history. `Not Attempted` {isTeamEvent ? "teams" : "students"} are
            excluded automatically.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead className="bg-[#f7fbff] text-xs uppercase tracking-wide text-[#5f84b7]">
              <tr>
                <th className="px-4 py-3">{isTeamEvent ? "Team" : "Student"}</th>
                <th className="px-4 py-3">School</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Highest Round</th>
                <th className="px-4 py-3">Certificate Name</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-10 text-center text-[#5f84b7]">
                    Loading results...
                  </td>
                </tr>
              ) : participants.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-10 text-center text-[#5f84b7]">
                    No eligible participants found yet.
                  </td>
                </tr>
              ) : (
                participants.map((participant) => (
                  <tr
                    key={participant.teamKey || participant.studentId}
                    className="border-t border-[#eef5ff]"
                  >
                    <td className="px-4 py-4 font-medium text-[#0a2f66]">
                      {isTeamEvent ? (
                        <div>
                          <div className="font-semibold text-[#0a2f66]">
                            {participant.teamName || "School Team"}
                          </div>
                          <div className="mt-1 text-xs text-[#5f84b7]">
                            Captain:{" "}
                            {participant.captainStudent?.name ||
                              participant.members?.[0]?.name ||
                              "Not set"}
                          </div>
                          <div className="mt-2 inline-flex rounded-full bg-[#0a2f66]/8 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#0a2f66]">
                            {participant.members?.length || 0} member
                            {(participant.members?.length || 0) === 1 ? "" : "s"}
                          </div>
                        </div>
                      ) : (
                        participant.teamName || participant.student?.name || "Student"
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm text-[#33598f]">
                      <div>
                        <div>{participant.school?.schoolName || "School"}</div>
                        {isTeamEvent ? (
                          <div className="mt-1 text-xs text-[#5f84b7]">
                            {(participant.members || [])
                              .map((member) => member?.name)
                              .filter(Boolean)
                              .join(", ") || "No members linked"}
                          </div>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-[#5f84b7]">
                      {formatStatus(participant.finalStatus)}
                    </td>
                    <td className="px-4 py-4 text-sm text-[#5f84b7]">
                      {participant.highestRoundReached > 0
                        ? `Round ${participant.highestRoundReached}`
                        : "Registration"}
                    </td>
                    <td className="px-4 py-4 text-sm text-[#5f84b7]">
                      {participant.certificateRecipientName ||
                        participant.teamName ||
                        participant.student?.name ||
                        "Student"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <FaCertificate className="text-amber-500" />
                Certificates
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {isTeamEvent
                  ? "View team results, member certificates, and final recipient naming."
                  : "View, download, rename, and manage final certificates."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={saving || !issuedResults.length}
                onClick={bulkDownloadCertificates}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-50"
              >
                <FaDownload />
                Bulk Download
              </button>
              <button
                type="button"
                disabled={saving || !issuedResults.length}
                onClick={sendAllCertificatesToSchools}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <FaPaperPlane />
                Send to All Schools
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">{isTeamEvent ? "Team" : "Student"}</th>
                <th className="px-4 py-3">School</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Certificate State</th>
                <th className="px-4 py-3 text-right">Certificate Options</th>
              </tr>
            </thead>
            <tbody>
              {isTeamEvent ? (
                !groupedIssuedResults.length ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-10 text-center text-slate-500">
                      Save a result snapshot first to prepare team and member certificates.
                    </td>
                  </tr>
                ) : (
                  groupedIssuedResults.map(({ team, members }) => (
                    <Fragment key={team._id || team.resultId || team.teamName}>
                      <tr className="border-t border-slate-100">
                        <td className="px-4 py-4 font-medium text-slate-900">
                          <div className="font-semibold text-slate-900">
                            {team.teamName || team.certificateRecipientName || "School Team"}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            Team certificate name:{" "}
                            {team.certificateRecipientName ||
                              team.teamName ||
                              "School Team"}
                          </div>
                          <div className="mt-2 text-xs text-slate-500">
                            Member certificates: {members.length}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-700">
                          <div>{team.school?.schoolName || "School"}</div>
                          {team.captainStudent?.name ? (
                            <div className="mt-1 text-xs text-slate-500">
                              Captain: {team.captainStudent.name}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-700">
                          {formatStatus(team.finalStatus || team.placement)}
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-700">
                          {team.certificateIssuedAt ? "Issued" : "Draft"} • {members.length} member cert
                          {members.length === 1 ? "" : "s"}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => toggleTeamExpansion(String(team._id))}
                              className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                            >
                              {expandedTeams[String(team._id)] ? "Hide Members" : `Show Members (${members.length})`}
                            </button>
                            <a
                              href={`/certificates/${team.resultId || team._id}?preview=1`}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-lg bg-slate-100 p-2 text-slate-700 hover:bg-slate-200"
                              title="View team certificate"
                            >
                              <FaEye />
                            </a>
                            <a
                              href={`/certificates/${team.resultId || team._id}?download=pdf&preview=1`}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-lg bg-slate-100 p-2 text-slate-700 hover:bg-slate-200"
                              title="Download team PDF"
                            >
                              <FaDownload />
                            </a>
                            <button
                              type="button"
                              onClick={() => openCertificateEditor(team)}
                              className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                            >
                              Edit Team Name
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedTeams[String(team._id)] &&
                        (members.length > 0 ? (
                          members.map((member) => (
                            <tr key={member._id} className="border-t border-slate-100 bg-slate-50/70">
                              <td className="px-4 py-4 font-medium text-slate-900">
                                <div className="pl-4">
                                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Team Member
                                  </div>
                                  <div className="mt-1 font-semibold text-slate-900">
                                    {member.certificateRecipientName ||
                                      member.student?.name ||
                                      "Student"}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-4 text-sm text-slate-700">
                                <div>{team.school?.schoolName || "School"}</div>
                                <div className="mt-1 text-xs text-slate-500">
                                  Team: {team.teamName || team.certificateRecipientName || "School Team"}
                                </div>
                              </td>
                              <td className="px-4 py-4 text-sm text-slate-700">
                                {formatStatus(member.finalStatus || member.placement)}
                              </td>
                              <td className="px-4 py-4 text-sm text-slate-700">
                                {member.certificateIssuedAt ? "Issued" : "Draft"}
                              </td>
                              <td className="px-4 py-4">
                                <div className="flex justify-end gap-2">
                                  <a
                                    href={`/certificates/${member.resultId || member._id}?preview=1`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="rounded-lg bg-slate-100 p-2 text-slate-700 hover:bg-slate-200"
                                    title="View member certificate"
                                  >
                                    <FaEye />
                                  </a>
                                  <a
                                    href={`/certificates/${member.resultId || member._id}?download=pdf&preview=1`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="rounded-lg bg-slate-100 p-2 text-slate-700 hover:bg-slate-200"
                                    title="Download member PDF"
                                  >
                                    <FaDownload />
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() => openCertificateEditor(member)}
                                    className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                                  >
                                    Edit Member Name
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr className="border-t border-slate-100 bg-slate-50/70">
                            <td colSpan="5" className="px-6 py-4 text-sm text-slate-500">
                              No member certificates generated yet. Save the result snapshot again after team-member certificate generation is available for this team result.
                            </td>
                          </tr>
                        ))}
                    </Fragment>
                  ))
                )
              ) : !issuedResults.length ? (
                <tr>
                  <td colSpan="5" className="px-6 py-10 text-center text-slate-500">
                    Save a result snapshot first to prepare certificates.
                  </td>
                </tr>
              ) : (
                issuedResults.map((result) => (
                  <tr key={result._id} className="border-t border-slate-100">
                    <td className="px-4 py-4 font-medium text-slate-900">
                      {isTeamEvent ? (
                        <div>
                          <div className="font-semibold text-slate-900">
                            {result.teamName ||
                              result.certificateRecipientName ||
                              "School Team"}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            Certificate name:{" "}
                            {result.certificateRecipientName ||
                              result.teamName ||
                              "School Team"}
                          </div>
                        </div>
                      ) : (
                        result.certificateRecipientName ||
                        result.teamName ||
                        result.student?.name ||
                        "Student"
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-700">
                      <div>
                        <div>{result.school?.schoolName || "School"}</div>
                        {isTeamEvent && result.captainStudent?.name ? (
                          <div className="mt-1 text-xs text-slate-500">
                            Captain: {result.captainStudent.name}
                          </div>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-700">
                      {formatStatus(result.finalStatus || result.placement)}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-700">
                      {result.certificateIssuedAt ? "Issued" : "Draft"}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <a
                          href={`/certificates/${result.resultId || result._id}?preview=1`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg bg-slate-100 p-2 text-slate-700 hover:bg-slate-200"
                          title="View certificate"
                        >
                          <FaEye />
                        </a>
                        <a
                          href={`/certificates/${result.resultId || result._id}?download=pdf&preview=1`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg bg-slate-100 p-2 text-slate-700 hover:bg-slate-200"
                          title="Download PDF"
                        >
                          <FaDownload />
                        </a>
                        <button
                          type="button"
                          onClick={() => openCertificateEditor(result)}
                          className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                        >
                          Edit Name
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingCertificate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Edit Certificate Name</h3>
              <button
                type="button"
                onClick={() => setEditingCertificate(null)}
                className="text-sm text-slate-500 hover:text-slate-900"
              >
                Close
              </button>
            </div>
            <div className="space-y-4">
              <label>
                <div className="mb-1 text-sm font-medium text-slate-700">
                  Name shown on certificate
                </div>
                <input
                  value={certificateName}
                  onChange={(e) => setCertificateName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 outline-none focus:border-blue-500"
                />
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={updateCertificateName}
                className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Save Name
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
