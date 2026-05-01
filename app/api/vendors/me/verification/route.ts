import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { computeTrustScore } from "@/lib/trust";

export async function GET() {
  const user = await getSessionUser();
  if (!user || !user.vendor) {
    return NextResponse.json({ error: "Vendor authentication required" }, { status: 401 });
  }
  const vendor = await prisma.vendor.findUnique({
    where: { id: user.vendor.id },
    select: {
      id: true,
      phoneVerificationStatus: true,
      idVerificationStatus: true,
      addressVerificationStatus: true,
      trustScore: true,
      verificationSubmittedAt: true,
      verificationReviewedAt: true,
      verificationNotes: true,
    },
  });
  return NextResponse.json({ verification: vendor });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || !user.vendor) {
    return NextResponse.json({ error: "Vendor authentication required" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const note =
    typeof body?.note === "string" && body.note.trim()
      ? body.note.trim().slice(0, 180)
      : "Verification request submitted.";

  const vendor = await prisma.vendor.findUnique({
    where: { id: user.vendor.id },
    select: {
      id: true,
      user: { select: { createdAt: true } },
      phoneVerificationStatus: true,
      idVerificationStatus: true,
      addressVerificationStatus: true,
    },
  });
  if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });

  const score = computeTrustScore({
    phoneVerificationStatus: vendor.phoneVerificationStatus,
    idVerificationStatus: vendor.idVerificationStatus,
    addressVerificationStatus: vendor.addressVerificationStatus,
    accountCreatedAt: vendor.user.createdAt,
  });

  const updated = await prisma.vendor.update({
    where: { id: vendor.id },
    data: {
      verificationSubmittedAt: new Date(),
      verificationNotes: note,
      phoneVerificationStatus:
        vendor.phoneVerificationStatus === "NONE" ? "PENDING" : vendor.phoneVerificationStatus,
      idVerificationStatus: vendor.idVerificationStatus === "NONE" ? "PENDING" : vendor.idVerificationStatus,
      addressVerificationStatus:
        vendor.addressVerificationStatus === "NONE" ? "PENDING" : vendor.addressVerificationStatus,
      trustScore: score,
    },
    select: {
      id: true,
      phoneVerificationStatus: true,
      idVerificationStatus: true,
      addressVerificationStatus: true,
      trustScore: true,
      verificationSubmittedAt: true,
      verificationReviewedAt: true,
      verificationNotes: true,
    },
  });

  return NextResponse.json({ verification: updated });
}
