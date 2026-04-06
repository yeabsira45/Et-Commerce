import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDemoVendorBundleBySlug } from "@/lib/demoListingStore";

type Params = { params: { slug: string } };

export async function GET(_req: Request, { params }: Params) {
  const demoVendor = getDemoVendorBundleBySlug(params.slug);
  if (demoVendor) {
    return NextResponse.json({ vendor: demoVendor });
  }

  const vendor = await prisma.vendor.findUnique({
    where: { slug: params.slug },
    include: {
      user: { select: { id: true, username: true, email: true, createdAt: true } },
      listings: { include: { images: { take: 1, orderBy: { sortOrder: "asc" } } } },
    },
  });
  if (!vendor) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ vendor });
}
