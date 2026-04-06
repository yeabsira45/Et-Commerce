import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

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
      include: { images: true, vendor: true },
    });
    return NextResponse.json({ listings });
  }

  const listings = await prisma.listing.findMany({
    where: { status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 50),
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      vendor: true,
    },
  });
  return NextResponse.json({ listings });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
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
    } = await req.json();

    if (!title || !category || !city || !area) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const normalizedPrice =
      price !== undefined && price !== null && String(price).trim() !== ""
        ? Number(String(price).replace(/[^\d.]/g, ""))
        : null;

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

    const listing = await prisma.listing.create({
      data: {
        title,
        category,
        subcategory: subcategory || null,
        description: description || null,
        price: normalizedPrice,
        condition: condition === "NEW" ? "NEW" : "USED",
        city,
        area,
        details: details || null,
        vendorId,
        ownerId: user.id,
        images: {
          create:
            Array.isArray(images) && images.length > 0
              ? images.map((url: string, idx: number) => ({
                  url,
                  sortOrder: idx,
                }))
              : [],
        },
      },
      include: {
        images: true,
        vendor: true,
      },
    });

    return NextResponse.json({ listing });
  } catch(e) {
    console.log(e)
    return NextResponse.json({ error: "Failed to create listing" }, { status: 500 });
  }
}
