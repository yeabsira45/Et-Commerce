import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit, getClientIp } from "@/lib/rateLimit";
import type { Prisma } from "@prisma/client";

export async function GET(req: Request) {
  const ip = getClientIp(req);
  if (!(await enforceRateLimit(`admin_feedback:${ip}`, 120, 60_000))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const pageSize = Math.min(50, Math.max(5, Number(searchParams.get("pageSize") || "20")));
  const type = (searchParams.get("type") || "").toUpperCase();
  const query = (searchParams.get("query") || "").trim();
  const skip = (page - 1) * pageSize;

  const where: Prisma.FeedbackWhereInput = {
    ...(type === "BUG" || type === "FEATURE" || type === "GENERAL"
      ? { type: type as "BUG" | "FEATURE" | "GENERAL" }
      : {}),
    ...(query
      ? {
          OR: [
            { message: { contains: query } },
            { user: { is: { username: { contains: query } } } },
            { user: { is: { email: { contains: query } } } },
          ],
        }
      : {}),
  };

  const [entries, total] = await Promise.all([
    prisma.feedback.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      select: {
        id: true,
        type: true,
        message: true,
        createdAt: true,
        user: { select: { id: true, username: true, email: true } },
      },
    }),
    prisma.feedback.count({ where }),
  ]);

  return NextResponse.json({
    entries,
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  });
}
