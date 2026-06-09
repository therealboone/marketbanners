import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { NextResponse } from "next/server";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ clientId: string }> },
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { clientId } = await params;
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      campaigns: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  return NextResponse.json(client);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ clientId: string }> },
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { clientId } = await params;
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);

  if (!parsed.success || !parsed.data.name) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const client = await prisma.client.update({
    where: { id: clientId },
    data: { name: parsed.data.name },
  });

  return NextResponse.json(client);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ clientId: string }> },
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { clientId } = await params;
  await prisma.client.delete({ where: { id: clientId } });
  return NextResponse.json({ success: true });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ clientId: string }> },
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { clientId } = await params;
  const body = await request.json();
  const parsed = z.object({ name: z.string().min(1) }).safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const baseSlug = slugify(parsed.data.name);
  let slug = baseSlug;
  let counter = 1;

  while (
    await prisma.campaign.findUnique({
      where: { clientId_slug: { clientId, slug } },
    })
  ) {
    slug = `${baseSlug}-${counter++}`;
  }

  const campaign = await prisma.campaign.create({
    data: {
      name: parsed.data.name,
      slug,
      clientId,
    },
  });

  return NextResponse.json(campaign, { status: 201 });
}
