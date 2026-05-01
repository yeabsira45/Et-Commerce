import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import type { Prisma } from "@prisma/client";

export async function recordAnalyticsEvent(req: Request, eventName: string, data?: Prisma.InputJsonValue) {
  try {
    const user = await getSessionUser();
    const forwardedFor = req.headers.get("x-forwarded-for") || "";
    const ip = forwardedFor.split(",")[0]?.trim() || null;
    const userAgent = req.headers.get("user-agent");
    const referrer = req.headers.get("referer");
    const page = new URL(req.url).pathname;

    await prisma.analyticsEvent.create({
      data: {
        userId: user?.id || null,
        eventName,
        page,
        referrer,
        ip,
        userAgent,
        data: data ?? undefined,
      },
    });
  } catch {
    // Analytics should never break user-facing requests.
  }
}
