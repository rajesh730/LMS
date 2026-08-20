"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FaMicrophone } from "react-icons/fa";
import { useParentApp, useClientCapability } from "./ParentAppContext";
import { formatDuration } from "@/lib/parentFormat";

/**
 * Hold-to-talk voice messaging (§15).
 *
 * This is the feature that decides whether a guardian who is uncomfortable
 * typing — or not fully literate — can talk to the school at all. It is a press
 * -and-hold mic, the interaction people already know from WhatsApp: press,
 * speak, release to send; slide away to cancel.
 *
 * Capture is complete and works today. SENDING requires object storage, which
 * this project does not have yet (see lib/parentUploads.js) — the upload call
 * returns a clear 503 and the parent is told to send text instead, rather than
 * the recording silently vanishing.
 */
export default function VoiceRecorder({ onRecorded, disabled = false }) {
  const { t, selectedChildId } = useParentApp();

  const supported = useClientCapability(
    () =>
      typeof window.MediaRecorder !== "undefined" &&
      Boolean(navigator.mediaDevices?.getUserMedia)
  );
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");

  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const cancelledRef = useRef(false);
  // The elapsed count is mirrored into a ref because `onstop` closes over the
  // render in which the recorder was created — reading the `seconds` state
  // there would always give 0.
  const secondsRef = useRef(0);

  // Release the microphone if the component unmounts mid-recording — otherwise
  // the browser keeps showing the "recording" indicator after navigation.
  const releaseStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => releaseStream, [releaseStream]);

  const start = async () => {
    if (disabled || recording) return;
    setError("");
    cancelledRef.current = false;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      // Let the browser pick its own container. Forcing a mimeType throws on
      // Safari, which does not support webm.
      const recorder = new window.MediaRecorder(stream);
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data?.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        const duration = secondsRef.current;
        releaseStream();
        setRecording(false);
        setSeconds(0);

        if (cancelledRef.current) return;

        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });

        // Ignore accidental taps — under a second is almost never speech.
        if (blob.size === 0 || duration < 1) return;

        await upload(blob, duration);
      };

      recorder.start();
      setRecording(true);
      setSeconds(0);
      secondsRef.current = 0;
      timerRef.current = setInterval(() => {
        secondsRef.current += 1;
        setSeconds(secondsRef.current);
      }, 1000);
    } catch {
      // Almost always a denied microphone permission.
      setError("Microphone permission is needed to record a voice message.");
      releaseStream();
    }
  };

  const stop = (cancel = false) => {
    cancelledRef.current = cancel;
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    } else {
      releaseStream();
      setRecording(false);
      setSeconds(0);
      secondsRef.current = 0;
    }
  };

  const upload = async (blob, durationSeconds) => {
    try {
      const formData = new FormData();
      formData.append("file", blob, `voice-${Date.now()}.webm`);
      formData.append("studentId", selectedChildId);
      formData.append("durationSeconds", String(durationSeconds));

      const res = await fetch("/api/parent/uploads", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();

      if (!res.ok) {
        // Includes the 503 for unconfigured storage — surfaced verbatim so the
        // parent knows to type instead of assuming the app is broken.
        throw new Error(json.message || "Could not send the voice message");
      }

      onRecorded(json.data.attachment);
    } catch (err) {
      setError(err.message);
    }
  };

  if (!supported) return null;

  return (
    <div className="relative">
      {recording ? (
        <div className="absolute bottom-full right-0 mb-2 flex items-center gap-2 whitespace-nowrap rounded-full bg-red-600 px-3 py-1.5 text-xs font-bold text-white">
          <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
          {t("messages.recording")} {formatDuration(seconds)}
        </div>
      ) : null}

      {error ? (
        <div className="absolute bottom-full right-0 mb-2 w-64 max-w-[calc(100vw-2rem)] rounded-xl bg-red-50 px-3 py-2 text-xs text-red-800 shadow-lg">
          {error}
        </div>
      ) : null}

      <button
        type="button"
        disabled={disabled}
        aria-label={t("messages.holdToSpeak")}
        // Pointer events cover mouse, touch and pen with one handler set.
        onPointerDown={start}
        onPointerUp={() => stop(false)}
        // Sliding off the button cancels — the standard "changed my mind" gesture.
        onPointerLeave={() => recording && stop(true)}
        onPointerCancel={() => stop(true)}
        className={[
          "flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-all disabled:opacity-50",
          recording
            ? "scale-110 bg-red-600 text-white"
            : "bg-[var(--brand-primary)] text-white",
        ].join(" ")}
      >
        <FaMicrophone aria-hidden="true" className="h-5 w-5" />
      </button>
    </div>
  );
}
