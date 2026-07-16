import { prisma } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";

export async function recordAdminAudit({
  action,
  adminTelegramId,
  metadata,
  targetId,
  targetType,
}: {
  action: string;
  adminTelegramId: bigint;
  metadata?: Prisma.InputJsonValue;
  targetId?: string | null;
  targetType: string;
}) {
  await prisma.adminAuditLog.create({
    data: {
      action,
      adminTelegramId,
      metadata,
      targetId,
      targetType,
    },
  });
}

export async function getAdminAuditPage({
  cursor,
  limit = 40,
}: {
  cursor?: string | null;
  limit?: number;
}) {
  const rows = await prisma.adminAuditLog.findMany({
    cursor: cursor ? { id: cursor } : undefined,
    orderBy: { createdAt: "desc" },
    skip: cursor ? 1 : 0,
    take: limit + 1,
  });
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;

  return {
    items: items.map((item) => ({
      ...item,
      adminTelegramId: item.adminTelegramId.toString(),
    })),
    nextCursor: hasMore ? (items.at(-1)?.id ?? null) : null,
  };
}
