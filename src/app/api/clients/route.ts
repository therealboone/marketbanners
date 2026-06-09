import { requireAuth } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { NextResponse } from "next/server";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
});

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const clients = await prisma.client.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { campaigns: true } },
    },
  });

  return NextResponse.json(clients);
}

export async function POST(request: Request) {
  const { error } = await requireAuth();
  if (error) return error;

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const baseSlug = slugify(parsed.data.name);
  let slug = baseSlug;
  let counter = 1;

  while (await prisma.client.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter++}`;
  }

  const client = await prisma.client.create({
    data: {
      name: parsed.data.name,
      slug,
    },
  });

  return NextResponse.json(client, { status: 201 });
}
