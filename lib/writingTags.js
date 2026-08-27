export function normalizeWritingTags(value) {
  if (!Array.isArray(value)) return [];

  const unique = new Set();
  value.forEach((item) => {
    const tag = String(item || "")
      .trim()
      .replace(/^#+/, "")
      .replace(/\s+/g, " ")
      .slice(0, 40);
    if (tag) unique.add(tag);
  });

  return [...unique].slice(0, 8);
}
