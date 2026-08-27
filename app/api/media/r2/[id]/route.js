import mongoose from "mongoose";
import { requireApiSession } from "@/lib/authz";
import connectDB from "@/lib/db";
import { getR2Object } from "@/lib/r2Storage";
import MediaAsset from "@/models/MediaAsset";
import ParentStudentLink from "@/models/ParentStudentLink";
import SchoolMagazineArticle from "@/models/SchoolMagazineArticle";
import SchoolShowcaseProfile from "@/models/SchoolShowcaseProfile";

function isMissingObjectError(error) {
  return (
    ["NoSuchKey", "NotFound", "NoSuchObject"].includes(
      String(error?.name || error?.Code || error?.code || "")
    ) || Number(error?.$metadata?.httpStatusCode || 0) === 404
  );
}

async function reconcileMissingAsset(asset) {
  const assetUrl = `/api/media/r2/${asset._id}`;
  await MediaAsset.updateOne(
    { _id: asset._id, status: "READY" },
    { $set: { status: "DELETED", deletedAt: new Date() } }
  );

  if (asset.purpose === "SCHOOL_LOGO") {
    await SchoolShowcaseProfile.updateOne(
      { school: asset.school, coverImageUrl: assetUrl },
      { $set: { coverImageUrl: "" } }
    );
  } else if (asset.purpose === "SCHOOL_COVER") {
    await SchoolShowcaseProfile.updateOne(
      { school: asset.school, bannerImageUrl: assetUrl },
      { $set: { bannerImageUrl: "" } }
    );
  } else if (asset.purpose === "WRITING_IMAGE") {
    await Promise.all([
      SchoolMagazineArticle.updateMany(
        { "images.asset": asset._id },
        { $pull: { images: { asset: asset._id } } }
      ),
      SchoolMagazineArticle.updateMany(
        { "coverImage.asset": asset._id },
        { $unset: { coverImage: 1 } }
      ),
    ]);
  }
}

async function canReadPrivate(session, asset) {
  if (!session?.user) return false;
  if (session.user.role === "SUPER_ADMIN") return true;
  if (session.user.role === "SCHOOL_ADMIN") {
    return String(asset.school) === String(session.user.id);
  }
  if (session.user.role === "STUDENT") {
    return String(asset.ownerStudent) === String(session.user.id);
  }
  if (session.user.role === "PARENT" && asset.ownerStudent) {
    return Boolean(
      await ParentStudentLink.exists({
        parent: session.user.id,
        student: asset.ownerStudent,
        status: "ACTIVE",
        canViewPortfolio: true,
      })
    );
  }
  return false;
}

export async function GET(_request, { params }) {
  let asset = null;
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return new Response("Not found", { status: 404 });
    }
    await connectDB();
    asset = await MediaAsset.findOne({ _id: id, status: "READY" }).lean();
    if (!asset) return new Response("Not found", { status: 404 });

    const publiclyPublished = Boolean(
      asset.writing &&
        (await SchoolMagazineArticle.exists({
          _id: asset.writing,
          isDeleted: { $ne: true },
          $or: [
            { isMagazinePublished: true },
            { isPublished: true },
            { isGlobalWallPublished: true },
          ],
        }))
    );
    const publicAccess = asset.visibility === "PUBLIC" || publiclyPublished;

    if (!publicAccess) {
      const { session, error } = await requireApiSession();
      if (error) return error;
      if (!(await canReadPrivate(session, asset))) {
        return new Response("Unauthorized", { status: 401 });
      }
    }

    const object = await getR2Object(asset);
    return new Response(object.Body.transformToWebStream(), {
      headers: {
        "Content-Type": object.ContentType || asset.mimeType,
        "Content-Length": String(object.ContentLength || asset.sizeBytes),
        "Cache-Control":
          publicAccess
            ? "public, max-age=0, must-revalidate"
            : "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (readError) {
    if (asset && isMissingObjectError(readError)) {
      await reconcileMissingAsset(asset).catch((reconcileError) => {
        console.error("Failed to reconcile missing R2 media:", reconcileError);
      });
      return new Response("Not found", {
        status: 404,
        headers: { "Cache-Control": "no-store" },
      });
    }
    console.error("R2 media read failed:", readError);
    return new Response("Media unavailable", {
      status: 502,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
