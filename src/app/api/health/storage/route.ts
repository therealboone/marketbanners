import { getR2ConfigStatus, testR2Connection } from "@/lib/r2";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const config = getR2ConfigStatus();
  const result = await testR2Connection();

  return NextResponse.json({
    ok: result.ok,
    config,
    storage: result.ok ? "connected" : "failed",
    diagnostics: result.diagnostics ?? null,
    error: result.error ?? null,
  });
}
