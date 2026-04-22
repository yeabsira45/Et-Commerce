import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { enforceRateLimit, getClientIp } from "@/lib/rateLimit";
import { uploadApiPath } from "@/lib/uploadSecurity";

export async function GET(req: Request) {
  const ip = getClientIp(req);
  if (!(await enforceRateLimit(`admin_snapshot:${ip}`, 20, 60_000))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const requestUrl = new URL(req.url);
    const page = Math.max(1, Number(requestUrl.searchParams.get("page") || "1"));
    const pageSize = Math.min(50, Math.max(1, Number(requestUrl.searchParams.get("pageSize") || "20")));
    const userSkip = (page - 1) * pageSize;
    const listingSkip = (page - 1) * pageSize;

    console.info("[admin.snapshot] access", {
      adminUserId: user.id,
      ip,
      page,
      pageSize,
      at: new Date().toISOString(),
    });

    const dbUsers = await prisma.user.findMany({
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
      orderBy: { createdAt: "asc" },
      skip: userSkip,
      take: pageSize,
    });
    const dbListings = await prisma.listing.findMany({
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
      orderBy: { createdAt: "desc" },
      skip: listingSkip,
      take: pageSize,
    });
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
      page,
      pageSize,
    });
  } catch {
    return NextResponse.json({ users: [], listings: [] });
  }
}
