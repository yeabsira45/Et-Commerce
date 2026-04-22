import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { uploadApiPath } from "@/lib/uploadSecurity";

export async function GET() {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const listings = await prisma.listing.findMany({
    where: { moderationState: "PENDING" },
    orderBy: { createdAt: "asc" },
    include: {
      images: { take: 1, orderBy: { sortOrder: "asc" }, select: { uploadId: true, sortOrder: true } },
      vendor: {
        select: { id: true, slug: true, storeName: true, city: true, area: true, profileImageUploadId: true },
      },
      owner: { select: { id: true, username: true, email: true } },
    },
    take: 200,
  });

  return NextResponse.json({
    listings: listings.map((listing) => ({
      ...listing,
      images: listing.images.map((img) => ({
        uploadId: img.uploadId,
        sortOrder: img.sortOrder,
        url: uploadApiPath(img.uploadId),
      })),
      vendor: listing.vendor
        ? {
            ...listing.vendor,
            profileImageUrl: listing.vendor.profileImageUploadId
              ? uploadApiPath(listing.vendor.profileImageUploadId)
              : null,
          }
        : null,
    })),
  });
}
