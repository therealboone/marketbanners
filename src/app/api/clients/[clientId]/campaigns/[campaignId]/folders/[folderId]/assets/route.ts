import { requireAuth } from "@/lib/api-auth";
import { ALLOWED_IMAGE_TYPES, MAX_UPLOAD_BYTES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { buildStorageKey, getPublicAssetUrl, uploadObject } from "@/lib/r2";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ clientId: string; campaignId: string; folderId: string }>;
  },
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { clientId, campaignId, folderId } = await params;

  const folder = await prisma.folder.findFirst({
    where: { id: folderId, campaignId, campaign: { clientId } },
  });

  if (!folder) {
    return NextResponse.json({ error: "Folder not found" }, { status: 404 });
  }

  const assets = await prisma.asset.findMany({
    where: { folderId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    assets.map((asset) => ({
      ...asset,
      url: getPublicAssetUrl(asset.storageKey),
    })),
  );
}

export async function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ clientId: string; campaignId: string; folderId: string }>;
  },
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { clientId, campaignId, folderId } = await params;

  const folder = await prisma.folder.findFirst({
    where: { id: folderId, campaignId, campaign: { clientId } },
    include: { campaign: { include: { client: true } } },
  });

  if (!folder) {
    return NextResponse.json({ error: "Folder not found" }, { status: 404 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json({ error: "Expected multipart form upload" }, { status: 400 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "File too large (max 4 MB)" }, { status: 400 });
    }

    const widthRaw = formData.get("width");
    const heightRaw = formData.get("height");
    const width =
      typeof widthRaw === "string" && widthRaw ? parseInt(widthRaw, 10) : undefined;
    const height =
      typeof heightRaw === "string" && heightRaw ? parseInt(heightRaw, 10) : undefined;

    const storageKey = buildStorageKey(
      folder.campaign.client.slug,
      folder.campaign.slug,
      folderId,
      file.name,
    );

    const buffer = Buffer.from(await file.arrayBuffer());
    await uploadObject(storageKey, buffer, file.type);

    const asset = await prisma.asset.create({
      data: {
        filename: file.name,
        storageKey,
        mimeType: file.type,
        fileSize: file.size,
        width: Number.isFinite(width) ? width : undefined,
        height: Number.isFinite(height) ? height : undefined,
        folderId,
      },
    });

    return NextResponse.json(
      {
        ...asset,
        url: getPublicAssetUrl(asset.storageKey),
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("Upload failed:", err);
    return NextResponse.json(
      { error: "Upload failed. Check R2 environment variables in Vercel." },
      { status: 500 },
    );
  }
}
