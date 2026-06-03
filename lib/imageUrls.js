export function normalizeImageUrl(value) {
  const url = String(value || "").trim();
  if (!url) return "";

  const fileMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/i);
  const idMatch = url.match(/[?&]id=([^&]+)/i);
  const driveId = fileMatch?.[1] || idMatch?.[1];

  if (driveId && /drive\.google\.com/i.test(url)) {
    return `/api/media/drive/${encodeURIComponent(driveId)}`;
  }

  return url;
}
