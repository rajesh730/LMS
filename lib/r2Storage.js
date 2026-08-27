import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

let client;

function required(name) {
  const value = String(process.env[name] || "").trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function endpoint() {
  const value = required("R2_ENDPOINT").replace(/\/+$/, "");
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("R2_ENDPOINT_INVALID");
  }
  if (
    parsed.protocol !== "https:" ||
    !parsed.hostname.endsWith(".r2.cloudflarestorage.com") ||
    (parsed.pathname && parsed.pathname !== "/")
  ) {
    throw new Error("R2_ENDPOINT_INVALID");
  }
  return value;
}

export function isR2Configured() {
  return Boolean(
    process.env.R2_ENDPOINT &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_PRIVATE_BUCKET &&
      process.env.R2_PUBLIC_BUCKET
  );
}

function getClient() {
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: endpoint(),
      maxAttempts: 2,
      credentials: {
        accessKeyId: required("R2_ACCESS_KEY_ID"),
        secretAccessKey: required("R2_SECRET_ACCESS_KEY"),
      },
    });
  }
  return client;
}

export function bucketForVisibility(visibility) {
  return visibility === "PUBLIC"
    ? required("R2_PUBLIC_BUCKET")
    : required("R2_PRIVATE_BUCKET");
}

export async function putR2Object({ key, body, contentType, visibility }) {
  await getClient().send(
    new PutObjectCommand({
      Bucket: bucketForVisibility(visibility),
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl:
        visibility === "PUBLIC"
          ? "public, max-age=31536000, immutable"
          : "private, no-store",
    }),
    { abortSignal: AbortSignal.timeout(12000) }
  );
}

export async function getR2Object({ key, storageKey, visibility }) {
  return getClient().send(
    new GetObjectCommand({
      Bucket: bucketForVisibility(visibility),
      Key: key || storageKey,
    })
  );
}

export async function deleteR2Object({ key, storageKey, visibility }) {
  return getClient().send(
    new DeleteObjectCommand({
      Bucket: bucketForVisibility(visibility),
      Key: key || storageKey,
    })
  );
}
