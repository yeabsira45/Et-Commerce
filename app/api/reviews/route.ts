import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { demoReviews, demoVendor, getDemoReviewSummary } from "@/lib/demo";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const vendorId = searchParams.get("vendorId");
  if (!vendorId) {
    return NextResponse.json({ error: "Missing vendorId" }, { status: 400 });
  }

  if (vendorId === demoVendor.id) {
    const summary = getDemoReviewSummary();
    return NextResponse.json({
      reviews: demoReviews,
      average: summary.average,
      count: summary.count,
    });
  }

  try {
    const reviews = await prisma.review.findMany({
      where: { vendorId },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { reviewer: { select: { username: true } } },
    });
    const count = await prisma.review.count({ where: { vendorId } });
    const avg = await prisma.review.aggregate({
      where: { vendorId },
      _avg: { rating: true },
    });
    return NextResponse.json({
      reviews,
      average: avg._avg.rating ? Math.round(avg._avg.rating * 10) / 10 : 0,
      count,
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
  const { vendorId, rating, comment } = await req.json();
  const numericRating = Number(rating);
  if (!vendorId || !Number.isFinite(numericRating)) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  if (numericRating < 1 || numericRating > 5) {
    return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 });
  }

  if (vendorId === demoVendor.id) {
    return NextResponse.json({
      review: {
        id: `demo-review-${Date.now()}`,
        vendorId,
        reviewerId: user.id,
        rating: numericRating,
        comment: comment || null,
        createdAt: new Date().toISOString(),
        reviewer: { username: user.username },
      },
    });
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
