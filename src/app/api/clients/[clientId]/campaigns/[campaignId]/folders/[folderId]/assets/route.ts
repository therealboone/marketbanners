import { requireAuth } from "@/lib/api-auth";
import { ALLOWED_IMAGE_TYPES, MAX_UPLOAD_BYTES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import {
  buildStorageKey,
  createPresignedUploadUrl,
  getPublicAssetUrl,
} from "@/lib/r2";
import { NextResponse } from "next/server";
import { z } from "zod";

const uploadRequestSchema = z.object({
  filename: z.string().min(1),
  mimeType: z.string().min(1),
  fileSize: z.number().int().positive(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

const confirmSchema = z.object({
  filename: z.string().min(1),
  storageKey: z.string().min(1),
  mimeType: z.string().min(1),
  fileSize: z.number().int().positive(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

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
  const body = await request.json();

  const folder = await prisma.folder.findFirst({
    where: { id: folderId, campaignId, campaign: { clientId } },
    include: { campaign: { include: { client: true } } },
  });

  if (!folder) {
    return NextResponse.json({ error: "Folder not found" }, { status: 404 });
  }

  // Step 1: request presigned upload URL
  if (body.action === "presign") {
    try {
      const parsed = uploadRequestSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: "Invalid input" }, { status: 400 });
      }

      const { filename, mimeType, fileSize } = parsed.data;

      if (!ALLOWED_IMAGE_TYPES.includes(mimeType as (typeof ALLOWED_IMAGE_TYPES)[number])) {
        return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
      }

      if (fileSize > MAX_UPLOAD_BYTES) {
        return NextResponse.json({ error: "File too large (max 10 MB)" }, { status: 400 });
      }

      const storageKey = buildStorageKey(
        folder.campaign.client.slug,
        folder.campaign.slug,
        folderId,
        filename,
      );

      const uploadUrl = await createPresignedUploadUrl(storageKey, mimeType, fileSize);

      return NextResponse.json({ uploadUrl, storageKey });
    } catch (err) {
      console.error("Presign failed:", err);
      return NextResponse.json(
        { error: "Storage not configured. Check R2 environment variables in Vercel." },
        { status: 500 },
      );
    }
  }

  // Step 2: confirm upload and save to database
  if (body.action === "confirm") {
    const parsed = confirmSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const asset = await prisma.asset.create({
      data: {
        filename: parsed.data.filename,
        storageKey: parsed.data.storageKey,
        mimeType: parsed.data.mimeType,
        fileSize: parsed.data.fileSize,
        width: parsed.data.width,
        height: parsed.data.height,
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
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
