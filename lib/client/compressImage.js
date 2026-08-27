const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function compressImage(file, options = {}) {
  if (!IMAGE_TYPES.has(file?.type)) {
    throw new Error("Choose a JPG, PNG, or WebP image.");
  }

  const maxEdge = Number(options.maxEdge || 1280);
  const quality = Number(options.quality || 0.72);
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d").drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/webp", quality)
  );
  if (!blob) throw new Error("This image could not be compressed.");

  return {
    file: new File([blob], `${Date.now()}.webp`, { type: "image/webp" }),
    width,
    height,
    originalBytes: file.size,
    compressedBytes: blob.size,
  };
}
