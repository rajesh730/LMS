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
      className="rounded-lg bg-[#1f4e79] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-[#173f63]"
    >
      Download PDF
    </button>
  );
}
