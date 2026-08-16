"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import QRCode from "qrcode";
import { FaTimes, FaCopy, FaShareAlt, FaPrint, FaCheck } from "react-icons/fa";

/**
 * Show a guardian's Parent Access Card on screen.
 *
 * Printing is one option, not the only one. A guardian who lives an hour from
 * the school is not going to collect a piece of paper — the realistic path is a
 * screenshot sent over WhatsApp, so the card is shown large enough to
 * photograph and the Parent ID is one tap from the clipboard.
 *
 * The QR is rendered here rather than fetched, so it can be scanned straight
 * off the screen: hold the parent's phone up to the office monitor and it works.
 *
 * Unlike the version this replaces, nothing here is "shown once" — the card
 * carries only the Parent ID, which is stored in readable form, so staff can
 * reopen this dialog whenever a family mislays their copy. What IS worth saying
 * out loud is that the ID is the whole credential: sending it to the wrong
 * number hands over the child's record.
 */
export default function ParentCardDialog({
  parentIdentifier,
  linkId,
  schoolName,
  studentName,
  guardianName,
  rotated = false,
  onClose,
}) {
  const [qrSvg, setQrSvg] = useState("");
  const [copied, setCopied] = useState(false);

  // Whether this device has a native share sheet. Read as external state
  // rather than via an effect — it never changes, and a server snapshot of
  // false keeps hydration stable.
  const canShare = useSyncExternalStore(
    () => () => {},
    () => Boolean(navigator.share),
    () => false
  );

  const siteUrl = typeof window !== "undefined" ? window.location.origin : "";
  const loginUrl = `${siteUrl}/parent/login?id=${encodeURIComponent(
    parentIdentifier
  )}`;

  useEffect(() => {
    let active = true;

    QRCode.toString(loginUrl, {
      type: "svg",
      errorCorrectionLevel: "M",
      margin: 1,
      width: 220,
      color: { dark: "#000000", light: "#ffffff" },
    })
      .then((svg) => active && setQrSvg(svg))
      .catch(() => {
        // The ID below is the same credential typed out, so a missing QR is
        // survivable rather than fatal.
      });

    return () => {
      active = false;
    };
  }, [loginUrl]);

  /**
   * Plain text a parent can actually act on, written for a WhatsApp message
   * rather than for a developer. Includes the link so a tap is enough on a
   * phone, and the ID so it still works if the link is stripped.
   */
  const shareText = [
    `${schoolName} — Pravyo Parent Access`,
    "",
    `Child: ${studentName}`,
    `Guardian: ${guardianName}`,
    "",
    `Parent ID: ${parentIdentifier}`,
    "",
    "Open this link to sign in:",
    loginUrl,
    "",
    "Keep this private — it opens your child's record.",
  ].join("\n");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard is blocked in some embedded browsers; the text is on screen
      // and selectable regardless.
    }
  };

  const share = async () => {
    try {
      await navigator.share({
        title: `Pravyo Parent Access — ${studentName}`,
        text: shareText,
      });
    } catch {
      // The user dismissed the share sheet. Nothing to report.
    }
  };

  const print = () => {
    window.open(
      `/school/guardians/card?link=${encodeURIComponent(linkId)}`,
      "_blank",
      "noopener"
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Parent access card"
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4"
    >
      <div className="mt-8 w-full max-w-md rounded-2xl bg-white shadow-xl">
        <header className="flex items-center gap-3 border-b border-[#e6eaf7] px-5 py-4">
          <h2 className="flex-1 text-base font-black text-[#17120a]">
            Parent Access — {studentName}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-10 w-10 items-center justify-center rounded-full text-[#75869b] hover:bg-slate-100"
          >
            <FaTimes />
          </button>
        </header>

        <div className="px-5 py-5">
          {rotated ? (
            <p className="rounded-xl bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-900">
              This is a new Parent ID. {guardianName}&apos;s old card no longer
              works and they have been signed out — send them this one.
            </p>
          ) : (
            <p className="rounded-xl bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-900">
              Send this to {guardianName} — share it, print it, or let them scan
              the code off this screen. You can open this again at any time.
            </p>
          )}

          {/* Big enough to scan straight off the screen, or photograph. */}
          <div className="mt-4 rounded-2xl border-2 border-[#e1e7f2] p-4 text-center">
            <p className="text-xs font-black uppercase tracking-widest text-[#75869b]">
              {schoolName}
            </p>
            <p className="mt-1 text-lg font-black text-[#17120a]">
              {studentName}
            </p>
            <p className="text-sm text-[#52657d]">Guardian: {guardianName}</p>

            <div
              className="mt-3 flex justify-center [&_svg]:h-44 [&_svg]:w-44"
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />

            <div className="mt-3 rounded-xl border-2 border-[#e1e7f2] px-3 py-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-[#75869b]">
                Parent ID
              </p>
              {/* Selectable, so it can be copied by hand if the clipboard
                  API is blocked. */}
              <p className="select-all font-mono text-xl font-black tracking-wider text-[#17120a]">
                {parentIdentifier}
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-2">
            <button
              type="button"
              onClick={copy}
              className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-purple-700 text-sm font-black text-white"
            >
              {copied ? <FaCheck /> : <FaCopy />}
              {copied ? "Copied — paste into WhatsApp" : "Copy for WhatsApp / SMS"}
            </button>

            <div className="grid grid-cols-2 gap-2">
              {/* Only offered where the device actually has a share sheet —
                  a dead button is worse than no button. */}
              {canShare ? (
                <button
                  type="button"
                  onClick={share}
                  className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#dbe5f4] text-sm font-black text-[#0a2f66]"
                >
                  <FaShareAlt />
                  Share
                </button>
              ) : null}

              <button
                type="button"
                onClick={print}
                className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#dbe5f4] text-sm font-black text-[#0a2f66] ${
                  canShare ? "" : "col-span-2"
                }`}
              >
                <FaPrint />
                Print
              </button>
            </div>
          </div>

          <p className="mt-4 text-center text-[11px] leading-relaxed text-[#75869b]">
            The Parent ID is the whole sign-in — treat it like a key. Send it
            only to the guardian named above, and check the number first.
          </p>

          <button
            type="button"
            onClick={onClose}
            className="mt-3 min-h-11 w-full rounded-xl text-sm font-black text-[#52657d]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
