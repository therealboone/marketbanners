import {
  DeleteObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function env(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

export function getR2ConfigStatus() {
  let endpoint: string | null = null;
  try {
    endpoint = getR2Endpoint();
  } catch {
    // R2_ACCOUNT_ID missing
  }

  return {
    hasAccountId: Boolean(env("R2_ACCOUNT_ID")),
    hasAccessKeyId: Boolean(env("R2_ACCESS_KEY_ID")),
    hasSecretAccessKey: Boolean(env("R2_SECRET_ACCESS_KEY")),
    hasBucketName: Boolean(env("R2_BUCKET_NAME")),
    hasPublicUrl: Boolean(env("R2_PUBLIC_URL")),
    bucketName: env("R2_BUCKET_NAME") ?? null,
    endpoint,
  };
}

function getR2Endpoint(): string {
  const endpoint = env("R2_ENDPOINT");
  if (endpoint) {
    return endpoint.replace(/\/$/, "");
  }

  const accountId = env("R2_ACCOUNT_ID");
  if (!accountId) {
    throw new Error("R2_ACCOUNT_ID is not configured");
  }

  return `https://${accountId}.r2.cloudflarestorage.com`;
}

function getR2Client() {
  const accessKeyId = env("R2_ACCESS_KEY_ID");
  const secretAccessKey = env("R2_SECRET_ACCESS_KEY");

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
  if (
    message.includes("AccessDenied") ||
    message.includes("Access Denied") ||
    message.includes("403")
  ) {
    const bucket = env("R2_BUCKET_NAME");
    const bucketHint = bucket ? ` for bucket "${bucket}"` : " for this bucket";
    return `R2 access denied${bucketHint}. Usually the API token is scoped to a different bucket than R2_BUCKET_NAME, or Vercel still has access keys from an older token. Recreate the token for this exact bucket, update both keys in Vercel, and redeploy.`;
  }

  return `R2 upload failed: ${message}`;
}

export function getPublicAssetUrl(storageKey: string): string {
  const base = env("R2_PUBLIC_URL");
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
  const bucket = env("R2_BUCKET_NAME");
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

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function isAccessDenied(err: unknown): boolean {
  const message = errorMessage(err);
  return (
    message.includes("AccessDenied") ||
    message.includes("Access Denied") ||
    message.includes("403")
  );
}

export async function testR2Connection(): Promise<{
  ok: boolean;
  error?: string;
  diagnostics?: {
    bucketName: string;
    endpoint: string;
    headBucket: "ok" | "denied" | "not_found" | "error";
    putObject: "ok" | "denied" | "error";
  };
}> {
  const config = getR2ConfigStatus();
  const missing = Object.entries(config)
    .filter(([key, value]) => key.startsWith("has") && !value)
    .map(([key]) => key.replace(/^has/, "").replace(/^(.)/, (m) => m.toLowerCase()));

  if (missing.length > 0) {
    return { ok: false, error: `Missing R2 config: ${missing.join(", ")}` };
  }

  const bucket = env("R2_BUCKET_NAME")!;
  const endpoint = getR2Endpoint();
  const client = getR2Client();
  const diagnostics: {
    bucketName: string;
    endpoint: string;
    headBucket: "ok" | "denied" | "not_found" | "error";
    putObject: "ok" | "denied" | "error";
  } = {
    bucketName: bucket,
    endpoint,
    headBucket: "error",
    putObject: "error",
  };

  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
    diagnostics.headBucket = "ok";
  } catch (err) {
    const message = errorMessage(err);
    if (message.includes("NoSuchBucket") || message.includes("Bucket not found")) {
      diagnostics.headBucket = "not_found";
      return {
        ok: false,
        error: `R2 bucket "${bucket}" not found at ${endpoint}. Check R2_BUCKET_NAME and R2_ACCOUNT_ID match the bucket in Cloudflare.`,
        diagnostics,
      };
    }
    if (isAccessDenied(err)) {
      diagnostics.headBucket = "denied";
      return {
        ok: false,
        error: `R2 access denied for bucket "${bucket}". The API token is likely scoped to a different bucket than R2_BUCKET_NAME in Vercel.`,
        diagnostics,
      };
    }
    diagnostics.headBucket = "error";
    return { ok: false, error: formatR2Error(err), diagnostics };
  }

  const key = `.__healthcheck-${Date.now()}`;

  try {
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: Buffer.from("ok"),
        ContentType: "text/plain",
      }),
    );
    diagnostics.putObject = "ok";
    await deleteObject(key);
    return { ok: true, diagnostics };
  } catch (err) {
    if (isAccessDenied(err)) {
      diagnostics.putObject = "denied";
      return {
        ok: false,
        error: `R2 can reach bucket "${bucket}" but write is denied. Vercel may still be using access keys from an older token — update R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY and redeploy.`,
        diagnostics,
      };
    }
    diagnostics.putObject = "error";
    return { ok: false, error: formatR2Error(err), diagnostics };
  }
}

export async function createPresignedUploadUrl(
  storageKey: string,
  contentType: string,
  _fileSize: number,
): Promise<string> {
  const bucket = env("R2_BUCKET_NAME");
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
  const bucket = env("R2_BUCKET_NAME");
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
