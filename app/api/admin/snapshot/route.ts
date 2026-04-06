import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { getResolvedDemoListings } from "@/lib/demoListingStore";
import { ADMIN_MOCK_USERS } from "@/lib/adminMock";
import {
  getResolvedAdminMockListings,
  isMockUserBanned,
  isMockUserDeleted,
  resolveMockUserForSnapshot,
} from "@/lib/adminMockState";

export async function GET() {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (user.id === "demo-user") {
    const users = [
      {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        banned: false,
        vendor: user.vendor,
      },
      ...ADMIN_MOCK_USERS.filter((u) => !isMockUserDeleted(u.id)).map((raw) => {
        const u = resolveMockUserForSnapshot(raw);
        return {
          id: u.id,
          username: u.username,
          email: u.email,
          role: u.role,
          banned: isMockUserBanned(u.id),
          vendor: {
            id: u.vendorId,
            storeName: u.storeName,
            slug: u.slug,
            city: u.city,
            phone: u.phone,
          },
        };
      }),
    ];
    const listings = [...getResolvedDemoListings(), ...getResolvedAdminMockListings()];
    return NextResponse.json({ users, listings });
  }

  try {
    const dbUsers = await prisma.user.findMany({
      include: { vendor: true },
      orderBy: { createdAt: "asc" },
    });
    const dbListings = await prisma.listing.findMany({
      include: { images: { orderBy: { sortOrder: "asc" } }, vendor: true },
      orderBy: { createdAt: "desc" },
    });
    const users = dbUsers.map((u) => ({
      id: u.id,
      username: u.username,
      email: u.email,
      role: u.role,
      banned: Boolean(u.bannedAt),
      vendor: u.vendor,
    }));
    return NextResponse.json({ users, listings: dbListings });
  } catch {
    return NextResponse.json({ users: [], listings: [] });
  }
}
