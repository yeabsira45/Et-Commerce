import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { uploadApiPath } from "@/lib/uploadSecurity";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ items: [] });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const pageSize = Math.min(20, Math.max(10, Number(searchParams.get("pageSize") || "20")));
  const skip = (page - 1) * pageSize;

  const [savedRows, total] = await Promise.all([
    prisma.savedListing.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      select: {
        listing: {
          select: {
            id: true,
            title: true,
            price: true,
            city: true,
            area: true,
            details: true,
            images: { orderBy: { sortOrder: "asc" }, select: { uploadId: true, sortOrder: true } },
          },
        },
      },
    }),
    prisma.savedListing.count({ where: { userId: user.id } }),
  ]);

  return NextResponse.json({
    page,
    pageSize,
    total,
    items: savedRows.map((row) => ({
      id: row.listing.id,
      title: row.listing.title,
      price: row.listing.price,
      city: row.listing.city,
      area: row.listing.area,
      details: row.listing.details,
      images: row.listing.images.map((img) => ({
        uploadId: img.uploadId,
        sortOrder: img.sortOrder,
        url: uploadApiPath(img.uploadId),
      })),
    })),
  });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({} as { listingId?: unknown }));
    const listingId = typeof body.listingId === "string" ? body.listingId : "";
    if (!listingId) {
      return NextResponse.json({ error: "listingId required" }, { status: 400 });
    }

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true, ownerId: true, title: true, status: true, moderationState: true, expiresAt: true },
    });
    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }
    if (
      listing.status !== "ACTIVE" ||
      listing.moderationState !== "APPROVED" ||
      (listing.expiresAt && listing.expiresAt <= new Date())
    ) {
      return NextResponse.json({ error: "Listing is not available" }, { status: 400 });
    }

    await prisma.savedListing.upsert({
      where: { userId_listingId: { userId: user.id, listingId } },
      create: { userId: user.id, listingId },
      update: {},
    });

    if (listing.ownerId !== user.id) {
      const actor = (user.username || "").trim() || "A user";
      try {
        await prisma.notification.create({
          data: {
            senderId: user.id,
            receiverId: listing.ownerId,
            type: "LISTING",
            title: "Listing saved",
            body: `${actor} saved your listing "${listing.title}".`,
            data: { listingId, actorUserId: user.id, action: "saved_listing" },
          },
        });
      } catch {
        // Saving a listing should not fail if notification delivery fails.
      }
    }

    return NextResponse.json({ ok: true, created: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ ok: true, created: false });
    }
    return NextResponse.json({ error: "Failed to save listing." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({} as { listingId?: unknown }));
  const listingId = typeof body.listingId === "string" ? body.listingId : "";
  if (!listingId) {
    return NextResponse.json({ error: "listingId required" }, { status: 400 });
  }

  await prisma.savedListing.deleteMany({
    where: { userId: user.id, listingId },
  });

  return NextResponse.json({ ok: true });
}
