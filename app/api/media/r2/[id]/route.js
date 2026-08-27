import mongoose from "mongoose";
import { requireApiSession } from "@/lib/authz";
import connectDB from "@/lib/db";
import { getR2Object } from "@/lib/r2Storage";
import MediaAsset from "@/models/MediaAsset";
import ParentStudentLink from "@/models/ParentStudentLink";
import SchoolMagazineArticle from "@/models/SchoolMagazineArticle";

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
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return new Response("Not found", { status: 404 });
    }
    await connectDB();
    const asset = await MediaAsset.findOne({ _id: id, status: "READY" }).lean();
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
            ? "public, max-age=31536000, immutable"
            : "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (readError) {
    console.error("R2 media read failed:", readError);
    return new Response("Media unavailable", { status: 502 });
  }
}
