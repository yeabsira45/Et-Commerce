import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

type Params = { params: { id: string } };

export async function POST(_req: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const listing = await prisma.listing.findUnique({
    where: { id: params.id },
    select: { id: true, title: true, ownerId: true },
  });
  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }
  if (listing.ownerId === user.id) {
    return NextResponse.json({ ok: true });
  }

  const existing = await prisma.savedListing.findUnique({
    where: { userId_listingId: { userId: user.id, listingId: listing.id } },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ ok: true, created: false });
  }

  await prisma.savedListing.create({
    data: {
      userId: user.id,
      listingId: listing.id,
    },
  });

  const actor = (user.username || "").trim() || "A user";
  await prisma.notification.create({
    data: {
      senderId: user.id,
      receiverId: listing.ownerId,
      type: "LISTING",
      title: "Listing saved",
      body: `${actor} saved your listing "${listing.title}".`,
      data: { listingId: listing.id, actorUserId: user.id, action: "saved_listing" },
    },
  });

  return NextResponse.json({ ok: true, created: true });
}
