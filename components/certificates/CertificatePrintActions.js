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
      className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white"
    >
      Download PDF
    </button>
  );
}
