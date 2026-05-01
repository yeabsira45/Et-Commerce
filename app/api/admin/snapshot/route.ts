import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { getSessionUser } from "@/lib/auth";
import { enforceRateLimit, getClientIp } from "@/lib/rateLimit";
import { uploadApiPath } from "@/lib/uploadSecurity";

export async function GET(req: Request) {
  const ip = getClientIp(req);
  if (!(await enforceRateLimit(`admin_snapshot:${ip}`, 120, 60_000))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const pageSize = Math.min(50, Math.max(5, Number(searchParams.get("pageSize") || "20")));
    const userPage = Math.max(1, Number(searchParams.get("userPage") || "1"));
    const listingPage = Math.max(1, Number(searchParams.get("listingPage") || "1"));
    const userQuery = (searchParams.get("userQuery") || "").trim();
    const listingQuery = (searchParams.get("listingQuery") || "").trim();
    const userSort = searchParams.get("userSort") === "email" ? "email" : "username";
    const listingSort = searchParams.get("listingSort") === "price_desc" ? "price_desc" : "title";

    const userSkip = (userPage - 1) * pageSize;
    const listingSkip = (listingPage - 1) * pageSize;

    const userWhere: Prisma.UserWhereInput = userQuery
      ? {
          OR: [
            { username: { contains: userQuery } },
            { email: { contains: userQuery } },
            { vendor: { is: { storeName: { contains: userQuery } } } },
          ],
        }
      : {};

    const listingWhere: Prisma.ListingWhereInput = listingQuery
      ? {
          OR: [
            { title: { contains: listingQuery } },
            { city: { contains: listingQuery } },
            { area: { contains: listingQuery } },
            { ownerId: { contains: listingQuery } },
          ],
        }
      : {};

    const listingOrderBy: Prisma.ListingOrderByWithRelationInput[] =
      listingSort === "price_desc"
        ? [{ price: "desc" }, { createdAt: "desc" }]
        : [{ title: "asc" }, { createdAt: "desc" }];

    const [dbUsers, dbListings, userTotal, listingTotal] = await Promise.all([
      prisma.user.findMany({
        where: userWhere,
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          bannedAt: true,
          vendor: {
            select: {
              id: true,
              storeName: true,
              slug: true,
              city: true,
              area: true,
              profileImageUploadId: true,
            },
          },
        },
        orderBy: userSort === "email" ? { email: "asc" } : { username: "asc" },
        skip: userSkip,
        take: pageSize,
      }),
      prisma.listing.findMany({
        where: listingWhere,
        select: {
          id: true,
          title: true,
          status: true,
          moderationState: true,
          moderationReason: true,
          moderatedAt: true,
          moderatedByUserId: true,
          expiresAt: true,
          price: true,
          city: true,
          area: true,
          ownerId: true,
          images: { orderBy: { sortOrder: "asc" }, select: { uploadId: true, sortOrder: true } },
          vendor: {
            select: {
              id: true,
              storeName: true,
              slug: true,
              city: true,
              area: true,
              profileImageUploadId: true,
            },
          },
        },
        orderBy: listingOrderBy,
        skip: listingSkip,
        take: pageSize,
      }),
      prisma.user.count({ where: userWhere }),
      prisma.listing.count({ where: listingWhere }),
    ]);

    const users = dbUsers.map((u) => ({
      id: u.id,
      username: u.username,
      email: u.email,
      role: u.role,
      banned: Boolean(u.bannedAt),
      vendor: u.vendor
        ? {
            ...u.vendor,
            profileImageUrl: u.vendor.profileImageUploadId
              ? uploadApiPath(u.vendor.profileImageUploadId)
              : null,
          }
        : null,
    }));
    return NextResponse.json({
      users,
      listings: dbListings.map((l) => ({
        ...l,
        images: l.images.map((img) => ({
          uploadId: img.uploadId,
          sortOrder: img.sortOrder,
          url: uploadApiPath(img.uploadId),
        })),
        vendor: l.vendor
          ? {
              ...l.vendor,
              profileImageUrl: l.vendor.profileImageUploadId
                ? uploadApiPath(l.vendor.profileImageUploadId)
              : null,
          }
          : null,
      })),
      userMeta: {
        page: userPage,
        pageSize,
        total: userTotal,
        totalPages: Math.max(1, Math.ceil(userTotal / pageSize)),
      },
      listingMeta: {
        page: listingPage,
        pageSize,
        total: listingTotal,
        totalPages: Math.max(1, Math.ceil(listingTotal / pageSize)),
      },
    });
  } catch {
    return NextResponse.json({
      users: [],
      listings: [],
      userMeta: { page: 1, pageSize: 20, total: 0, totalPages: 1 },
      listingMeta: { page: 1, pageSize: 20, total: 0, totalPages: 1 },
    });
  }
}
