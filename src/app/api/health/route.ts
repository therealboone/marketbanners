import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);

  if (!hasDatabaseUrl) {
    return NextResponse.json({
      ok: false,
      hasDatabaseUrl: false,
      database: "DATABASE_URL is not set in environment variables",
    });
  }

  try {
    await prisma.$queryRaw`SELECT 1`;

    const tables = await prisma.$queryRaw<{ table_name: string }[]>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;

    const tableNames = tables.map((t) => t.table_name);
    const hasUserTable = tableNames.includes("User");

    let userCount: number | null = null;
    if (hasUserTable) {
      userCount = await prisma.user.count();
    }

    return NextResponse.json({
      ok: hasUserTable,
      hasDatabaseUrl: true,
      database: hasUserTable ? "connected" : "connected but tables missing",
      tables: tableNames,
      userCount,
      hint: hasUserTable
        ? null
        : "Run `npx prisma migrate deploy` against this DATABASE_URL (Railway pre-deploy should do this automatically)",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({
      ok: false,
      hasDatabaseUrl: true,
      database: "connection failed",
      hint: "Check DATABASE_URL points at Railway Postgres (or your local DB) and the service can reach it",
      error: message,
    });
  }
}
