import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export function getR2ConfigStatus() {
  return {
    hasAccountId: Boolean(process.env.R2_ACCOUNT_ID),
    hasAccessKeyId: Boolean(process.env.R2_ACCESS_KEY_ID),
    hasSecretAccessKey: Boolean(process.env.R2_SECRET_ACCESS_KEY),
    hasBucketName: Boolean(process.env.R2_BUCKET_NAME),
    hasPublicUrl: Boolean(process.env.R2_PUBLIC_URL),
  };
}

function getR2Endpoint(): string {
  if (process.env.R2_ENDPOINT) {
    return process.env.R2_ENDPOINT.replace(/\/$/, "");
  }

  const accountId = process.env.R2_ACCOUNT_ID;
  if (!accountId) {
    throw new Error("R2_ACCOUNT_ID is not configured");
  }

  return `https://${accountId}.r2.cloudflarestorage.com`;
}

function getR2Client() {
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error("R2 access keys are not configured");
  }

  return new S3Client({
    region: "auto",
    endpoint: getR2Endpoint(),
    forcePathStyle: true,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

export function formatR2Error(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);

  if (message.includes("R2_ACCOUNT_ID")) {
    return "R2_ACCOUNT_ID is missing in Vercel environment variables.";
  }
  if (message.includes("R2_BUCKET_NAME")) {
    return "R2_BUCKET_NAME is missing in Vercel environment variables.";
  }
  if (message.includes("access keys")) {
    return "R2_ACCESS_KEY_ID or R2_SECRET_ACCESS_KEY is missing in Vercel.";
  }
  if (message.includes("NoSuchBucket") || message.includes("Bucket not found")) {
    return "R2 bucket not found. Check R2_BUCKET_NAME matches your bucket exactly.";
  }
  if (message.includes("InvalidAccessKeyId")) {
    return "R2_ACCESS_KEY_ID is invalid. Create a new R2 API token in Cloudflare.";
  }
  if (message.includes("SignatureDoesNotMatch")) {
    return "R2_SECRET_ACCESS_KEY is wrong. Re-copy it from your R2 API token.";
  }
  if (message.includes("AccessDenied") || message.includes("403")) {
    return "R2 token lacks permission. Create a token with Object Read & Write for this bucket.";
  }

  return `R2 upload failed: ${message}`;
}

export function getPublicAssetUrl(storageKey: string): string {
  const base = process.env.R2_PUBLIC_URL;
  if (!base) {
    throw new Error("R2_PUBLIC_URL is not configured");
  }
  return `${base.replace(/\/$/, "")}/${storageKey}`;
}

export async function uploadObject(
  storageKey: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) {
    throw new Error("R2_BUCKET_NAME is not configured");
  }

  const client = getR2Client();
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: storageKey,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export async function testR2Connection(): Promise<{ ok: boolean; error?: string }> {
  const config = getR2ConfigStatus();
  const missing = Object.entries(config)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    return { ok: false, error: `Missing R2 config: ${missing.join(", ")}` };
  }

  const key = `.__healthcheck-${Date.now()}`;

  try {
    await uploadObject(key, Buffer.from("ok"), "text/plain");
    await deleteObject(key);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: formatR2Error(err) };
  }
}

export async function createPresignedUploadUrl(
  storageKey: string,
  contentType: string,
  _fileSize: number,
): Promise<string> {
  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) {
    throw new Error("R2_BUCKET_NAME is not configured");
  }

  const client = getR2Client();
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: storageKey,
    ContentType: contentType,
  });

  return getSignedUrl(client, command, { expiresIn: 600 });
}

export async function deleteObject(storageKey: string): Promise<void> {
  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) {
    throw new Error("R2_BUCKET_NAME is not configured");
  }

  const client = getR2Client();
  await client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: storageKey,
    }),
  );
}

export function buildStorageKey(
  clientSlug: string,
  campaignSlug: string,
  folderId: string,
  filename: string,
): string {
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${clientSlug}/${campaignSlug}/${folderId}/${Date.now()}-${safeName}`;
}
