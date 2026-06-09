import { requireAuth } from "@/lib/api-auth";
import { deleteObject, getPublicAssetUrl } from "@/lib/r2";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

async function buildBreadcrumbs(
  campaignName: string,
  folderId: string,
): Promise<{ id: string | null; name: string }[]> {
  const breadcrumbs: { id: string | null; name: string }[] = [];
  let currentId: string | null = folderId;

  while (currentId) {
    const current: { id: string; name: string; parentId: string | null } | null =
      await prisma.folder.findUnique({
        where: { id: currentId },
        select: { id: true, name: true, parentId: true },
      });
    if (!current) break;
    breadcrumbs.unshift({ id: current.id, name: current.name });
    currentId = current.parentId;
  }

  breadcrumbs.unshift({ id: null, name: campaignName });
  return breadcrumbs;
}

async function getFolderWithCampaign(folderId: string, clientId: string, campaignId: string) {
  return prisma.folder.findFirst({
    where: { id: folderId, campaignId, campaign: { clientId } },
    include: {
      assets: true,
      children: { include: { assets: true, children: true } },
    },
  });
}

async function deleteFolderTree(folderId: string) {
  const folder = await prisma.folder.findUnique({
    where: { id: folderId },
    include: {
      assets: true,
      children: true,
    },
  });

  if (!folder) return;

  for (const child of folder.children) {
    await deleteFolderTree(child.id);
  }

  for (const asset of folder.assets) {
    try {
      await deleteObject(asset.storageKey);
    } catch {
      // Continue cleanup even if R2 delete fails
    }
  }

  await prisma.folder.delete({ where: { id: folderId } });
}

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
    include: {
      campaign: true,
      parent: true,
      children: {
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        include: {
          _count: { select: { children: true, assets: true } },
        },
      },
      assets: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!folder) {
    return NextResponse.json({ error: "Folder not found" }, { status: 404 });
  }

  const breadcrumbs = await buildBreadcrumbs(folder.campaign.name, folderId);

  return NextResponse.json({
    ...folder,
    breadcrumbs,
    assets: folder.assets.map((asset) => ({
      ...asset,
      url: getPublicAssetUrl(asset.storageKey),
    })),
  });
}

export async function PATCH(
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
  const parsed = z.object({ name: z.string().min(1) }).safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const result = await prisma.folder.updateMany({
    where: { id: folderId, campaignId, campaign: { clientId } },
    data: { name: parsed.data.name },
  });

  if (result.count === 0) {
    return NextResponse.json({ error: "Folder not found" }, { status: 404 });
  }

  const folder = await prisma.folder.findUnique({ where: { id: folderId } });
  return NextResponse.json(folder);
}

export async function DELETE(
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

  const folder = await getFolderWithCampaign(folderId, clientId, campaignId);
  if (!folder) {
    return NextResponse.json({ error: "Folder not found" }, { status: 404 });
  }

  await deleteFolderTree(folderId);
  return NextResponse.json({ success: true });
}
