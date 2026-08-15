"use client";

import { useRef } from "react";

/**
 * Six-digit PIN entry (§47).
 *
 * Six separate boxes rather than one field, because that is the pattern people
 * already know from bank apps and OTP screens — the shape of the input tells
 * you how many digits are expected before you read anything.
 *
 * Details that matter on a real phone:
 *  - `inputMode="numeric"` brings up the number pad, not the full keyboard.
 *  - Each box is 48px+ square, so it is hittable with a thumb.
 *  - Typing advances, Backspace on an empty box steps back — otherwise
 *    correcting a mistyped digit means tapping precisely into a tiny box.
 *  - Paste of a full six-digit code fills every box, so a guardian who copied
 *    the PIN from a message is not forced to retype it.
 *  - `type="text"` with a numeric pattern rather than `type="number"`, which
 *    strips leading zeros and shows spinner arrows.
 */
export default function PinInput({ value = "", onChange, disabled = false }) {
  const inputsRef = useRef([]);
  const digits = String(value).padEnd(6, " ").slice(0, 6).split("");

  const setDigit = (index, digit) => {
    const next = digits.map((d) => (d === " " ? "" : d));
    next[index] = digit;
    onChange(next.join("").replace(/\s/g, ""));
  };

  const handleChange = (index) => (event) => {
    const raw = event.target.value.replace(/\D/g, "");
    if (!raw) {
      setDigit(index, "");
      return;
    }

    // A full code pasted into one box fills the whole row.
    if (raw.length > 1) {
      onChange(raw.slice(0, 6));
      inputsRef.current[Math.min(raw.length, 5)]?.focus();
      return;
    }

    setDigit(index, raw);
    if (index < 5) inputsRef.current[index + 1]?.focus();
  };

  const handleKeyDown = (index) => (event) => {
    if (event.key === "Backspace" && !digits[index]?.trim() && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
    if (event.key === "ArrowLeft" && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
    if (event.key === "ArrowRight" && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  return (
    <div className="mt-2 flex justify-between gap-2" role="group" aria-label="PIN">
      {[0, 1, 2, 3, 4, 5].map((index) => (
        <input
          key={index}
          ref={(element) => {
            inputsRef.current[index] = element;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          autoComplete="one-time-code"
          disabled={disabled}
          aria-label={`Digit ${index + 1}`}
          value={digits[index]?.trim() || ""}
          onChange={handleChange(index)}
          onKeyDown={handleKeyDown(index)}
          onFocus={(event) => event.target.select()}
          className="h-14 w-full min-w-0 rounded-xl border-2 border-[var(--brand-border)] text-center font-mono text-2xl font-bold text-[var(--brand-ink)] focus:border-[var(--brand-primary)] focus:outline-none disabled:opacity-50"
        />
      ))}
    </div>
  );
}
