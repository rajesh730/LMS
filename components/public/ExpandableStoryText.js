"use client";

import { useMemo, useState } from "react";

function wordsFromText(value) {
  return String(value || "").trim().split(/\s+/).filter(Boolean);
}

export default function ExpandableStoryText({ text, limit = 70 }) {
  const [expanded, setExpanded] = useState(false);
  const words = useMemo(() => wordsFromText(text), [text]);
  const canExpand = words.length > limit;
  const visibleText =
    canExpand && !expanded ? `${words.slice(0, limit).join(" ")}...` : text;

  return (
    <div>
      <p className="whitespace-pre-wrap text-sm leading-7 text-[#52657d]">
        {visibleText}
      </p>
      {canExpand && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="mt-3 text-sm font-black text-purple-700 transition hover:text-purple-900"
        >
          {expanded ? "Show less" : "Read more"}
        </button>
      )}
    </div>
  );
}
