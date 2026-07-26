"use client";

import { useLayoutEffect, useRef, useState } from "react";

const CERTIFICATE_WIDTH = 794;
const CERTIFICATE_HEIGHT = 1123;

export default function CertificateViewport({ children }) {
  const viewportRef = useRef(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return undefined;

    const updateScale = () => {
      const nextScale = Math.min(1, viewport.clientWidth / CERTIFICATE_WIDTH);
      setScale((currentScale) =>
        Math.abs(currentScale - nextScale) < 0.001 ? currentScale : nextScale
      );
    };

    updateScale();

    const resizeObserver = new ResizeObserver(updateScale);
    resizeObserver.observe(viewport);

    return () => resizeObserver.disconnect();
  }, []);

  return (
    <div
      ref={viewportRef}
      className="certificate-viewport relative mx-auto w-full max-w-[794px] overflow-hidden"
      style={{ height: `${CERTIFICATE_HEIGHT * scale}px` }}
    >
      <div
        className="certificate-viewport-inner absolute left-0 top-0 h-[1123px] w-[794px] origin-top-left"
        style={{ transform: `scale(${scale})` }}
      >
        {children}
      </div>
    </div>
  );
}
