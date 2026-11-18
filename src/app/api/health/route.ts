import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Public liveness/readiness check for Nginx, PM2 or uptime monitors.
 * Returns only "ok"/"error" — no versions, hostnames or error details.
 */
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("[health] database check failed", error);
    return NextResponse.json({ status: "error" }, { status: 503 });
  }
}
