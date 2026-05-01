import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function createAdminAuditLog(input: {
  actorUserId: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  metadata?: Prisma.InputJsonValue;
}) {
  try {
    await prisma.adminAuditLog.create({
      data: {
        actorUserId: input.actorUserId,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId || null,
        metadata: input.metadata ?? undefined,
      },
    });
  } catch {
    // Admin audit should not block operational API flow.
  }
}
