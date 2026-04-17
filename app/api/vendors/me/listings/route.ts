import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { uploadApiPath } from "@/lib/uploadSecurity";

export async function GET() {
  const user = await getSessionUser();
  if (!user || !user.vendor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const listings = await prisma.listing.findMany({
    where: { vendorId: user.vendor.id },
    orderBy: { createdAt: "desc" },
    include: {
      images: { select: { uploadId: true, sortOrder: true } },
      vendor: {
        select: { id: true, slug: true, storeName: true, city: true, area: true, profileImageUploadId: true },
      },
    },
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
