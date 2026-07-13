"use client";

import { useEffect, useRef } from "react";

export default function CertificatePrintActions({ autoPrint = false }) {
  const hasPrintedRef = useRef(false);

  useEffect(() => {
    if (!autoPrint || hasPrintedRef.current) return;
    hasPrintedRef.current = true;
    const timer = window.setTimeout(() => {
      window.print();
    }, 300);

    return () => window.clearTimeout(timer);
  }, [autoPrint]);

  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-lg bg-[#10142f] px-4 py-2 text-sm font-bold text-white shadow-sm ring-1 ring-inset ring-[#f7b731]/40 transition hover:bg-[#1f4e79] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f7b731]"
    >
      Download PDF
    </button>
  );
}
