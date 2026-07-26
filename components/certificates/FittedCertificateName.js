"use client";

import { useLayoutEffect, useRef } from "react";

const PREFERRED_FONT_SIZE = 50;
const MIN_FONT_SIZE = 22;
const NAME_HORIZONTAL_PADDING = 8;

export default function FittedCertificateName({ name, className = "" }) {
  const nameRef = useRef(null);

  useLayoutEffect(() => {
    const element = nameRef.current;
    if (!element) return undefined;

    let cancelled = false;

    const fitName = () => {
      if (cancelled || !element.parentElement) return;

      element.style.transform = "none";

      const availableWidth =
        element.parentElement.clientWidth - NAME_HORIZONTAL_PADDING * 2;
      let low = MIN_FONT_SIZE;
      let high = PREFERRED_FONT_SIZE;
      let fittedSize = MIN_FONT_SIZE;

      while (low <= high) {
        const candidate = Math.floor((low + high) / 2);
        element.style.fontSize = `${candidate}px`;

        if (element.scrollWidth <= availableWidth) {
          fittedSize = candidate;
          low = candidate + 1;
        } else {
          high = candidate - 1;
        }
      }

      element.style.fontSize = `${fittedSize}px`;

      // Preserve a single-line certificate layout even for exceptionally long
      // imported names. The fallback is capped to avoid unreadable distortion.
      if (element.scrollWidth > availableWidth) {
        const scale = Math.max(0.82, availableWidth / element.scrollWidth);
        element.style.transform = `scaleX(${scale})`;
      }
    };

    fitName();
    document.fonts?.ready.then(fitName);

    const resizeObserver = new ResizeObserver(fitName);
    resizeObserver.observe(element.parentElement);

    return () => {
      cancelled = true;
      resizeObserver.disconnect();
    };
  }, [name]);

  return (
    <div className="mt-2 flex h-[88px] w-full items-center justify-center overflow-hidden px-2">
      <h2
        ref={nameRef}
        className={`${className} block max-w-none whitespace-nowrap text-center leading-none text-[#10142f]`}
        style={{
          fontSize: `${PREFERRED_FONT_SIZE}px`,
          transformOrigin: "center",
        }}
      >
        {name}
      </h2>
    </div>
  );
}
