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

function uploadFailureResponse(error) {
  const code = String(error?.name || error?.Code || error?.code || "");
  const status = Number(error?.$metadata?.httpStatusCode || 0);

  if (code === "NoSuchBucket") {
    return errorResponse(
      503,
      "The configured R2 bucket was not found. Check the bucket name in Vercel.",
      "STORAGE_BUCKET_NOT_FOUND"
    );
  }
  if (code === "AccessDenied" || status === 403) {
    return errorResponse(
      503,
      "R2 denied the upload. Give the R2 access key Object Read & Write permission for this bucket.",
      "STORAGE_ACCESS_DENIED"
    );
  }
  if (
    ["InvalidAccessKeyId", "SignatureDoesNotMatch", "InvalidToken"].includes(code) ||
    status === 401
  ) {
    return errorResponse(
      503,
      "R2 credentials or the S3 endpoint do not match. Check the Access Key ID, Secret Access Key, and endpoint in Vercel.",
      "STORAGE_CREDENTIALS_INVALID"
    );
  }
  if (error?.message === "R2_ENDPOINT_INVALID") {
    return errorResponse(
      503,
      "R2_ENDPOINT must be the HTTPS S3 endpoint from Cloudflare without a bucket name or extra path.",
      "STORAGE_ENDPOINT_INVALID"
    );
  }
  if (code === "AbortError" || code === "TimeoutError") {
    return errorResponse(
      504,
      "R2 did not respond in time. Check that R2_ENDPOINT is the S3 endpoint for the same account as the access key.",
      "STORAGE_TIMEOUT"
    );
  }
  if (
    ["ValidationError", "MongoServerError", "MongooseError"].includes(code)
  ) {
    return errorResponse(
      500,
      "The image reached storage, but its media record could not be saved.",
      "MEDIA_RECORD_FAILED"
    );
  }

  return errorResponse(
    502,
    "The image could not be stored. Check the R2 endpoint, bucket names, and token permissions.",
    "STORAGE_UPLOAD_FAILED"
  );
}

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
    return uploadFailureResponse(uploadError);
  }
}
