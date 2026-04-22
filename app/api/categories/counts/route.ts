import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const COUNTS_CACHE_TTL_MS = 60_000;
let categoryCountsCache: { expiresAt: number; counts: Record<string, number> } | null = null;

export async function GET() {
  if (categoryCountsCache && categoryCountsCache.expiresAt > Date.now()) {
    return NextResponse.json(
      { counts: categoryCountsCache.counts },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  }

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
  categoryCountsCache = {
    counts,
    expiresAt: Date.now() + COUNTS_CACHE_TTL_MS,
  };

  return NextResponse.json(
    { counts },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    }
  );
}
