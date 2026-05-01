import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { createAdminAuditLog } from "@/lib/adminAudit";

type Params = { params: { id: string } };

export async function POST(req: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({} as { action?: string; reason?: string }));
  const action = String(body.action || "").trim().toLowerCase();
  const reason = String(body.reason || "").trim();
  const now = new Date();

  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }
  if (action === "reject" && !reason) {
    return NextResponse.json({ error: "Rejection reason is required" }, { status: 400 });
  }

  const existing = await prisma.listing.findUnique({
    where: { id: params.id },
    select: { id: true, ownerId: true, title: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  const moderationState = action === "approve" ? "APPROVED" : "REJECTED";
  const status = action === "approve" ? "ACTIVE" : "ARCHIVED";

  const listing = await prisma.listing.update({
    where: { id: params.id },
    data: {
      moderationState,
      moderationReason: action === "reject" ? reason : null,
      moderatedAt: now,
      moderatedByUserId: user.id,
      status,
    },
    select: {
      id: true,
      title: true,
      status: true,
      moderationState: true,
      moderationReason: true,
      moderatedAt: true,
      moderatedByUserId: true,
    },
  });

  await prisma.notification.create({
    data: {
      senderId: user.id,
      receiverId: existing.ownerId,
      type: "SYSTEM",
      title: action === "approve" ? "Listing approved" : "Listing rejected",
      body:
        action === "approve"
          ? `Your listing "${existing.title}" was approved and is now visible.`
          : `Your listing "${existing.title}" was rejected. ${reason}`,
      data: {
        listingId: existing.id,
        action: action === "approve" ? "listing_approved" : "listing_rejected",
      },
    },
  });

  await createAdminAuditLog({
    actorUserId: user.id,
    action: action === "approve" ? "LISTING_APPROVE" : "LISTING_REJECT",
    targetType: "listing",
    targetId: existing.id,
    metadata: { reason: reason || null },
  });

  return NextResponse.json({ listing });
}
