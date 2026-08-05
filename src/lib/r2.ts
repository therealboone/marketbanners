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

type R2Transport = "rest" | "s3";

type R2Diagnostics = {
  bucketName: string;
  endpoint: string;
  transport: R2Transport;
  headBucket: "ok" | "denied" | "not_found" | "error" | "skipped";
  putObject: "ok" | "denied" | "error";
  availableBuckets?: string[];
};

function getR2Transport(): R2Transport {
  return env("CLOUDFLARE_API_TOKEN") ? "rest" : "s3";
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
    hasCloudflareApiToken: Boolean(env("CLOUDFLARE_API_TOKEN")),
    transport: getR2Transport(),
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

function encodeObjectKeyForRestApi(storageKey: string): string {
  // REST routing requires a single path segment — storage keys must not contain "/".
  if (storageKey.includes("/")) {
    throw new Error(
      "R2 REST API requires flat storage keys without slashes. Re-upload affected assets.",
    );
  }
  return encodeURIComponent(storageKey);
}

function restObjectUrl(storageKey: string): string {
  const accountId = env("R2_ACCOUNT_ID");
  const bucket = env("R2_BUCKET_NAME");
  if (!accountId) {
    throw new Error("R2_ACCOUNT_ID is not configured");
  }
  if (!bucket) {
    throw new Error("R2_BUCKET_NAME is not configured");
  }

  return `https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets/${encodeURIComponent(bucket)}/objects/${encodeObjectKeyForRestApi(storageKey)}`;
}

function restAccountUrl(path: string): string {
  const accountId = env("R2_ACCOUNT_ID");
  if (!accountId) {
    throw new Error("R2_ACCOUNT_ID is not configured");
  }

  return `https://api.cloudflare.com/client/v4/accounts/${accountId}${path}`;
}

function getRestAuthHeaders(contentType?: string): Record<string, string> {
  const token = env("CLOUDFLARE_API_TOKEN");
  if (!token) {
    throw new Error("CLOUDFLARE_API_TOKEN is not configured");
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };
  if (contentType) {
    headers["Content-Type"] = contentType;
  }
  return headers;
}

async function listRestBucketNames(): Promise<string[]> {
  const response = await fetch(restAccountUrl("/r2/buckets"), {
    method: "GET",
    headers: getRestAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(`R2 REST GET failed: ${await parseRestError(response)}`);
  }

  const data = (await response.json()) as {
    result?: { buckets?: Array<{ name?: string }> };
  };

  return (data.result?.buckets ?? [])
    .map((entry) => entry.name)
    .filter((name): name is string => Boolean(name));
}

async function parseRestError(response: Response): Promise<string> {
  let detail = `HTTP ${response.status}`;
  try {
    const data = (await response.json()) as {
      errors?: Array<{ message?: string }>;
    };
    if (data.errors?.length) {
      detail = data.errors.map((error) => error.message ?? "Unknown error").join("; ");
    }
  } catch {
    const text = await response.text();
    if (text) detail = `${detail}: ${text}`;
  }
  return detail;
}

function bufferToBodyInit(buffer: Buffer): BodyInit {
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  ) as ArrayBuffer;
}

async function restRequest(
  method: "PUT" | "DELETE" | "GET",
  url: string,
  body?: Buffer,
  contentType?: string,
): Promise<void> {
  const requestBody: BodyInit | undefined = body ? bufferToBodyInit(body) : undefined;

  const response = await fetch(url, {
    method,
    headers: getRestAuthHeaders(contentType),
    body: requestBody,
  });

  if (!response.ok) {
    throw new Error(`R2 REST ${method} failed: ${await parseRestError(response)}`);
  }
}

async function uploadObjectViaRest(
  storageKey: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  await restRequest("PUT", restObjectUrl(storageKey), body, contentType);
}

async function deleteObjectViaRest(storageKey: string): Promise<void> {
  await restRequest("DELETE", restObjectUrl(storageKey));
}

export function formatR2Error(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);

  if (message.includes("R2_ACCOUNT_ID")) {
    return "R2_ACCOUNT_ID is missing in environment variables.";
  }
  if (message.includes("R2_BUCKET_NAME")) {
    return "R2_BUCKET_NAME is missing in environment variables.";
  }
  if (message.includes("CLOUDFLARE_API_TOKEN")) {
    return "CLOUDFLARE_API_TOKEN is missing. Create a Cloudflare API token with Account → Workers R2 Storage → Edit permission.";
  }
  if (message.includes("access keys")) {
    return "R2_ACCESS_KEY_ID or R2_SECRET_ACCESS_KEY is missing in environment variables.";
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
    if (getR2Transport() === "rest") {
      return `R2 access denied${bucketHint}. Check CLOUDFLARE_API_TOKEN has Account → Workers R2 Storage → Edit for this account.`;
    }
    return `R2 access denied${bucketHint}. Usually the API token is scoped to a different bucket than R2_BUCKET_NAME, or the deploy still has access keys from an older token. Recreate the token for this exact bucket, update both keys, and redeploy.`;
  }
  if (
    message.includes("EPROTO") ||
    message.includes("handshake failure") ||
    message.includes("SSL alert number 40")
  ) {
    const endpoint = getR2ConfigStatus().endpoint ?? "your R2 S3 endpoint";
    return `R2 S3 endpoint TLS handshake failed (${endpoint}). Add CLOUDFLARE_API_TOKEN to use Cloudflare's REST API instead, or contact Cloudflare support to fix the S3 endpoint for your account.`;
  }
  if (message.includes("Could not route to")) {
    const accountId = env("R2_ACCOUNT_ID");
    return `R2 REST API routing failed. Verify R2_ACCOUNT_ID (${accountId ?? "missing"}) matches the Account ID on Cloudflare → R2 → Overview, and that CLOUDFLARE_API_TOKEN is an Account API token with Workers R2 Storage → Edit (User tokens may not work for R2 REST).`;
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
  if (getR2Transport() === "rest") {
    await uploadObjectViaRest(storageKey, body, contentType);
    return;
  }

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

function isTlsHandshakeFailure(err: unknown): boolean {
  const message = errorMessage(err);
  return (
    message.includes("EPROTO") ||
    message.includes("handshake failure") ||
    message.includes("SSL alert number 40")
  );
}

async function enrichRestDiagnostics(diagnostics: R2Diagnostics): Promise<void> {
  try {
    diagnostics.availableBuckets = await listRestBucketNames();
    const bucket = diagnostics.bucketName;
    if (diagnostics.availableBuckets.includes(bucket)) {
      diagnostics.headBucket = "ok";
    } else if (diagnostics.availableBuckets.length > 0) {
      diagnostics.headBucket = "not_found";
    } else {
      diagnostics.headBucket = "not_found";
    }
  } catch (err) {
    diagnostics.headBucket = "skipped";
    diagnostics.availableBuckets = [];
    if (isAccessDenied(err)) {
      diagnostics.headBucket = "denied";
    }
  }
}

async function testR2ConnectionViaRest(): Promise<{
  ok: boolean;
  error?: string;
  diagnostics?: R2Diagnostics;
}> {
  const bucket = env("R2_BUCKET_NAME")!;
  const diagnostics: R2Diagnostics = {
    bucketName: bucket,
    endpoint: "https://api.cloudflare.com/client/v4",
    transport: "rest",
    headBucket: "skipped",
    putObject: "error",
  };

  const key = `healthcheck-${Date.now()}.txt`;

  try {
    await uploadObjectViaRest(key, Buffer.from("ok"), "text/plain");
    diagnostics.putObject = "ok";
    await deleteObjectViaRest(key);
    await enrichRestDiagnostics(diagnostics);
    return { ok: true, diagnostics };
  } catch (err) {
    await enrichRestDiagnostics(diagnostics);

    if (isAccessDenied(err)) {
      diagnostics.putObject = "denied";
      return {
        ok: false,
        error: `R2 write denied for bucket "${bucket}". Check CLOUDFLARE_API_TOKEN has Account → Workers R2 Storage → Edit.`,
        diagnostics,
      };
    }

    diagnostics.putObject = "error";
    let error = formatR2Error(err);
    if (
      diagnostics.headBucket === "not_found" &&
      diagnostics.availableBuckets?.length
    ) {
      error += ` Available buckets in this account: ${diagnostics.availableBuckets.join(", ")}.`;
    }
    return { ok: false, error, diagnostics };
  }
}

export async function testR2Connection(): Promise<{
  ok: boolean;
  error?: string;
  diagnostics?: R2Diagnostics;
}> {
  const transport = getR2Transport();
  const config = getR2ConfigStatus();

  const required =
    transport === "rest"
      ? (["hasAccountId", "hasBucketName", "hasCloudflareApiToken"] as const)
      : ([
          "hasAccountId",
          "hasAccessKeyId",
          "hasSecretAccessKey",
          "hasBucketName",
          "hasPublicUrl",
        ] as const);

  const missing = required.filter((key) => !config[key]).map((key) => key.replace(/^has/, "").replace(/^(.)/, (m) => m.toLowerCase()));

  if (missing.length > 0) {
    return { ok: false, error: `Missing R2 config: ${missing.join(", ")}` };
  }

  if (transport === "rest") {
    return testR2ConnectionViaRest();
  }

  const bucket = env("R2_BUCKET_NAME")!;
  const endpoint = getR2Endpoint();
  const client = getR2Client();
  const diagnostics: R2Diagnostics = {
    bucketName: bucket,
    endpoint,
    transport: "s3",
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
        error: `R2 access denied for bucket "${bucket}". The API token is likely scoped to a different bucket than R2_BUCKET_NAME.`,
        diagnostics,
      };
    }
    if (isTlsHandshakeFailure(err)) {
      diagnostics.headBucket = "error";
      return {
        ok: false,
        error: formatR2Error(err),
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
        error: `R2 can reach bucket "${bucket}" but write is denied. The deploy may still be using access keys from an older token — update R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY and redeploy.`,
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
  if (getR2Transport() === "rest") {
    await deleteObjectViaRest(storageKey);
    return;
  }

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
  // Flat key (no slashes) — required for Cloudflare REST API routing on this account.
  return `${clientSlug}__${campaignSlug}__${folderId}__${Date.now()}-${safeName}`;
}
