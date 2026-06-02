export const WRITING_CATEGORIES = [
  "BLOG_ARTICLE",
  "OPINION",
  "RESEARCH",
  "CREATIVE_WRITING",
  "POEM",
];

export const LEGACY_WRITING_CATEGORIES = [
  "ESSAY",
  "REPORT",
  "STORY",
  "OTHER",
];

export const ALL_WRITING_CATEGORIES = [
  ...WRITING_CATEGORIES,
  ...LEGACY_WRITING_CATEGORIES,
];

export function normalizeWritingCategory(value) {
  const category = String(value || "BLOG_ARTICLE").toUpperCase();

  if (category === "ESSAY") return "BLOG_ARTICLE";
  if (category === "REPORT") return "RESEARCH";
  if (category === "STORY" || category === "OTHER") return "CREATIVE_WRITING";

  return WRITING_CATEGORIES.includes(category) ? category : "BLOG_ARTICLE";
}

export function getWritingCategoryLabel(value) {
  const category = normalizeWritingCategory(value);
  return category
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
