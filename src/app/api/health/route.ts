import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);

  if (!hasDatabaseUrl) {
    return NextResponse.json({
      ok: false,
      hasDatabaseUrl: false,
      database: "DATABASE_URL is not set in Vercel environment variables",
    });
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      ok: true,
      hasDatabaseUrl: true,
      database: "connected",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({
      ok: false,
      hasDatabaseUrl: true,
      database: "connection failed",
      hint: "Use Neon's pooled connection string with ?sslmode=require",
      error: message,
    });
  }
}
