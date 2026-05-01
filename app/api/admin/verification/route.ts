import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { computeTrustScore } from "@/lib/trust";
import { createAdminAuditLog } from "@/lib/adminAudit";

export async function GET() {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const vendors = await prisma.vendor.findMany({
    where: {
      OR: [
        { phoneVerificationStatus: "PENDING" },
        { idVerificationStatus: "PENDING" },
        { addressVerificationStatus: "PENDING" },
      ],
    },
    orderBy: { verificationSubmittedAt: "asc" },
    take: 200,
    select: {
      id: true,
      storeName: true,
      slug: true,
      userId: true,
      phoneVerificationStatus: true,
      idVerificationStatus: true,
      addressVerificationStatus: true,
      trustScore: true,
      verificationSubmittedAt: true,
      verificationReviewedAt: true,
      verificationNotes: true,
      user: { select: { username: true, email: true, createdAt: true } },
    },
  });

  return NextResponse.json({ vendors });
}

export async function PATCH(req: Request) {
  const admin = await getSessionUser();
  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const vendorId = typeof body.vendorId === "string" ? body.vendorId : "";
  const status = typeof body.status === "string" ? body.status : "";
  const field = typeof body.field === "string" ? body.field : "";
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 180) : "";
  if (!vendorId || !["phone", "id", "address"].includes(field) || !["VERIFIED", "REJECTED", "PENDING"].includes(status)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    select: {
      id: true,
      userId: true,
      user: { select: { createdAt: true } },
      phoneVerificationStatus: true,
      idVerificationStatus: true,
      addressVerificationStatus: true,
      reviews: { select: { rating: true } },
    },
  });
  if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });

  const patch: {
    phoneVerificationStatus?: "PENDING" | "VERIFIED" | "REJECTED";
    idVerificationStatus?: "PENDING" | "VERIFIED" | "REJECTED";
    addressVerificationStatus?: "PENDING" | "VERIFIED" | "REJECTED";
  } = {};
  if (field === "phone") patch.phoneVerificationStatus = status as "PENDING" | "VERIFIED" | "REJECTED";
  if (field === "id") patch.idVerificationStatus = status as "PENDING" | "VERIFIED" | "REJECTED";
  if (field === "address") patch.addressVerificationStatus = status as "PENDING" | "VERIFIED" | "REJECTED";

  const avgRating =
    vendor.reviews.length > 0
      ? vendor.reviews.reduce((sum, r) => sum + r.rating, 0) / vendor.reviews.length
      : 0;

  const trustScore = computeTrustScore({
    phoneVerificationStatus: patch.phoneVerificationStatus || vendor.phoneVerificationStatus,
    idVerificationStatus: patch.idVerificationStatus || vendor.idVerificationStatus,
    addressVerificationStatus: patch.addressVerificationStatus || vendor.addressVerificationStatus,
    accountCreatedAt: vendor.user.createdAt,
    reviewCount: vendor.reviews.length,
    averageRating: avgRating,
  });

  const updated = await prisma.vendor.update({
    where: { id: vendorId },
    data: {
      ...patch,
      trustScore,
      verificationReviewedAt: new Date(),
      verificationNotes: note || null,
    },
    select: {
      id: true,
      storeName: true,
      slug: true,
      userId: true,
      phoneVerificationStatus: true,
      idVerificationStatus: true,
      addressVerificationStatus: true,
      trustScore: true,
      verificationSubmittedAt: true,
      verificationReviewedAt: true,
      verificationNotes: true,
      user: { select: { username: true, email: true, createdAt: true } },
    },
  });

  await createAdminAuditLog({
    actorUserId: admin.id,
    action: "VENDOR_VERIFICATION_REVIEW",
    targetType: "vendor",
    targetId: vendorId,
    metadata: { field, status, note: note || null },
  });

  return NextResponse.json({ vendor: updated });
}
