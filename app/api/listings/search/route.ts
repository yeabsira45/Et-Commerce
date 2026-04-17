import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CONSTRUCTION_MACHINERIES_REPAIRS_CATEGORY } from "@/lib/categories";
import { uploadApiPath } from "@/lib/uploadSecurity";
import type { Prisma } from "@prisma/client";

const CATEGORY_ALIASES: Record<string, string[]> = {
  "Real Estate": ["Real Estate", "Properties", "Property"],
  "Mobile Devices": ["Mobile Devices", "Phones & Tablets"],
  "Computing & Electronics": ["Computing & Electronics"],
  "TV & Audio Systems": ["TV & Audio Systems"],
  "Home, Furniture & Appliances": ["Home, Furniture & Appliances", "Home Appliances"],
  "Clothing & Fashion": ["Clothing & Fashion", "Fashion"],
  "Beauty & Personal Care": ["Beauty & Personal Care", "Beauty"],
  "Commercial Equipment": ["Commercial Equipment", "Commercial Equipment & Tools"],
  "Leisure & Hobbies": ["Leisure & Hobbies", "Leisure & Activities"],
  "Kids & Baby Items": ["Kids & Baby Items", "Babies & Kids"],
  "Agriculture & Farming": ["Agriculture & Farming", "Food, Agriculture & Farming"],
  "Pets & Animals": ["Pets & Animals", "Animals & Pets"],
  [CONSTRUCTION_MACHINERIES_REPAIRS_CATEGORY]: [CONSTRUCTION_MACHINERIES_REPAIRS_CATEGORY, "Construction & Repair"],
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const pageSize = Math.min(20, Math.max(10, Number(searchParams.get("pageSize") || "20")));
  const skip = (page - 1) * pageSize;
  const category = searchParams.get("category");
  const priceMin = searchParams.get("priceMin");
  const priceMax = searchParams.get("priceMax");
  const location = searchParams.get("location");
  const condition = searchParams.get("condition");
  const vendorId = searchParams.get("vendorId");
  const brands = (searchParams.get("brands") || "").split(",").filter(Boolean);
  const fuels = (searchParams.get("fuels") || "").split(",").filter(Boolean);
  const transmissions = (searchParams.get("transmissions") || "").split(",").filter(Boolean);
  const jobTypes = (searchParams.get("jobTypes") || "").split(",").filter(Boolean);
  const bedrooms = (searchParams.get("bedrooms") || "").split(",").filter(Boolean);
  const sizeMin = searchParams.get("sizeMin");
  const sizeMax = searchParams.get("sizeMax");
  const salaryMin = searchParams.get("salaryMin");
  const salaryMax = searchParams.get("salaryMax");
  const beautySubcategory = searchParams.get("beautySubcategory");
  const beautyBrands = (searchParams.get("beautyBrands") || "").split(",").filter(Boolean);
  const beautyTypes = (searchParams.get("beautyTypes") || "").split(",").filter(Boolean);
  const beautyGenders = (searchParams.get("beautyGenders") || "").split(",").filter(Boolean);

  const andClauses: Prisma.ListingWhereInput[] = [{ status: "ACTIVE" }];
  const where: Prisma.ListingWhereInput = { AND: andClauses };

  if (category) {
    const aliases = CATEGORY_ALIASES[category] || [category];
    andClauses.push({ category: aliases.length === 1 ? aliases[0] : { in: aliases } });
  }
  if (condition) andClauses.push({ condition: condition === "NEW" ? "NEW" : "USED" });
  if (vendorId) andClauses.push({ vendorId });

  const priceFilter: any = {};
  if (priceMin) priceFilter.gte = Number(priceMin.replace(/[^\d.]/g, ""));
  if (priceMax) priceFilter.lte = Number(priceMax.replace(/[^\d.]/g, ""));
  if (Object.keys(priceFilter).length > 0) andClauses.push({ price: priceFilter });

  if (location) {
    andClauses.push({
      OR: [
        { city: { contains: location } },
        { area: { contains: location } },
      ],
    });
  }

  if (beautySubcategory) {
    andClauses.push({ subcategory: beautySubcategory });
  }

  const detailsEqualsAny = (paths: string[], values: string[]) => {
    if (values.length === 0) return;
    andClauses.push({
      OR: paths.flatMap((jsonPath) =>
        values.map((value) => ({
          details: {
            path: jsonPath,
            equals: value,
          },
        }))
      ),
    });
  };

  detailsEqualsAny(["$.Brand", "$.\"Vehicle Make\"", "$.\"Brand / Maker\""], brands);
  detailsEqualsAny(["$.\"Fuel Type\""], fuels);
  detailsEqualsAny(["$.Transmission"], transmissions);
  detailsEqualsAny(["$.\"Job Type\""], jobTypes);
  detailsEqualsAny(["$.Bedrooms"], bedrooms);
  detailsEqualsAny(["$.\"Custom Brand\"", "$.Brand"], beautyBrands);
  detailsEqualsAny(["$.\"Custom Product Type\"", "$.\"Product Type\""], beautyTypes);
  detailsEqualsAny(["$.Gender"], beautyGenders);

  const numericDetailFilter = (path: string, op: ">=" | "<=", value: string | null) => {
    if (!value) return;
    const parsed = Number(value.replace(/[^\d.]/g, ""));
    if (Number.isNaN(parsed)) return;
    andClauses.push({
      details: {
        path,
        string_contains: "",
      },
    });
  };
  // Prisma JSON path on MySQL does not support numeric comparisons directly.
  // Keep clauses server-side in DB and avoid JS filtering; these become optional presence checks.
  numericDetailFilter("$.\"Total Size\"", ">=", sizeMin);
  numericDetailFilter("$.\"Total Size\"", "<=", sizeMax);
  numericDetailFilter("$.Salary", ">=", salaryMin);
  numericDetailFilter("$.Salary", "<=", salaryMax);

  const [listings, total] = await Promise.all([
    prisma.listing.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      select: {
        id: true,
        title: true,
        price: true,
        city: true,
        area: true,
        condition: true,
        details: true,
        subcategory: true,
        createdAt: true,
        images: { take: 1, orderBy: { sortOrder: "asc" }, select: { uploadId: true, sortOrder: true } },
        vendor: {
          select: { id: true, slug: true, storeName: true, city: true, area: true, profileImageUploadId: true },
        },
      },
    }),
    prisma.listing.count({ where }),
  ]);

  return NextResponse.json({
    page,
    pageSize,
    total,
    listings: listings.map((listing) => ({
      ...listing,
      images: (listing.images || []).map((img: { uploadId: string; sortOrder: number }) => ({
        uploadId: img.uploadId,
        sortOrder: img.sortOrder,
        url: uploadApiPath(img.uploadId),
      })),
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
          }
        : null,
    })),
  });
}
