"use client";

let audioContext = null;
let unlocked = false;

function getAudioContext() {
  if (typeof window === "undefined") return null;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;
  if (!audioContext) audioContext = new AudioContext();
  return audioContext;
}

/** Unlock Web Audio on the first user gesture, as required by mobile browsers. */
export function installNotificationSoundUnlock() {
  if (typeof window === "undefined") return () => {};

  const unlock = () => {
    const context = getAudioContext();
    if (!context) return;
    void context.resume().then(() => {
      unlocked = context.state === "running";
    });
  };

  window.addEventListener("pointerdown", unlock, { once: true, passive: true });
  window.addEventListener("keydown", unlock, { once: true });

  return () => {
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  };
}

/** A quiet two-note cue for a new notification while the app is visible. */
export async function playNewNotificationSound() {
  if (typeof document === "undefined" || document.visibilityState !== "visible") {
    return false;
  }

  const context = getAudioContext();
  if (!context) return false;

  if (context.state !== "running") {
    try {
      await context.resume();
    } catch {
      return false;
    }
  }
  if (!unlocked && context.state !== "running") return false;

  const start = context.currentTime;
  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.045, start + 0.018);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.32);
  gain.connect(context.destination);

  [660, 880].forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    oscillator.connect(gain);
    oscillator.start(start + index * 0.1);
    oscillator.stop(start + 0.18 + index * 0.1);
  });

  return true;
}

