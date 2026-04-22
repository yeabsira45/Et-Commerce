import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const now = new Date();

  const rows = await prisma.listing.groupBy({
    by: ["category"],
    where: {
      status: "ACTIVE",
      moderationState: "APPROVED",
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    _count: { _all: true },
  });

  const counts = Object.fromEntries(rows.map((row) => [row.category, row._count._all]));
  return NextResponse.json({ counts });
}
