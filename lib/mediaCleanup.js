import MediaAsset from "@/models/MediaAsset";
import { deleteR2Object } from "@/lib/r2Storage";

export async function deleteMediaAssets(query) {
  const assets = await MediaAsset.find({ ...query, status: "READY" }).lean();

  for (const asset of assets) {
    try {
      await deleteR2Object(asset);
      await MediaAsset.updateOne(
        { _id: asset._id, status: "READY" },
        { $set: { status: "DELETED", deletedAt: new Date() } }
      );
    } catch (error) {
      console.error("Failed to delete unused media asset:", asset._id, error);
    }
  }
}
