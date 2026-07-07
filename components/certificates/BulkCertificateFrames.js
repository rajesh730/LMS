"use client";

import { useEffect, useRef, useState } from "react";
import { FaDownload } from "react-icons/fa";

export default function BulkCertificateFrames({ certificates, autoPrint = false }) {
  const [loadedCount, setLoadedCount] = useState(0);
  const hasPrintedRef = useRef(false);

  useEffect(() => {
    if (!autoPrint || hasPrintedRef.current) return;
    if (loadedCount < certificates.length) return;

    hasPrintedRef.current = true;
    const timer = window.setTimeout(() => {
      window.print();
    }, 600);

    return () => window.clearTimeout(timer);
  }, [autoPrint, certificates.length, loadedCount]);

  return (
    <>
      <div className="mb-5 flex flex-col gap-3 rounded-lg border-l-4 border-l-[#c9a227] border-y border-r border-[#e4d6a8] bg-white p-4 shadow-sm print:hidden sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-black text-[#0a1f4d]">Bulk Certificates</h1>
          <p className="mt-1 text-sm font-semibold text-[#4a5a72]">
            {certificates.length} issued certificate
            {certificates.length === 1 ? "" : "s"} ready for one PDF export.
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#0a1f4d] px-4 text-sm font-bold text-white shadow-sm ring-1 ring-inset ring-[#c9a227]/40 transition hover:bg-[#122f6d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9a227]"
        >
          <FaDownload />
          Download PDF
        </button>
      </div>

      <div className="space-y-6 print:space-y-0">
        {certificates.map((certificate) => (
          <section
            key={certificate.id}
            className="overflow-hidden rounded-lg bg-white shadow-sm print:break-after-page print:rounded-none print:shadow-none"
          >
            <iframe
              title={`Certificate ${certificate.label}`}
              src={`/certificates/${certificate.id}?bulk=1`}
              onLoad={() => setLoadedCount((count) => Math.min(count + 1, certificates.length))}
              className="h-[1120px] w-full border-0 print:h-screen"
            />
          </section>
        ))}
      </div>
    </>
  );
}
