"use client";

import { useCallback, useEffect, useState } from "react";
import { FaAward, FaExternalLinkAlt, FaSearch, FaShareAlt } from "react-icons/fa";

function formatLabel(value) {
  return String(value || "").replaceAll("_", " ");
}

export default function SchoolCertificateManager() {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");

  const loadCertificates = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/school/certificates", {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load certificates");
      setCertificates(Array.isArray(data.certificates) ? data.certificates : []);
    } catch (error) {
      setMessage(error.message || "Failed to load certificates");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCertificates();
  }, [loadCertificates]);

  const filteredCertificates = certificates.filter((certificate) => {
    const haystack = [
      certificate.teamName,
      certificate.certificateRecipientName,
      certificate.recipientType,
      certificate.student?.name,
      certificate.student?.grade,
      certificate.event?.title,
      certificate.placement,
      certificate.certificateCode,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(search.toLowerCase());
  });

  const copyCertificateLink = async (certificate) => {
    const url = `${window.location.origin}${certificate.certificateUrl}`;
    await navigator.clipboard.writeText(url);
    setMessage("Certificate link copied for sharing with student or parent.");
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-semibold text-white">
              <FaAward className="text-yellow-400" />
              School Certificates
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Digital certificates are issued to your school first. Share the
              verified link with the student or parent when ready.
            </p>
          </div>
          <div className="relative w-full md:w-80">
            <FaSearch className="absolute left-3 top-3 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 pl-10 pr-3 text-white outline-none focus:border-blue-500"
              placeholder="Search certificates"
            />
          </div>
        </div>

        {message && (
          <div className="mt-4 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-200">
            {message}
          </div>
        )}
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center text-slate-400">
          Loading certificates...
        </div>
      ) : filteredCertificates.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center text-slate-400">
          No issued certificates found yet.
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredCertificates.map((certificate) => (
            <article
              key={certificate._id}
              className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="mb-2 flex flex-wrap gap-2">
                    <span className="rounded-full bg-yellow-500/10 px-3 py-1 text-xs font-semibold text-yellow-200">
                      {formatLabel(certificate.placement)}
                    </span>
                    <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
                      {certificate.certificateCode}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white">
                    {certificate.certificateRecipientName ||
                      certificate.teamName ||
                      certificate.student?.name ||
                      "Student"}
                  </h3>
                  <p className="mt-1 text-sm text-slate-400">
                    {String(certificate.recipientType || "STUDENT").toUpperCase() === "TEAM"
                      ? `Team certificate - ${certificate.event?.title || certificate.title}`
                      : `${certificate.student?.grade || "Grade not set"} - ${certificate.event?.title || certificate.title}`}
                  </p>
                  {String(certificate.recipientType || "STUDENT").toUpperCase() === "TEAM" &&
                  certificate.captainStudent?.name ? (
                    <p className="mt-1 text-xs text-slate-500">
                      Captain: {certificate.captainStudent.name}
                    </p>
                  ) : null}
                  <p className="mt-2 text-xs text-slate-500">
                    Issued to school on{" "}
                    {new Date(certificate.certificateIssuedAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => copyCertificateLink(certificate)}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
                  >
                    <FaShareAlt /> Copy Share Link
                  </button>
                  <a
                    href={certificate.certificateUrl}
                    target="_blank"
                    className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-700"
                  >
                    Open <FaExternalLinkAlt />
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
