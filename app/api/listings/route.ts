import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { listingRepositoryCreate, ListingPersistError } from "@/lib/listings/listingRepository";
import { parseUploadIdFromValue, uploadApiPath } from "@/lib/uploadSecurity";
import { invalidateUploadMetaCacheMany } from "@/lib/uploadMetaCache";
import { normalizeSavedSearchQuery, matchesSavedSearchQuery } from "@/lib/savedSearch";
import { recordAnalyticsEvent } from "@/lib/analytics";

const LISTING_EXPIRY_DAYS = 60;
const DUPLICATE_LISTING_WINDOW_DAYS = 30;
const MAX_NEW_LISTINGS_PER_DAY = 25;
const MAX_LISTING_IMAGES_PER_LISTING = 10;
const DEFAULT_MODERATION_STATE = process.env.REQUIRE_LISTING_MODERATION === "true" ? "PENDING" : "APPROVED";

function plusDays(base: Date, days: number) {
  return new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
}

function toPublicVendor(vendor: {
  id: string;
  slug: string;
  storeName: string;
  city: string | null;
  area: string | null;
  profileImageUploadId: string | null;
}) {
  return {
    id: vendor.id,
    slug: vendor.slug,
    storeName: vendor.storeName,
    city: vendor.city,
    area: vendor.area,
    profileImageUrl: vendor.profileImageUploadId ? uploadApiPath(vendor.profileImageUploadId) : null,
  };
}

function toListingResponse(listing: {
  id: string;
  title: string;
  category: string;
  subcategory: string | null;
  description: string | null;
  price: unknown;
  condition: "NEW" | "USED";
  status: "ACTIVE" | "SOLD" | "ARCHIVED";
  city: string;
  area: string;
  details: unknown;
  createdAt: Date;
  updatedAt: Date;
  images: Array<{ uploadId: string; sortOrder: number }>;
  vendor: { id: string; slug: string; storeName: string; city: string | null; area: string | null; profileImageUploadId: string | null };
}) {
  return {
    ...listing,
    images: listing.images.map((img) => ({ url: uploadApiPath(img.uploadId), uploadId: img.uploadId, sortOrder: img.sortOrder })),
    vendor: toPublicVendor(listing.vendor),
  };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get("limit") || "24");
  const mine = searchParams.get("mine") === "true";

  if (mine) {
    const user = await getSessionUser();
    if (!user || !user.vendor) {
      return NextResponse.json({ listings: [] }, { status: 401 });
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
    return NextResponse.json({ listings: listings.map(toListingResponse) });
  }

  const listings = await prisma.listing.findMany({
    where: {
      status: "ACTIVE",
      moderationState: "APPROVED",
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 50),
    include: {
      images: { orderBy: { sortOrder: "asc" }, select: { uploadId: true, sortOrder: true } },
      vendor: {
        select: { id: true, slug: true, storeName: true, city: true, area: true, profileImageUploadId: true },
      },
    },
  });
  void recordAnalyticsEvent(req, "listings_feed_view", { mine, limit: Math.min(limit, 50) });
  return NextResponse.json({ listings: listings.map(toListingResponse) });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(
      () =>
        ({} as {
          title?: unknown;
          category?: unknown;
          subcategory?: unknown;
          description?: unknown;
          price?: unknown;
          condition?: unknown;
          city?: unknown;
          area?: unknown;
          details?: Record<string, unknown> | null;
          images?: unknown[];
        })
    );
    const {
      title,
      category,
      subcategory,
      description,
      price,
      condition,
      city,
      area,
      details,
      images,
    } = body;

    if (!title || !category || !city || !area) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const titleTrimmed = String(title).trim();
    if (titleTrimmed.length < 3) {
      return NextResponse.json({ error: "Title must be at least 3 characters." }, { status: 400 });
    }

    const normalizedPrice =
      price !== undefined && price !== null && String(price).trim() !== ""
        ? Number(String(price).replace(/[^\d.]/g, ""))
        : null;
    const now = new Date();

    const createdInLastDay = await prisma.listing.count({
      where: {
        ownerId: user.id,
        createdAt: { gte: plusDays(now, -1) },
      },
    });
    if (createdInLastDay >= MAX_NEW_LISTINGS_PER_DAY) {
      await prisma.fraudSignal.create({
        data: {
          userId: user.id,
          type: "POSTING_RATE_LIMIT_HIT",
          severity: 2,
          notes: "Vendor exceeded daily listing creation threshold.",
          data: { createdInLastDay, maxPerDay: MAX_NEW_LISTINGS_PER_DAY },
        },
      });
      return NextResponse.json({ error: "Posting limit reached. Please try again later." }, { status: 429 });
    }

    const duplicateWhere: Prisma.ListingWhereInput = {
      ownerId: user.id,
      category: String(category),
      title: titleTrimmed,
      createdAt: { gte: plusDays(now, -DUPLICATE_LISTING_WINDOW_DAYS) },
    };
    if (normalizedPrice !== null) {
      duplicateWhere.price = normalizedPrice;
    }
    const duplicate = await prisma.listing.findFirst({
      where: duplicateWhere,
      select: { id: true },
    });
    if (duplicate) {
      await prisma.fraudSignal.create({
        data: {
          userId: user.id,
          type: "DUPLICATE_LISTING_ATTEMPT",
          severity: 1,
          notes: "Potential duplicate listing detected during create flow.",
          data: { duplicateListingId: duplicate.id, title: titleTrimmed, category: String(category) },
        },
      });
      return NextResponse.json({ error: "Duplicate listing detected. Please edit your existing ad." }, { status: 409 });
    }

    let vendorId = user.vendor?.id;
    let vendorPhone = user.vendor?.phone?.trim() || "";
    if (!vendorId) {
      const fallbackPhone =
        typeof details?.["Seller Phone"] === "string"
          ? details["Seller Phone"].trim()
          : typeof details?.Phone === "string"
            ? details.Phone.trim()
            : "";
      vendorPhone = vendorPhone || fallbackPhone;
      if (!vendorPhone) {
        return NextResponse.json({ error: "Please add a vendor phone number before posting an item." }, { status: 400 });
      }
      const baseSlug = user.username.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
      let slug = baseSlug || `vendor-${Date.now()}`;
      let counter = 1;
      while (await prisma.vendor.findUnique({ where: { slug } })) {
        counter += 1;
        slug = `${baseSlug}-${counter}`;
      }
      const vendor = await prisma.vendor.create({
        data: { userId: user.id, storeName: user.username, slug, phone: vendorPhone },
      });
      vendorId = vendor.id;
    }

    if (!vendorPhone) {
      const vendorRecord = await prisma.vendor.findUnique({ where: { id: vendorId } });
      vendorPhone = vendorRecord?.phone?.trim() || "";
    }

    if (!vendorPhone) {
      return NextResponse.json({ error: "Please add a vendor phone number before posting an item." }, { status: 400 });
    }

    const requestedImageUploadIds = Array.isArray(images)
      ? images.map((value: unknown) => parseUploadIdFromValue(value)).filter((id): id is string => Boolean(id))
      : [];

    if (!requestedImageUploadIds.length) {
      return NextResponse.json({ error: "At least one uploaded image is required." }, { status: 400 });
    }
    if (requestedImageUploadIds.length > MAX_LISTING_IMAGES_PER_LISTING) {
      return NextResponse.json(
        { error: `You can attach up to ${MAX_LISTING_IMAGES_PER_LISTING} images per listing.` },
        { status: 400 }
      );
    }

    const ownedUploads = await prisma.upload.findMany({
      where: { id: { in: requestedImageUploadIds }, ownerUserId: user.id },
      select: { id: true },
    });
    if (ownedUploads.length !== requestedImageUploadIds.length) {
      return NextResponse.json({ error: "One or more images are not owned by your account." }, { status: 403 });
    }

    const listing = await listingRepositoryCreate({
      title: titleTrimmed,
      category,
      subcategory: subcategory || null,
      description: description || null,
      price: normalizedPrice,
      condition: condition === "NEW" ? "NEW" : "USED",
      city,
      area,
      vendorId,
      ownerId: user.id,
      rawDetails: details,
      moderationState: DEFAULT_MODERATION_STATE,
      expiresAt: plusDays(now, LISTING_EXPIRY_DAYS),
      images: requestedImageUploadIds.map((uploadId: string, idx: number) => ({
        uploadId,
        sortOrder: idx,
      })),
    });

    await prisma.upload.updateMany({
      where: { id: { in: requestedImageUploadIds }, ownerUserId: user.id },
      data: {
        linkedEntityType: "LISTING",
        linkedEntityId: listing.id,
        ownerVendorId: vendorId,
      },
    });
    invalidateUploadMetaCacheMany(requestedImageUploadIds);

    const activeSavedSearches = await prisma.savedSearch.findMany({
      where: {
        isActive: true,
        userId: { not: user.id },
      },
      select: { id: true, userId: true, query: true, name: true },
      take: 300,
      orderBy: { updatedAt: "desc" },
    });

    const matchingSavedSearches = activeSavedSearches.filter((entry) =>
      matchesSavedSearchQuery(
        {
          id: listing.id,
          title: listing.title,
          category: listing.category,
          subcategory: listing.subcategory,
          description: listing.description,
          city: listing.city,
          area: listing.area,
          condition: listing.condition,
          price: listing.price ? Number(listing.price) : null,
          createdAt: listing.createdAt,
        },
        normalizeSavedSearchQuery(entry.query)
      )
    );

    if (matchingSavedSearches.length) {
      await prisma.$transaction([
        prisma.notification.createMany({
          data: matchingSavedSearches.map((entry) => ({
            senderId: user.id,
            receiverId: entry.userId,
            type: "LISTING",
            title: "New listing for your saved alert",
            body: `${listing.title} matches "${entry.name}".`,
            data: { listingId: listing.id, savedSearchId: entry.id },
          })),
        }),
        prisma.savedSearch.updateMany({
          where: { id: { in: matchingSavedSearches.map((entry) => entry.id) } },
          data: { lastNotifiedAt: new Date() },
        }),
      ]);
    }

    void recordAnalyticsEvent(req, "listing_create_success", {
      category: listing.category,
      subcategory: listing.subcategory,
      hasPrice: listing.price !== null,
      imageCount: requestedImageUploadIds.length,
    });

    return NextResponse.json({
      listing: toListingResponse({
        ...listing,
        images: listing.images.map((img) => ({ uploadId: img.uploadId, sortOrder: img.sortOrder })),
        vendor: {
          id: listing.vendor.id,
          slug: listing.vendor.slug,
          storeName: listing.vendor.storeName,
          city: listing.vendor.city,
          area: listing.vendor.area,
          profileImageUploadId: listing.vendor.profileImageUploadId,
        },
      }),
    });
  } catch (e) {
    if (e instanceof ListingPersistError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create listing" }, { status: 500 });
  }
}
