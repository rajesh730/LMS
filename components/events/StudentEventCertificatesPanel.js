"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { FaCertificate, FaDownload, FaExternalLinkAlt } from "react-icons/fa";

function formatLabel(value) {
  if (value === "RUNNER_UP") return "Runner Up";
  if (value === "THIRD_PLACE") return "Third Place";
  return String(value || "").replaceAll("_", " ");
}

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString();
}

export default function StudentEventCertificatesPanel({ eventId }) {
  const [certificates, setCertificates] = useState([]);
  const [resultState, setResultState] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadCertificates = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`/api/events/${eventId}/certificates/student`, {
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "Failed to load certificates.");
      }
      setCertificates(Array.isArray(data.certificates) ? data.certificates : []);
      setResultState(data.resultState || "");
    } catch (loadError) {
      setError(loadError.message || "Failed to load certificates.");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    if (eventId) void loadCertificates();
  }, [eventId, loadCertificates]);

  if (loading) {
    return (
      <div className="mt-4 rounded-xl border border-[#d7cdbb] bg-[#f8fbff] p-4 text-sm font-semibold text-[#52657d]">
        Loading your result and certificate...
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-xl border border-[#d7cdbb] bg-[#fffdf8] p-4">
      <h5 className="flex items-center gap-2 text-base font-black text-[#17120a]">
        <FaCertificate className="text-[#d98b00]" />
        Your Result & Certificate
      </h5>

      {certificates.length === 0 ? (
        <p className="mt-2 text-sm font-semibold text-[#52657d]">
          {resultState || "No certificate is assigned to your account yet."}
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          {certificates.map((certificate) => (
            <article
              key={certificate._id}
              className="rounded-lg border border-[#eadfcb] bg-white p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-800">
                  {formatLabel(certificate.placement)}
                </span>
                {certificate.certificateCode && (
                  <span className="rounded-full bg-[#f8fbff] px-3 py-1 text-xs font-bold text-[#52657d]">
                    {certificate.certificateCode}
                  </span>
                )}
              </div>
              <h6 className="mt-3 text-sm font-black text-[#17120a]">
                {certificate.certificateRecipientName || "Student Certificate"}
              </h6>
              <p className="mt-1 text-xs font-semibold text-[#52657d]">
                {certificate.teamName
                  ? `${certificate.teamName} - ${formatDate(certificate.certificateIssuedAt)}`
                  : formatDate(certificate.certificateIssuedAt)}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href={certificate.certificateUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#4326e8] px-4 text-sm font-black text-white"
                >
                  <FaExternalLinkAlt />
                  Open Certificate
                </Link>
                <Link
                  href={`${certificate.certificateUrl}?download=pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[#d7cdbb] bg-white px-4 text-sm font-black text-[#0a2f66]"
                >
                  <FaDownload />
                  Download
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
