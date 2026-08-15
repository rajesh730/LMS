"use client";

import { useCallback, useEffect, useState } from "react";
import { FaVolumeUp, FaStop } from "react-icons/fa";
import { useParentApp, useClientCapability } from "./ParentAppContext";

/**
 * Text-to-speech for parents with mixed literacy (§7).
 *
 * Uses the browser's built-in SpeechSynthesis — no API key, no per-request
 * cost, no network round trip, and it keeps working offline. The spec asks
 * explicitly not to require an expensive AI service for the first
 * implementation, and for this use (reading a notice aloud) the device voice is
 * genuinely adequate.
 *
 * Language handling: the utterance is tagged with the guardian's chosen locale
 * so a Nepali notice is spoken by a Nepali voice where the device has one. Not
 * every device ships `ne-NP`; when it is missing we fall back to the default
 * voice rather than refusing to speak, because hearing the text in an imperfect
 * accent still beats not hearing it at all.
 *
 * The button hides itself entirely when the browser has no speech support, so a
 * guardian is never offered a control that does nothing.
 */

const LOCALE_TO_BCP47 = {
  en: "en-US",
  ne: "ne-NP",
};

export default function ListenButton({ text, fullWidth = false, className = "" }) {
  const { t, preferences, simpleMode } = useParentApp();
  const [speaking, setSpeaking] = useState(false);

  // Read as an external capability rather than via an effect — see
  // useClientCapability. Returns false during SSR so the button is not rendered
  // on the server and then removed on hydration.
  const supported = useClientCapability(() => "speechSynthesis" in window);

  // Cancel any in-flight speech when the component unmounts, otherwise
  // navigating away leaves the phone talking to itself.
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  const speak = useCallback(() => {
    const content = String(text || "").trim();
    if (!content) return;

    // Always cancel first: queuing a second utterance while one is playing is
    // the most common way this feature goes wrong.
    window.speechSynthesis.cancel();

    const utterance = new window.SpeechSynthesisUtterance(content);
    const locale = LOCALE_TO_BCP47[preferences.language] || "en-US";
    utterance.lang = locale;

    const voices = window.speechSynthesis.getVoices();
    const match =
      voices.find((voice) => voice.lang === locale) ||
      voices.find((voice) => voice.lang?.startsWith(locale.split("-")[0]));
    if (match) utterance.voice = match;

    // Slightly slower than default. School communication carries dates,
    // deadlines and names — the things most easily missed at full speed.
    utterance.rate = 0.92;

    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }, [text, preferences.language]);

  if (!supported || !String(text || "").trim()) return null;

  const Icon = speaking ? FaStop : FaVolumeUp;

  return (
    <button
      type="button"
      onClick={speaking ? stop : speak}
      aria-label={speaking ? t("settings.stopListening") : t("settings.listen")}
      className={[
        "flex min-h-[48px] items-center justify-center gap-2 rounded-xl border-2 border-[var(--brand-primary)] bg-white px-4 font-bold text-[var(--brand-primary)] transition-colors hover:bg-[var(--brand-primary-soft)]",
        simpleMode ? "text-base" : "text-sm",
        fullWidth ? "w-full" : "",
        className,
      ].join(" ")}
    >
      <Icon aria-hidden="true" className="h-4 w-4" />
      {speaking ? t("settings.stopListening") : t("settings.listen")}
    </button>
  );
}
