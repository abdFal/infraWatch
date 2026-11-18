import "server-only";
import type { ActivityAction } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import type { ActivityLogEntry, Paginated } from "@/lib/types";

export async function listActivity(params: {
  page: number;
  pageSize: number;
  action?: ActivityAction;
}): Promise<Paginated<ActivityLogEntry>> {
  const where = params.action ? { action: params.action } : {};
  const total = await db.activityLog.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / params.pageSize));
  const page = Math.min(params.page, totalPages);

  const rows = await db.activityLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * params.pageSize,
    take: params.pageSize,
    include: { user: { select: { name: true, email: true } } },
  });

  return {
    items: rows.map((row) => ({
      id: row.id,
      action: row.action,
      description: row.description,
      createdAt: row.createdAt.toISOString(),
      ipAddress: row.ipAddress,
      user: row.user,
    })),
    page,
    pageSize: params.pageSize,
    total,
    totalPages,
  };
}
