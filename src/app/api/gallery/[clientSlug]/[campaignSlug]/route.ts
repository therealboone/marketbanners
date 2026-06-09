import { getPublicAssetUrl } from "@/lib/r2";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ clientSlug: string; campaignSlug: string }> },
) {
  const { clientSlug, campaignSlug } = await params;
  const folderId = new URL(request.url).searchParams.get("folder");

  const campaign = await prisma.campaign.findFirst({
    where: {
      slug: campaignSlug,
      client: { slug: clientSlug },
    },
    include: { client: true },
  });

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  if (!folderId) {
    const folders = await prisma.folder.findMany({
      where: { campaignId: campaign.id, parentId: null },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        _count: { select: { children: true, assets: true } },
      },
    });

    return NextResponse.json({
      campaign: {
        id: campaign.id,
        name: campaign.name,
        slug: campaign.slug,
        client: campaign.client,
      },
      folder: null,
      breadcrumbs: [{ id: null, name: campaign.name }],
      folders,
      assets: [],
    });
  }

  const folder = await prisma.folder.findFirst({
    where: { id: folderId, campaignId: campaign.id },
    include: {
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

  breadcrumbs.unshift({ id: null, name: campaign.name });

  return NextResponse.json({
    campaign: {
      id: campaign.id,
      name: campaign.name,
      slug: campaign.slug,
      client: campaign.client,
    },
    folder: {
      id: folder.id,
      name: folder.name,
      parentId: folder.parentId,
    },
    breadcrumbs,
    folders: folder.children,
    assets: folder.assets.map((asset) => ({
      ...asset,
      url: getPublicAssetUrl(asset.storageKey),
    })),
  });
}
