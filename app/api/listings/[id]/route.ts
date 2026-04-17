import { NextResponse } from "next/server";
import type { ListingStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { hydrateStoredListingDetails } from "@/lib/listings/listingDetailsHydrate";
import { listingRepositoryPatchListing, ListingPersistError } from "@/lib/listings/listingRepository";
import { parseUploadIdFromValue, uploadApiPath } from "@/lib/uploadSecurity";
import { invalidateUploadMetaCacheMany } from "@/lib/uploadMetaCache";

type Params = { params: { id: string } };

const LISTING_STATUS_SET = new Set<ListingStatus>(["ACTIVE", "SOLD", "ARCHIVED"]);

function parseListingStatusPatch(value: unknown): ListingStatus | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !LISTING_STATUS_SET.has(value as ListingStatus)) {
    throw new Error("INVALID_STATUS");
  }
  return value as ListingStatus;
}

export async function GET(_req: Request, { params }: Params) {
  try {
    const listing = await prisma.listing.findUnique({
      where: { id: params.id },
      include: {
        images: { orderBy: { sortOrder: "asc" }, select: { uploadId: true, sortOrder: true } },
        vendor: {
          select: {
            id: true,
            slug: true,
            storeName: true,
            city: true,
            area: true,
            profileImageUploadId: true,
            user: { select: { username: true } },
          },
        },
      },
    });
    if (!listing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    let rating = 0;
    let count = 0;
    if (listing.vendorId) {
      const stats = await prisma.review.aggregate({
        where: { vendorId: listing.vendorId },
        _avg: { rating: true },
        _count: { _all: true },
      });
      count = stats._count._all;
      rating = stats._avg.rating ? Math.round(stats._avg.rating * 10) / 10 : 0;
    }
    const hydrated = hydrateStoredListingDetails(listing.category, listing.subcategory, listing.details);
    return NextResponse.json({
      listing: {
        ...listing,
        images: listing.images.map((img) => ({
          uploadId: img.uploadId,
          sortOrder: img.sortOrder,
          url: uploadApiPath(img.uploadId),
        })),
        details: hydrated.details,
        vendor: listing.vendor
          ? {
              id: listing.vendor.id,
              slug: listing.vendor.slug,
              storeName: listing.vendor.storeName,
              city: listing.vendor.city,
              area: listing.vendor.area,
              profileImageUrl: listing.vendor.profileImageUploadId
                ? uploadApiPath(listing.vendor.profileImageUploadId)
                : null,
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

  const existing = await prisma.listing.findUnique({ where: { id: params.id } });
  if (!existing || (user.role !== "ADMIN" && existing.vendorId !== user.vendor?.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const nextTitle = body.title !== undefined ? String(body.title) : undefined;
    const nextDescription = body.description !== undefined ? (body.description === null ? null : String(body.description)) : undefined;
    const nextPrice =
      body.price !== undefined ? Number(String(body.price).replace(/[^\d.]/g, "")) : undefined;
    const nextStatus = parseListingStatusPatch(body.status);
    const nextCondition =
      body.condition !== undefined ? (body.condition === "NEW" ? "NEW" : "USED") : undefined;
    const nextCategory = body.category !== undefined ? String(body.category) : undefined;
    const nextSubcategory =
      body.subcategory !== undefined
        ? body.subcategory === null || body.subcategory === ""
          ? null
          : String(body.subcategory)
        : undefined;

    const listing = await listingRepositoryPatchListing({
      id: params.id,
      existing: {
        category: existing.category,
        subcategory: existing.subcategory,
        description: existing.description,
        details: existing.details,
      },
      title: nextTitle,
      description: nextDescription,
      price: body.price !== undefined ? (Number.isNaN(nextPrice as number) ? undefined : nextPrice) : undefined,
      status: nextStatus,
      condition: nextCondition,
      category: nextCategory,
      subcategory: nextSubcategory,
      rawDetailsPatch: body.details,
    });

    if (Array.isArray(body.images)) {
      const uploadIds = body.images
        .map((value: unknown) => parseUploadIdFromValue(value))
        .filter((id: string | null | undefined): id is string => Boolean(id));
      if (uploadIds.length > 0) {
        const ownedUploads = await prisma.upload.findMany({
          where: { id: { in: uploadIds }, ownerUserId: user.id },
          select: { id: true },
        });
        if (ownedUploads.length !== uploadIds.length) {
          return NextResponse.json({ error: "One or more images are not owned by your account." }, { status: 403 });
        }
        await prisma.image.deleteMany({ where: { listingId: params.id } });
        await prisma.image.createMany({
          data: uploadIds.map((uploadId: string, index: number) => ({
            listingId: params.id,
            uploadId,
            sortOrder: index,
          })),
        });
        await prisma.upload.updateMany({
          where: { id: { in: uploadIds }, ownerUserId: user.id },
          data: {
            linkedEntityType: "LISTING",
            linkedEntityId: params.id,
            ownerVendorId: user.vendor?.id || null,
          },
        });
        invalidateUploadMetaCacheMany(uploadIds);
      }
    }

    const refreshed = await prisma.listing.findUnique({
      where: { id: params.id },
      include: {
        images: { orderBy: { sortOrder: "asc" }, select: { uploadId: true, sortOrder: true } },
        vendor: {
          select: {
            id: true,
            slug: true,
            storeName: true,
            city: true,
            area: true,
            profileImageUploadId: true,
          },
        },
      },
    });

    return NextResponse.json({
      listing: refreshed
        ? {
            ...listing,
            images: refreshed.images.map((img) => ({
              uploadId: img.uploadId,
              sortOrder: img.sortOrder,
              url: uploadApiPath(img.uploadId),
            })),
            vendor: refreshed.vendor
              ? {
                  ...refreshed.vendor,
                  profileImageUrl: refreshed.vendor.profileImageUploadId
                    ? uploadApiPath(refreshed.vendor.profileImageUploadId)
                    : null,
                }
              : null,
          }
        : listing,
    });
  } catch (e) {
    if (e instanceof Error && e.message === "INVALID_STATUS") {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    if (e instanceof ListingPersistError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Vendor authentication required" }, { status: 401 });
  }

  const existing = await prisma.listing.findUnique({ where: { id: params.id } });
  if (!existing || (user.role !== "ADMIN" && existing.vendorId !== user.vendor?.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.listing.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
