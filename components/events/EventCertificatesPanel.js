"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FaAward, FaDownload, FaExternalLinkAlt, FaShareAlt } from "react-icons/fa";

function formatLabel(value) {
  return String(value || "").replaceAll("_", " ");
}

export default function EventCertificatesPanel({ eventId }) {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [overallResultUrl, setOverallResultUrl] = useState("");
  const [resultSummary, setResultSummary] = useState(null);
  const [publicResultState, setPublicResultState] = useState("");

  const loadCertificates = useCallback(async () => {
    try {
      setLoading(true);
      setMessage("");
      const res = await fetch(`/api/events/${eventId}/certificates/school`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to load certificates");
      }
      setCertificates(Array.isArray(data.certificates) ? data.certificates : []);
      setOverallResultUrl(data.overallResultUrl || "");
      setResultSummary(data.resultSummary || null);
      setPublicResultState(data.publicResultState || "");
    } catch (error) {
      setMessage(error.message || "Failed to load certificates");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadCertificates();
  }, [loadCertificates]);

  const copyCertificateLink = async (certificate) => {
    const url = `${window.location.origin}${certificate.certificateUrl}`;
    await navigator.clipboard.writeText(url);
    setMessage("Certificate link copied for sharing with student or parent.");
  };

  const isTeamEvent =
    String(resultSummary?.participationFormat || "INDIVIDUAL").toUpperCase() ===
    "TEAM";
  const teamCertificateSummary = useMemo(() => {
    if (!isTeamEvent) return null;
    return {
      teamCount: resultSummary?.entries?.length || 0,
      certificateCount: certificates.length,
      winnerCount: resultSummary?.winnerCount || 0,
      finalistCount:
        (resultSummary?.winnerCount || 0) +
        (resultSummary?.runnerUpCount || 0) +
        (resultSummary?.finalistCount || 0),
    };
  }, [certificates.length, isTeamEvent, resultSummary]);
  const groupedCertificates = useMemo(() => {
    if (!isTeamEvent) return [];
    const teamRows = certificates.filter(
      (certificate) =>
        String(certificate.recipientType || "STUDENT").toUpperCase() === "TEAM"
    );
    const memberRows = certificates.filter(
      (certificate) =>
        String(certificate.recipientType || "STUDENT").toUpperCase() !== "TEAM"
    );
    const membersByParent = new Map();
    memberRows.forEach((certificate) => {
      const parentId = String(
        certificate.parentAchievement?._id || certificate.parentAchievement || ""
      );
      if (!parentId) return;
      if (!membersByParent.has(parentId)) {
        membersByParent.set(parentId, []);
      }
      membersByParent.get(parentId).push(certificate);
    });
    return teamRows.map((team) => ({
      team,
      members: membersByParent.get(String(team._id)) || [],
    }));
  }, [certificates, isTeamEvent]);

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-semibold text-white">
            <FaAward className="text-yellow-400" />
            Event Certificates
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            Certificates for this event are issued to the school for sharing
            with students or parents.
          </p>
        </div>
      </div>

      {message && (
        <div className="mb-3 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200">
          {message}
        </div>
      )}

      {loading ? null : resultSummary && (
        <div className="mb-4 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wide text-emerald-200">
                Your School Result
              </h4>
              <p className="mt-1 text-sm text-emerald-50/85">
                Final recognized outcomes for your school in this event.
              </p>
            </div>
            <div className="rounded-full border border-emerald-500/20 bg-slate-950/60 px-3 py-1 text-xs font-semibold text-emerald-200">
              {resultSummary.totalRecognizedEntries} {isTeamEvent ? "team" : "student"}
              {resultSummary.totalRecognizedEntries === 1 ? "" : "s"} recognized
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            {[
              ["Winners", resultSummary.winnerCount],
              ["Runner Up", resultSummary.runnerUpCount],
              ["Finalists", resultSummary.finalistCount],
              ["Participants", resultSummary.participantCount],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-lg border border-slate-700 bg-slate-950/60 px-4 py-3"
              >
                <div className="text-[11px] uppercase tracking-wide text-slate-400">
                  {label}
                </div>
                <div className="mt-1 text-xl font-bold text-white">{value}</div>
              </div>
            ))}
          </div>

          {isTeamEvent && teamCertificateSummary && (
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              <div className="rounded-lg border border-slate-700 bg-slate-950/60 px-4 py-3">
                <div className="text-[11px] uppercase tracking-wide text-slate-400">
                  Recognized Teams
                </div>
                <div className="mt-1 text-xl font-bold text-white">
                  {teamCertificateSummary.teamCount}
                </div>
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-950/60 px-4 py-3">
                <div className="text-[11px] uppercase tracking-wide text-slate-400">
                  Certificates Ready
                </div>
                <div className="mt-1 text-xl font-bold text-white">
                  {teamCertificateSummary.certificateCount}
                </div>
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-950/60 px-4 py-3">
                <div className="text-[11px] uppercase tracking-wide text-slate-400">
                  Winners
                </div>
                <div className="mt-1 text-xl font-bold text-white">
                  {teamCertificateSummary.winnerCount}
                </div>
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-950/60 px-4 py-3">
                <div className="text-[11px] uppercase tracking-wide text-slate-400">
                  Final Placements
                </div>
                <div className="mt-1 text-xl font-bold text-white">
                  {teamCertificateSummary.finalistCount}
                </div>
              </div>
            </div>
          )}

          {resultSummary.entries?.length > 0 && (
            <div className="mt-4 overflow-hidden rounded-lg border border-slate-700">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-900/90 text-slate-300">
                    <tr className="border-b border-slate-700">
                      <th className="px-4 py-3 font-semibold">
                        {isTeamEvent ? "Team" : "Student"}
                      </th>
                      <th className="px-4 py-3 font-semibold">
                        {isTeamEvent ? "Captain" : "Grade"}
                      </th>
                      <th className="px-4 py-3 font-semibold">Placement</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultSummary.entries.map((entry) => (
                      <tr
                        key={String(entry._id)}
                        className="border-b border-slate-800/80 text-slate-200"
                      >
                        <td className="px-4 py-3 font-medium text-white">
                          {isTeamEvent ? entry.displayName : entry.studentName}
                        </td>
                        <td className="px-4 py-3 text-slate-400">
                          {isTeamEvent ? entry.captainName || "-" : entry.grade || "-"}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex rounded-full border border-yellow-400/20 bg-yellow-400/10 px-2.5 py-1 text-xs font-semibold text-yellow-200">
                            {formatLabel(entry.placement)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="mt-4 flex flex-col gap-3 rounded-lg border border-slate-700 bg-slate-950/60 px-4 py-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm text-slate-300">{publicResultState}</p>
              {isTeamEvent && (
                <p className="mt-1 text-xs text-slate-400">
                  Team results are shown first. Certificate names can be shared exactly as issued below.
                </p>
              )}
            </div>
            {overallResultUrl && (
              <a
                href={overallResultUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-500"
              >
                Open Public Result <FaExternalLinkAlt />
              </a>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-400">Loading certificates...</p>
      ) : certificates.length === 0 ? (
        <p className="text-sm text-slate-400">
          Certificates will appear here after this event&apos;s final results are
          published.
        </p>
      ) : (
        <div className="space-y-3">
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wide text-slate-300">
              Certificates
            </h4>
            <p className="mt-1 text-xs text-slate-400">
              {isTeamEvent
                ? "Share or download the issued team-result certificates. The recipient name below is the exact name shown on the certificate."
                : "Share or download school-issued certificates for recognized students."}
            </p>
          </div>
          {(isTeamEvent ? groupedCertificates : certificates).map((item) => {
            const certificate = isTeamEvent ? item.team : item;
            const memberCertificates = isTeamEvent ? item.members : [];
            return (
            <div
              key={certificate._id}
              className="rounded-lg border border-slate-700 bg-slate-950/60 p-3"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="mb-2 flex flex-wrap gap-2">
                    <span className="rounded-full bg-yellow-500/10 px-2 py-0.5 text-xs font-semibold text-yellow-200">
                      {formatLabel(certificate.placement)}
                    </span>
                    <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                      {certificate.certificateCode}
                    </span>
                  </div>
                  <p className="font-semibold text-white">
                    {certificate.certificateRecipientName ||
                      certificate.teamName ||
                      certificate.student?.name ||
                      "Student"}
                  </p>
                  <p className="text-xs text-slate-400">
                    {isTeamEvent
                      ? `Captain: ${certificate.captainStudent?.name || "Not set"}`
                      : certificate.student?.grade || "Grade not set"}
                  </p>
                  {isTeamEvent ? (
                    <>
                    <p className="mt-2 text-xs text-slate-500">
                      Team outcome certificate for{" "}
                      <span className="font-medium text-slate-300">
                        {certificate.teamName || certificate.certificateRecipientName || "School Team"}
                      </span>
                      .
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Member certificates:{" "}
                      {memberCertificates.length > 0
                        ? memberCertificates
                            .map(
                              (member) =>
                                member.certificateRecipientName ||
                                member.student?.name ||
                                "Student"
                            )
                            .join(", ")
                        : "None generated"}
                    </p>
                    </>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => copyCertificateLink(certificate)}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
                  >
                    <FaShareAlt /> Copy Link
                  </button>
                  <a
                    href={certificate.certificateUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700"
                  >
                    Open <FaExternalLinkAlt />
                  </a>
                  <a
                    href={`${certificate.certificateUrl}?download=pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700"
                  >
                    <FaDownload /> Download
                  </a>
                </div>
              </div>
            </div>
          )})}
        </div>
      )}

    </div>
  );
}
