import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { getResolvedDemoListings } from "@/lib/demoListingStore";

export async function GET() {
  const user = await getSessionUser();
  if (!user || !user.vendor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.id === "demo-user") {
    const listings = getResolvedDemoListings().filter((l) => l.vendorId === user.vendor!.id);
    return NextResponse.json({ listings });
  }

  const listings = await prisma.listing.findMany({
    where: { vendorId: user.vendor.id },
    orderBy: { createdAt: "desc" },
    include: { images: true, vendor: true },
  });

  return NextResponse.json({ listings });
}
