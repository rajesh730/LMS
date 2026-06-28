export const dynamic = "force-dynamic";

export async function GET(req, props) {
  const params = await props.params;
  const id = String(params.id || "").trim();

  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    return new Response("Invalid file id", { status: 400 });
  }

  const driveUrl = `https://drive.google.com/uc?export=view&id=${encodeURIComponent(
    id
  )}`;
  let response;
  try {
    response = await fetch(driveUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
      redirect: "follow",
      // Don't let a slow/hung Drive response block the route indefinitely.
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    return new Response("Image upstream timed out", { status: 504 });
  }

  if (!response.ok) {
    return new Response("Image not found", { status: response.status });
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.startsWith("image/")) {
    return new Response("Drive file is not a public image", { status: 415 });
  }

  return new Response(response.body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      // A Drive file id maps to immutable content, so cache it hard: a year in
      // the browser and CDN, served as immutable so repeat views (and mobile
      // re-scrolls) never re-hit this proxy or Google Drive.
      "Cache-Control":
        "public, max-age=31536000, s-maxage=31536000, immutable, stale-while-revalidate=86400",
    },
  });
}
