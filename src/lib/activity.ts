import "server-only";
import type { ActivityAction, Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

interface LogInput {
  action: ActivityAction;
  description: string;
  userId?: string | null;
  ipAddress?: string | null;
  metadata?: Prisma.InputJsonValue;
}

/**
 * Records an activity log entry. Never throws: failing to write an audit entry
 * must not break the request that triggered it.
 */
export async function logActivity(input: LogInput) {
  try {
    await db.activityLog.create({
      data: {
        action: input.action,
        description: input.description.slice(0, 500),
        userId: input.userId ?? null,
        ipAddress: input.ipAddress ?? null,
        metadata: input.metadata,
      },
    });
  } catch (error) {
    console.error("[activity] failed to write activity log", error);
  }
}

/** Best-effort client IP. Behind Nginx, X-Forwarded-For is set by the proxy. */
export function clientIpFrom(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || null;
  return headers.get("x-real-ip");
}
