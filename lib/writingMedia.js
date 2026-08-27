import MediaAsset from "@/models/MediaAsset";
import { deleteMediaAssets } from "@/lib/mediaCleanup";

export async function resolveWritingImages({ images, studentId, schoolId, writingId }) {
  const requested = Array.isArray(images) ? images.slice(0, 5) : [];
  const ids = requested.map((item) => String(item?.asset || item?.id || ""));
  if (ids.some((id) => !/^[0-9a-f]{24}$/i.test(id))) {
    throw new Error("One or more writing images are invalid.");
  }
  if (!ids.length) return [];

  const assets = await MediaAsset.find({
    _id: { $in: ids },
    ownerStudent: studentId,
    school: schoolId,
    purpose: "WRITING_IMAGE",
    status: "READY",
  }).lean();
  const byId = new Map(assets.map((asset) => [String(asset._id), asset]));
  if (byId.size !== new Set(ids).size) {
    throw new Error("A writing image does not belong to this student.");
  }

  if (writingId) {
    await MediaAsset.updateMany(
      { _id: { $in: ids }, ownerStudent: studentId },
      { $set: { writing: writingId } }
    );
  }

  return requested.map((item, index) => {
    const id = String(item.asset || item.id);
    return {
      asset: id,
      url: `/api/media/r2/${id}`,
      caption: String(item.caption || "").trim().slice(0, 240),
      altText: String(item.altText || "").trim().slice(0, 240),
      order: index,
    };
  });
}

export async function resolveWritingCover({ coverImage, ...context }) {
  if (!coverImage) return null;
  const [resolved] = await resolveWritingImages({
    images: [coverImage],
    ...context,
  });
  return resolved || null;
}

function mediaIds(images = [], coverImage = null) {
  return new Set(
    [...images, coverImage]
      .filter(Boolean)
      .map((item) => String(item?.asset || item?.id || ""))
      .filter(Boolean)
  );
}

export async function cleanupRemovedWritingMedia({
  previousImages = [],
  previousCover = null,
  nextImages = [],
  nextCover = null,
  studentId,
  writingId,
}) {
  const previousIds = mediaIds(previousImages, previousCover);
  const nextIds = mediaIds(nextImages, nextCover);
  const removedIds = [...previousIds].filter((id) => !nextIds.has(id));
  if (!removedIds.length) return;

  await deleteMediaAssets({
    _id: { $in: removedIds },
    ownerStudent: studentId,
    writing: writingId,
    purpose: "WRITING_IMAGE",
  });
}
