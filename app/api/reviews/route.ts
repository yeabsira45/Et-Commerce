import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const vendorId = searchParams.get("vendorId");
  if (!vendorId) {
    return NextResponse.json({ error: "Missing vendorId" }, { status: 400 });
  }

  try {
    const reviews = await prisma.review.findMany({
      where: { vendorId },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { reviewer: { select: { username: true } } },
    });
    const stats = await prisma.review.aggregate({
      where: { vendorId },
      _avg: { rating: true },
      _count: { _all: true },
    });
    return NextResponse.json({
      reviews,
      average: stats._avg.rating ? Math.round(stats._avg.rating * 10) / 10 : 0,
      count: stats._count._all,
    });
  } catch {
    return NextResponse.json({ reviews: [], average: 0, count: 0 });
  }
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({} as { vendorId?: unknown; rating?: unknown; comment?: unknown }));
  const vendorId = typeof body.vendorId === "string" ? body.vendorId.trim() : "";
  const rating = body.rating;
  const comment = typeof body.comment === "string" ? body.comment.trim() : "";
  const numericRating = Number(rating);
  if (!vendorId || !Number.isFinite(numericRating)) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  if (numericRating < 1 || numericRating > 5) {
    return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 });
  }

  try {
    const existing = await prisma.review.findUnique({
      where: { vendorId_reviewerId: { vendorId, reviewerId: user.id } },
    });
    if (existing) {
      return NextResponse.json({ error: "You already reviewed this vendor" }, { status: 409 });
    }
    const review = await prisma.review.create({
      data: {
        vendorId,
        reviewerId: user.id,
        rating: numericRating,
        comment: comment || null,
      },
      include: { reviewer: { select: { username: true } } },
    });
    return NextResponse.json({ review });
  } catch {
    return NextResponse.json({ error: "Unable to submit review" }, { status: 500 });
  }
}
