import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { getPublicCampaignUrl } from "@/lib/slug";
import { NextResponse } from "next/server";
import { z } from "zod";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ clientId: string; campaignId: string }> },
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { clientId, campaignId } = await params;

  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, clientId },
    include: {
      client: true,
      folders: {
        where: { parentId: null },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        include: {
          _count: { select: { children: true, assets: true } },
        },
      },
    },
  });

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...campaign,
    publicUrl: getPublicCampaignUrl(campaign.client.slug, campaign.slug),
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ clientId: string; campaignId: string }> },
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { clientId, campaignId } = await params;
  const body = await request.json();
  const parsed = z.object({ name: z.string().min(1) }).safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const campaign = await prisma.campaign.updateMany({
    where: { id: campaignId, clientId },
    data: { name: parsed.data.name },
  });

  if (campaign.count === 0) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const updated = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: { client: true },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ clientId: string; campaignId: string }> },
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { clientId, campaignId } = await params;

  const result = await prisma.campaign.deleteMany({
    where: { id: campaignId, clientId },
  });

  if (result.count === 0) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
