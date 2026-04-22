import { prisma } from "@/lib/prisma";

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const [first] = forwarded.split(",");
    return first.trim();
  }
  return req.headers.get("x-real-ip") || "unknown";
}

export async function enforceRateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  const nowMs = Date.now();
  const windowStartMs = nowMs - (nowMs % windowMs);
  const windowStart = new Date(windowStartMs);

  const existing = await prisma.rateLimitBucket.findUnique({
    where: { key },
    select: { key: true, count: true, windowStart: true },
  });

  if (!existing) {
    await prisma.rateLimitBucket.create({
      data: { key, count: 1, windowStart },
    });
    return true;
  }

  if (existing.windowStart.getTime() !== windowStartMs) {
    await prisma.rateLimitBucket.update({
      where: { key },
      data: { count: 1, windowStart },
    });
    return true;
  }

  if (existing.count >= limit) return false;

  await prisma.rateLimitBucket.update({
    where: { key },
    data: { count: { increment: 1 } },
  });
  return true;
}
