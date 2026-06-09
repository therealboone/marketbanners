import { requireAuth } from "@/lib/api-auth";
import { STANDARD_BANNER_SIZES } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  parentId: z.string().nullable().optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ clientId: string; campaignId: string }> },
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { clientId, campaignId } = await params;
  const parentId = new URL(request.url).searchParams.get("parentId");

  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, clientId },
  });

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const folders = await prisma.folder.findMany({
    where: {
      campaignId,
      parentId: parentId || null,
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      _count: { select: { children: true, assets: true } },
    },
  });

  return NextResponse.json(folders);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ clientId: string; campaignId: string }> },
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { clientId, campaignId } = await params;
  const body = await request.json();

  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, clientId },
    include: { client: true },
  });

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  // Bulk create standard size folders
  if (body.template === "standard-sizes") {
    const parentId = body.parentId ?? null;
    const prefix = body.prefix ?? campaign.name;

    const folders = await prisma.$transaction(
      STANDARD_BANNER_SIZES.map((size, index) =>
        prisma.folder.create({
          data: {
            name: `${prefix} ${size} v1`,
            campaignId,
            parentId,
            sortOrder: index,
          },
        }),
      ),
    );

    return NextResponse.json(folders, { status: 201 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  if (parsed.data.parentId) {
    const parent = await prisma.folder.findFirst({
      where: { id: parsed.data.parentId, campaignId },
    });
    if (!parent) {
      return NextResponse.json({ error: "Parent folder not found" }, { status: 404 });
    }
  }

  const folder = await prisma.folder.create({
    data: {
      name: parsed.data.name,
      campaignId,
      parentId: parsed.data.parentId ?? null,
    },
  });

  return NextResponse.json(folder, { status: 201 });
}
