import {
  successResponse,
  errorResponse,
  validationError,
  internalServerError,
} from "@/lib/apiResponse";
import { requireParentChild } from "@/lib/parentAccess";
import {
  putObject,
  kindForMimeType,
  isStorageConfigured,
  MAX_UPLOAD_BYTES,
  StorageNotConfiguredError,
} from "@/lib/parentUploads";

export const dynamic = "force-dynamic";

/**
 * Upload a message attachment — voice note, photo, or document (§15).
 *
 * Validation happens here so lib/parentUploads.js only has to store bytes:
 * authorisation, MIME allow-list and size cap are all enforced before any
 * provider is touched.
 *
 * Currently returns 503 because no object store is configured in this project.
 * See the header comment in lib/parentUploads.js — that is the only file that
 * needs to change to turn this on.
 */
export async function POST(request) {
  try {
    const formData = await request.formData().catch(() => null);
    if (!formData) return validationError("Expected a file upload");

    // Uploads are per-child so an attachment is scoped and authorised exactly
    // like a message: same guardian, same permission, same student.
    const { error } = await requireParentChild(
      formData.get("studentId"),
      "canMessageSchool"
    );
    if (error) return error;

    const file = formData.get("file");
    if (!file || typeof file.arrayBuffer !== "function") {
      return validationError("No file received");
    }

    const kind = kindForMimeType(file.type);
    if (!kind) {
      return validationError("That file type is not supported");
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return validationError(
        `Files must be under ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))} MB`
      );
    }

    if (!isStorageConfigured()) {
      return errorResponse(
        503,
        "File attachments are not available yet. Please send a text message.",
        "STORAGE_NOT_CONFIGURED"
      );
    }

    const stored = await putObject({
      buffer: Buffer.from(await file.arrayBuffer()),
      mimeType: file.type,
      filename: file.name || "attachment",
    });

    return successResponse(201, "Uploaded", {
      attachment: {
        kind,
        url: stored.url,
        thumbnailUrl: stored.thumbnailUrl || "",
        name: file.name || "",
        mimeType: file.type,
        sizeBytes: file.size,
        durationSeconds: Number(formData.get("durationSeconds")) || 0,
      },
    });
  } catch (err) {
    if (err instanceof StorageNotConfiguredError) {
      return errorResponse(503, err.message, err.code);
    }
    console.error("POST /api/parent/uploads error:", err);
    return internalServerError("Upload failed");
  }
}
