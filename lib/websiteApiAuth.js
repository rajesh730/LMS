import crypto from "crypto";
import connectDB from "@/lib/db";
import { errorResponse } from "@/lib/apiResponse";
import { applyRateLimit } from "@/lib/rateLimit";
import SchoolWebsiteApiKey from "@/models/SchoolWebsiteApiKey";

const KEY_PREFIX = "prv_school_live_";

export function hashWebsiteApiKey(rawKey) {
  return crypto.createHash("sha256").update(String(rawKey || "")).digest("hex");
}

export function createWebsiteApiKey() {
  const rawKey = `${KEY_PREFIX}${crypto.randomBytes(32).toString("base64url")}`;
  return {
    rawKey,
    keyHash: hashWebsiteApiKey(rawKey),
    prefix: KEY_PREFIX,
    lastFour: rawKey.slice(-4),
  };
}

export async function requireWebsiteApiKey(request) {
  const authorization = request.headers.get("authorization") || "";
  if (!authorization.startsWith("Bearer ")) {
    return {
      error: errorResponse(401, "Website API key required", "API_KEY_REQUIRED"),
    };
  }

  const rawKey = authorization.slice(7).trim();
  if (!rawKey.startsWith(KEY_PREFIX) || rawKey.length > 120) {
    return { error: errorResponse(401, "Invalid API key", "INVALID_API_KEY") };
  }

  await connectDB();
  const apiKey = await SchoolWebsiteApiKey.findOne({
    keyHash: hashWebsiteApiKey(rawKey),
    revokedAt: null,
  }).lean();

  if (!apiKey) {
    return { error: errorResponse(401, "Invalid API key", "INVALID_API_KEY") };
  }

  const rate = await applyRateLimit({
    key: `website-api:${apiKey._id}`,
    windowMs: 60 * 1000,
    max: 120,
  });
  if (!rate.ok) {
    return {
      error: errorResponse(
        429,
        `Too many requests. Try again in ${rate.retryAfter}s.`,
        "RATE_LIMITED"
      ),
    };
  }

  SchoolWebsiteApiKey.updateOne(
    { _id: apiKey._id },
    { $set: { lastUsedAt: new Date() } }
  ).catch(() => {});

  return { apiKey, schoolId: apiKey.school };
}

export function websitePagination(request, defaultLimit = 12) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10) || 1);
  const limit = Math.min(
    25,
    Math.max(1, Number.parseInt(searchParams.get("limit") || String(defaultLimit), 10) || defaultLimit)
  );
  return { page, limit, skip: (page - 1) * limit };
}

export function paginatedData(items, total, page, limit) {
  return {
    items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}
