"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { FaCertificate, FaSearch } from "react-icons/fa";
import DashboardLayout from "@/components/DashboardLayout";
import AppDate from "@/components/common/AppDate";
import EmptyState from "@/components/EmptyState";
import AlertBanner from "@/components/ui/AlertBanner";
import LoadingState from "@/components/ui/LoadingState";
import PageHeader from "@/components/ui/PageHeader";

function recipientName(certificate) {
  return (
    certificate.certificateRecipientName ||
    certificate.teamName ||
    certificate.student?.name ||
    certificate.captainStudent?.name ||
    "School recipient"
  );
}

function readablePlacement(value) {
  return String(value || "PARTICIPANT")
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function SchoolCertificatesPage() {
  const { data: session, status } = useSession();
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  const loadCertificates = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/school/certificates", { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || "Certificates could not load.");
      setCertificates(payload.certificates || []);
    } catch (loadError) {
      setError(loadError.message || "Certificates could not load.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "SCHOOL_ADMIN") {
      void loadCertificates();
    } else if (status !== "loading") {
      setLoading(false);
    }
  }, [loadCertificates, session?.user?.role, status]);

  const visibleCertificates = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return certificates;
    return certificates.filter((certificate) =>
      [
        recipientName(certificate),
        certificate.event?.title,
        certificate.title,
        certificate.certificateCode,
        certificate.placement,
      ].some((value) => String(value || "").toLowerCase().includes(term))
    );
  }, [certificates, query]);

  return (
    <DashboardLayout>
      <PageHeader
        icon={FaCertificate}
        eyebrow="Recognition"
        title="Certificates"
        description="Find and open certificates issued to your students and school teams."
      />

      {!loading && session?.user?.role !== "SCHOOL_ADMIN" ? (
        <div className="mt-5">
          <AlertBanner
            type="error"
            title="School administrator access required"
            message="Only a school administrator can view the school's certificate register."
          />
        </div>
      ) : loading ? (
        <div className="mt-5">
          <LoadingState title="Loading certificates" message="Preparing the certificate register." />
        </div>
      ) : error ? (
        <div className="mt-5">
          <EmptyState title="Certificates unavailable" description={error} actionLabel="Try again" onAction={loadCertificates} />
        </div>
      ) : certificates.length === 0 ? (
        <div className="mt-5">
          <EmptyState title="No certificates yet" description="Issued event certificates will appear here automatically." />
        </div>
      ) : (
        <section className="mt-5 space-y-4">
          <label className="flex max-w-xl items-center gap-3 rounded-xl border border-[#e6eaf7] bg-white px-4 py-3 shadow-sm">
            <FaSearch className="shrink-0 text-[#75869b]" aria-hidden="true" />
            <span className="sr-only">Search certificates</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search recipient, event, placement, or code"
              className="w-full bg-transparent text-sm font-semibold text-[#10142f] outline-none placeholder:text-[#8a98aa]"
            />
          </label>

          {visibleCertificates.length === 0 ? (
            <EmptyState title="No matching certificates" description="Try a recipient name, event, placement, or certificate code." />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {visibleCertificates.map((certificate) => (
                <article key={certificate._id} className="rounded-2xl border border-[#e6eaf7] bg-white p-5 shadow-sm">
                  <div className="flex items-start gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                      <FaCertificate aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-black text-[#10142f]">{recipientName(certificate)}</p>
                      <p className="mt-1 truncate text-sm font-semibold text-[#526071]">
                        {certificate.event?.title || certificate.title || "Certificate"}
                      </p>
                    </div>
                    <span className="rounded-full bg-[#eef4ff] px-3 py-1 text-xs font-black text-[#0a2f66]">
                      {readablePlacement(certificate.placement)}
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#eef2f8] pt-4">
                    <p className="text-xs font-semibold text-[#75869b]">
                      Issued <AppDate value={certificate.certificateIssuedAt || certificate.awardedAt} />
                      {certificate.certificateCode ? ` · ${certificate.certificateCode}` : ""}
                    </p>
                    <Link href={`/certificates/${certificate._id}`} className="rounded-xl bg-[#0a2f66] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#123f80]">
                      Open certificate
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </DashboardLayout>
  );
}
