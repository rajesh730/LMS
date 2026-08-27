import mongoose from "mongoose";
import { revalidatePath } from "next/cache";
import { requireApiSession } from "@/lib/authz";
import connectDB from "@/lib/db";
import MediaAsset from "@/models/MediaAsset";
import SchoolShowcaseProfile from "@/models/SchoolShowcaseProfile";
import { errorResponse, successResponse, validationError } from "@/lib/apiResponse";

function assetIdFromUrl(value) {
  const url = String(value || "").trim();
  if (!url) return null;
  const match = url.match(/^\/api\/media\/r2\/([a-f0-9]{24})$/i);
  return match?.[1] || "invalid";
}

export async function PATCH(request) {
  try {
    const { session, error } = await requireApiSession(["SCHOOL_ADMIN"]);
    if (error) return error;

    const body = await request.json();
    const coverImageUrl = String(body.coverImageUrl || "").trim();
    const assetId = assetIdFromUrl(coverImageUrl);
    if (assetId === "invalid" || (assetId && !mongoose.Types.ObjectId.isValid(assetId))) {
      return validationError("Choose a logo uploaded through this form.");
    }

    await connectDB();
    if (assetId) {
      const ownsAsset = await MediaAsset.exists({
        _id: assetId,
        school: session.user.id,
        purpose: "SCHOOL_LOGO",
        visibility: "PUBLIC",
        status: "READY",
      });
      if (!ownsAsset) {
        return validationError("This logo does not belong to your school.");
      }
    }

    const profile = await SchoolShowcaseProfile.findOneAndUpdate(
      { school: session.user.id },
      { $set: { coverImageUrl } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();

    revalidatePath("/");
    revalidatePath("/schools");
    revalidatePath(`/schools/${session.user.id}`);

    return successResponse(200, "School logo updated", {
      coverImageUrl: profile.coverImageUrl || "",
    });
  } catch (updateError) {
    console.error("School logo update failed:", updateError);
    return errorResponse(500, "Failed to update school logo.");
  }
}
