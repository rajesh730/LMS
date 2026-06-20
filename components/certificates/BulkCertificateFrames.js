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
      <div className="mb-5 flex flex-col gap-3 rounded-lg border border-[#dbe5f4] bg-white p-4 shadow-sm print:hidden sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-black text-[#10142f]">Bulk Certificates</h1>
          <p className="mt-1 text-sm font-semibold text-[#52657d]">
            {certificates.length} issued certificate
            {certificates.length === 1 ? "" : "s"} ready for one PDF export.
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#4326e8] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#3217d3]"
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
