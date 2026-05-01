import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uploadApiPath } from "@/lib/uploadSecurity";
import { trustBadges } from "@/lib/trust";

type Params = { params: { slug: string } };

export async function GET(_req: Request, { params }: Params) {
  const vendor = await prisma.vendor.findUnique({
    where: { slug: params.slug },
    include: {
      user: { select: { id: true, username: true, createdAt: true } },
      listings: {
        where: {
          status: "ACTIVE",
          moderationState: "APPROVED",
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        include: { images: { take: 1, orderBy: { sortOrder: "asc" }, select: { uploadId: true, sortOrder: true } } },
      },
    },
  });
  if (!vendor) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({
    vendor: {
      id: vendor.id,
      slug: vendor.slug,
      storeName: vendor.storeName,
      city: vendor.city,
      area: vendor.area,
      trustScore: vendor.trustScore,
      trustBadges: trustBadges({
        phoneVerificationStatus: vendor.phoneVerificationStatus,
        idVerificationStatus: vendor.idVerificationStatus,
        addressVerificationStatus: vendor.addressVerificationStatus,
      }),
      phoneVerificationStatus: vendor.phoneVerificationStatus,
      idVerificationStatus: vendor.idVerificationStatus,
      addressVerificationStatus: vendor.addressVerificationStatus,
      userId: vendor.userId,
      createdAt: vendor.createdAt,
      profileImageUrl: vendor.profileImageUploadId ? uploadApiPath(vendor.profileImageUploadId) : null,
      user: {
        id: vendor.user.id,
        username: vendor.user.username,
        createdAt: vendor.user.createdAt,
      },
      listings: vendor.listings.map((listing) => ({
        id: listing.id,
        title: listing.title,
        city: listing.city,
        area: listing.area,
        images: listing.images.map((img) => ({
          uploadId: img.uploadId,
          sortOrder: img.sortOrder,
          url: uploadApiPath(img.uploadId),
        })),
      })),
    },
  });
}
