import { requireAuth } from "@/lib/api-auth";
import { deleteObject, getPublicAssetUrl } from "@/lib/r2";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function DELETE(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{
      clientId: string;
      campaignId: string;
      folderId: string;
      assetId: string;
    }>;
  },
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { clientId, campaignId, folderId, assetId } = await params;

  const asset = await prisma.asset.findFirst({
    where: {
      id: assetId,
      folderId,
      folder: { campaignId, campaign: { clientId } },
    },
  });

  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  try {
    await deleteObject(asset.storageKey);
  } catch {
    // Continue DB delete even if R2 fails
  }

  await prisma.asset.delete({ where: { id: assetId } });
  return NextResponse.json({ success: true });
}

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{
      clientId: string;
      campaignId: string;
      folderId: string;
      assetId: string;
    }>;
  },
) {
  const { clientId, campaignId, folderId, assetId } = await params;

  const asset = await prisma.asset.findFirst({
    where: {
      id: assetId,
      folderId,
      folder: { campaignId, campaign: { clientId } },
    },
  });

  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...asset,
    url: getPublicAssetUrl(asset.storageKey),
  });
}
