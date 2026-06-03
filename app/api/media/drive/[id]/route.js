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
  const response = await fetch(driveUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0",
    },
  });

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
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
