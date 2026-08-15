/**
 * Attachment storage boundary for parent messaging (§15).
 *
 * ---------------------------------------------------------------------------
 * STATUS: NOT WIRED TO A BACKEND. This is the one part of the Parent App that
 * cannot be completed without infrastructure that does not exist in this
 * project yet.
 * ---------------------------------------------------------------------------
 *
 * Every existing "upload" in Pravyo is a user-pasted URL (Google Drive links,
 * proxied through /api/media/drive/[id]). There is no object store, no
 * multipart handling, and no storage credentials anywhere in the codebase or
 * .env.example. Voice notes, photos and documents all need real binary storage.
 *
 * Rather than invent one — or quietly base64 audio into MongoDB, which would
 * hit the 16MB document ceiling and bloat the Message collection — the storage
 * call is isolated here behind a single function. Wiring a provider is then a
 * change to THIS FILE ONLY; the recorder, the API route, the Message schema and
 * the chat UI are all complete and provider-agnostic.
 *
 * To enable attachments, implement `putObject` for your provider (Vercel Blob,
 * S3, Cloudflare R2 …) and set the corresponding env vars. The contract is:
 *
 *     putObject({ buffer, mimeType, filename }) -> { url, thumbnailUrl? }
 *
 * Constraints the caller already enforces, so a provider need not re-check:
 *   - size cap (MAX_UPLOAD_BYTES)
 *   - MIME allow-list (ALLOWED_MIME_TYPES)
 *   - authenticated, authorised parent with canMessageSchool
 */

// Deliberately small. These are phone-recorded voice notes and photos over
// Nepali mobile data, not media library uploads (§22).
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB

export const ALLOWED_MIME_TYPES = {
  // MediaRecorder emits webm/opus on Chrome/Android and mp4/aac on Safari/iOS.
  "audio/webm": "VOICE",
  "audio/ogg": "VOICE",
  "audio/mp4": "VOICE",
  "audio/mpeg": "VOICE",
  "image/jpeg": "IMAGE",
  "image/png": "IMAGE",
  "image/webp": "IMAGE",
  "application/pdf": "DOCUMENT",
};

export function isStorageConfigured() {
  // Update this predicate when a provider is wired in below.
  return false;
}

export class StorageNotConfiguredError extends Error {
  constructor() {
    super(
      "File attachments are not available yet. Please send a text message."
    );
    this.name = "StorageNotConfiguredError";
    this.code = "STORAGE_NOT_CONFIGURED";
  }
}

/**
 * Persist one attachment and return its public URL.
 *
 * Throws StorageNotConfiguredError until a provider is implemented. The API
 * route turns that into a clear 503 the parent can act on ("send a text
 * message instead") rather than a generic failure.
 */
export async function putObject() {
  throw new StorageNotConfiguredError();
}

/** Classify an upload for the Message.attachments[].kind field. */
export function kindForMimeType(mimeType) {
  return ALLOWED_MIME_TYPES[String(mimeType || "").toLowerCase()] || null;
}
