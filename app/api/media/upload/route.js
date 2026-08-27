import { randomUUID } from "node:crypto";
import { requireApiSession } from "@/lib/authz";
import connectDB from "@/lib/db";
import { isR2Configured, putR2Object } from "@/lib/r2Storage";
import MediaAsset from "@/models/MediaAsset";
import Student from "@/models/Student";
import { buildStudentLookupForSession } from "@/lib/studentIdentity";
import { errorResponse, successResponse, validationError } from "@/lib/apiResponse";

const PURPOSES = {
  SCHOOL_LOGO: { role: "SCHOOL_ADMIN", visibility: "PUBLIC", maxBytes: 800_000 },
  SCHOOL_COVER: { role: "SCHOOL_ADMIN", visibility: "PUBLIC", maxBytes: 1_500_000 },
  WRITING_IMAGE: { role: "STUDENT", visibility: "PRIVATE", maxBytes: 1_200_000 },
};

function isWebP(buffer) {
  return (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  );
}

export async function POST(request) {
  try {
    const { session, error } = await requireApiSession();
    if (error) return error;
    const form = await request.formData().catch(() => null);
    if (!form) return validationError("Expected an image upload.");

    const purpose = String(form.get("purpose") || "").toUpperCase();
    const policy = PURPOSES[purpose];
    if (!policy || session.user.role !== policy.role) {
      return errorResponse(403, "You cannot upload this type of image.", "FORBIDDEN");
    }
    if (!isR2Configured()) {
      return errorResponse(503, "R2 storage is not configured.", "STORAGE_NOT_CONFIGURED");
    }

    const file = form.get("file");
    if (!file || typeof file.arrayBuffer !== "function") {
      return validationError("No image received.");
    }
    if (file.type !== "image/webp" || file.size < 1 || file.size > policy.maxBytes) {
      return validationError("Upload a compressed WebP image within the allowed size.");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!isWebP(buffer)) return validationError("The uploaded file is not a valid WebP image.");

    await connectDB();
    let school = session.user.id;
    let ownerStudent = null;
    if (session.user.role === "STUDENT") {
      const student = await Student.findOne(buildStudentLookupForSession(session))
        .select("_id school")
        .lean();
      if (!student) return errorResponse(404, "Student profile not found.");
      school = student.school;
      ownerStudent = student._id;
    }

    const extension = "webp";
    const key = `schools/${school}/${purpose.toLowerCase()}/${randomUUID()}.${extension}`;
    await putR2Object({
      key,
      body: buffer,
      contentType: file.type,
      visibility: policy.visibility,
    });

    const asset = await MediaAsset.create({
      school,
      ownerStudent,
      purpose,
      visibility: policy.visibility,
      storageKey: key,
      mimeType: file.type,
      sizeBytes: file.size,
      width: Number(form.get("width")) || 0,
      height: Number(form.get("height")) || 0,
      originalName: String(form.get("originalName") || "").slice(0, 255),
      uploadedBy: session.user.id,
    });

    return successResponse(201, "Image uploaded", {
      asset: {
        id: String(asset._id),
        url: `/api/media/r2/${asset._id}`,
        width: asset.width,
        height: asset.height,
        sizeBytes: asset.sizeBytes,
      },
    });
  } catch (uploadError) {
    console.error("Media upload failed:", uploadError);
    return errorResponse(500, "Image upload failed.");
  }
}
