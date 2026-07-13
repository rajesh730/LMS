"use client";

import { useEffect, useRef } from "react";
import { FaDownload } from "react-icons/fa";

export default function BulkPrintBar({ count, autoPrint = false }) {
  const hasPrintedRef = useRef(false);

  useEffect(() => {
    if (!autoPrint || hasPrintedRef.current) return;
    hasPrintedRef.current = true;

    let timer;
    // Wait for the certificate fonts before opening the print dialog so the
    // exported PDF matches the on-screen design.
    const ready = document.fonts?.ready || Promise.resolve();
    ready.then(() => {
      timer = window.setTimeout(() => {
        window.print();
      }, 300);
    });

    return () => window.clearTimeout(timer);
  }, [autoPrint]);

  return (
    <div className="mb-5 flex flex-col gap-3 rounded-lg border-l-4 border-l-[#f7b731] border-y border-r border-[#f3dfae] bg-white p-4 shadow-sm print:hidden sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-xl font-black text-[#10142f]">Bulk Certificates</h1>
        <p className="mt-1 text-sm font-semibold text-[#4a5a72]">
          {count} issued certificate{count === 1 ? "" : "s"} ready for one PDF
          export.
        </p>
      </div>
      <button
        type="button"
        onClick={() => window.print()}
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#10142f] px-4 text-sm font-bold text-white shadow-sm ring-1 ring-inset ring-[#f7b731]/40 transition hover:bg-[#1f4e79] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f7b731]"
      >
        <FaDownload />
        Download PDF
      </button>
    </div>
  );
}
