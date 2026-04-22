import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";

  if (q.length < 1) {
    return NextResponse.json([]);
  }

  try {
    const listings = await prisma.listing.findMany({
      where: {
        AND: [
          { status: "ACTIVE" },
          { moderationState: "APPROVED" },
          { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
          {
            OR: [
              { title: { contains: q } },
              { category: { contains: q } },
              { subcategory: { contains: q } },
            ],
          },
        ],
      },
      select: {
        id: true,
        title: true,
        category: true,
        subcategory: true,
      },
      take: 10,
    });

    return NextResponse.json(listings);
  } catch (error) {
    console.error("Autocomplete error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
