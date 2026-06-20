function InlineWritingText({ text }) {
  const pattern =
    /(\{\{highlight\}\}.*?\{\{\/highlight\}\}|\*\*[^*]+\*\*|_[^_]+_)/g;
  const parts = String(text || "").split(pattern).filter(Boolean);

  return parts.map((part, index) => {
    const highlight = part.match(/^\{\{highlight\}\}(.*)\{\{\/highlight\}\}$/);
    if (highlight) {
      return (
        <mark
          key={`${part}-${index}`}
          className="rounded bg-[#fff1a6] px-1 font-semibold text-[#111827]"
        >
          {highlight[1]}
        </mark>
      );
    }

    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={`${part}-${index}`}>{part.slice(2, -2)}</strong>;
    }

    if (part.startsWith("_") && part.endsWith("_")) {
      return <em key={`${part}-${index}`}>{part.slice(1, -1)}</em>;
    }

    return <span key={`${part}-${index}`}>{part}</span>;
  });
}

export function stripWritingMarkup(content = "") {
  return String(content || "")
    .replace(/\{\{highlight\}\}(.*?)\{\{\/highlight\}\}/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1");
}

export function getWritingPreviewText(content = "", maxLength = 160, options = {}) {
  const text = options.preserveFormatting
    ? stripWritingMarkup(content).replace(/\r\n/g, "\n").trim()
    : stripWritingMarkup(content).replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trimEnd()}...`;
}

export function WritingPreview({
  content = "",
  maxLength = 160,
  preserveFormatting = true,
  className = "",
}) {
  return (
    <p className={`whitespace-pre-wrap ${className}`}>
      {getWritingPreviewText(content, maxLength, { preserveFormatting })}
    </p>
  );
}

export default function WritingContent({ content = "", className = "" }) {
  return (
    <div className={`whitespace-pre-wrap ${className}`}>
      <InlineWritingText text={String(content || "").replace(/\r\n/g, "\n")} />
    </div>
  );
}
