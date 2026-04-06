import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { getDemoReviewSummary, demoVendor } from "@/lib/demo";
import {
  deleteDemoListing,
  getResolvedDemoListingById,
  patchDemoListing,
  userCanModifyDemoListing,
} from "@/lib/demoListingStore";
import { ADMIN_MOCK_LISTINGS } from "@/lib/adminMock";
import { deleteAdminMockListing, patchAdminMockListing } from "@/lib/adminMockState";

type Params = { params: { id: string } };

export async function GET(_req: Request, { params }: Params) {
  const demoListing = getResolvedDemoListingById(params.id);
  if (demoListing) {
    const summary = getDemoReviewSummary();
    return NextResponse.json({
      listing: {
        ...demoListing,
        vendorRating: summary.average,
        vendorReviewCount: summary.count,
      },
    });
  }

  try {
    const listing = await prisma.listing.findUnique({
      where: { id: params.id },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        vendor: { include: { user: { select: { username: true } } } },
      },
    });
    if (!listing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    let rating = 0;
    let count = 0;
    if (listing.vendorId && listing.vendorId !== demoVendor.id) {
      const avg = await prisma.review.aggregate({
        where: { vendorId: listing.vendorId },
        _avg: { rating: true },
      });
      count = await prisma.review.count({ where: { vendorId: listing.vendorId } });
      rating = avg._avg.rating ? Math.round(avg._avg.rating * 10) / 10 : 0;
    }
    return NextResponse.json({
      listing: {
        ...listing,
        vendor: listing.vendor
          ? {
              ...listing.vendor,
              fullName: listing.vendor.user?.username,
            }
          : null,
        vendorRating: rating,
        vendorReviewCount: count,
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

export async function PATCH(req: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Vendor authentication required" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));

  const demoRow = getResolvedDemoListingById(params.id);
  if (demoRow) {
    if (!userCanModifyDemoListing(user.id, user.role, demoRow)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const updated = patchDemoListing(params.id, {
      title: body.title,
      price: body.price,
      status: body.status,
      condition: body.condition,
      description: body.description,
      images: body.images,
    });
    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ listing: updated });
  }

  if (ADMIN_MOCK_LISTINGS.some((l) => l.id === params.id)) {
    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const price =
      body.price !== undefined ? Number(String(body.price).replace(/[^\d.]/g, "")) : undefined;
    const updated = patchAdminMockListing(params.id, {
      title: body.title,
      status: body.status,
      price: Number.isNaN(price as number) ? undefined : (price as number),
      images: body.images,
    });
    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ listing: updated });
  }

  const existing = await prisma.listing.findUnique({ where: { id: params.id } });
  if (!existing || (user.role !== "ADMIN" && existing.vendorId !== user.vendor?.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const listing = await prisma.listing.update({
      where: { id: params.id },
      data: {
        title: body.title ?? undefined,
        description: body.description ?? undefined,
        price:
          body.price !== undefined
            ? Number(String(body.price).replace(/[^\d.]/g, ""))
            : undefined,
        status: body.status ?? undefined,
        condition: body.condition ?? undefined,
      },
      include: { images: true, vendor: true },
    });
    return NextResponse.json({ listing });
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Vendor authentication required" }, { status: 401 });
  }

  const demoRow = getResolvedDemoListingById(params.id);
  if (demoRow) {
    if (!userCanModifyDemoListing(user.id, user.role, demoRow)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const ok = deleteDemoListing(params.id);
    return NextResponse.json({ ok });
  }

  if (ADMIN_MOCK_LISTINGS.some((l) => l.id === params.id)) {
    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    deleteAdminMockListing(params.id);
    return NextResponse.json({ ok: true });
  }

  const existing = await prisma.listing.findUnique({ where: { id: params.id } });
  if (!existing || (user.role !== "ADMIN" && existing.vendorId !== user.vendor?.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.listing.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
