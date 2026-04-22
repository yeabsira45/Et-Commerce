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

function parseNumericInput(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value.replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(parsed)) return undefined;
  return parsed;
}

function extractNumericValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const normalized = value.replace(/,/g, "").trim();
  if (!normalized) return null;
  const direct = Number(normalized);
  if (Number.isFinite(direct)) return direct;
  const match = normalized.match(/-?\d+(\.\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function readNumericDetailsValue(details: unknown, keys: string[]): number | null {
  if (!details || typeof details !== "object" || Array.isArray(details)) return null;
  const record = details as Record<string, unknown>;
  for (const key of keys) {
    const parsed = extractNumericValue(record[key]);
    if (parsed !== null) return parsed;
  }
  return null;
}

function passesRange(value: number | null, min: number | undefined, max: number | undefined): boolean {
  if (min === undefined && max === undefined) return true;
  if (value === null) return false;
  if (min !== undefined && value < min) return false;
  if (max !== undefined && value > max) return false;
  return true;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const pageSize = Math.min(20, Math.max(10, Number(searchParams.get("pageSize") || "20")));
  const skip = (page - 1) * pageSize;
  const q = (searchParams.get("q") || "").trim();
  const category = searchParams.get("category");
  const subcategory = searchParams.get("subcategory");
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

  const andClauses: Prisma.ListingWhereInput[] = [
    { status: "ACTIVE" },
    { moderationState: "APPROVED" },
    { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
  ];
  const where: Prisma.ListingWhereInput = { AND: andClauses };

  if (category) {
    const aliases = CATEGORY_ALIASES[category] || [category];
    andClauses.push({ category: aliases.length === 1 ? aliases[0] : { in: aliases } });
  }
  if (subcategory) {
    andClauses.push({ subcategory });
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

  if (q) {
    andClauses.push({
      OR: [
        { title: { contains: q } },
        { description: { contains: q } },
        { category: { contains: q } },
        { subcategory: { contains: q } },
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

  const numericSizeMin = parseNumericInput(sizeMin);
  const numericSizeMax = parseNumericInput(sizeMax);
  const numericSalaryMin = parseNumericInput(salaryMin);
  const numericSalaryMax = parseNumericInput(salaryMax);
  const hasNumericFilters =
    numericSizeMin !== undefined ||
    numericSizeMax !== undefined ||
    numericSalaryMin !== undefined ||
    numericSalaryMax !== undefined;

  const listingSelect = {
    id: true,
    title: true,
    price: true,
    city: true,
    area: true,
    condition: true,
    details: true,
    subcategory: true,
    createdAt: true,
    images: { take: 1, orderBy: { sortOrder: "asc" as const }, select: { uploadId: true, sortOrder: true } },
    vendor: {
      select: { id: true, slug: true, storeName: true, city: true, area: true, profileImageUploadId: true },
    },
  };

  let listings: Array<{
    id: string;
    title: string;
    price: Prisma.Decimal | null;
    city: string;
    area: string;
    condition: "NEW" | "USED";
    details: Prisma.JsonValue | null;
    subcategory: string | null;
    createdAt: Date;
    images: Array<{ uploadId: string; sortOrder: number }>;
    vendor: { id: string; slug: string; storeName: string; city: string | null; area: string | null; profileImageUploadId: string | null } | null;
  }> = [];
  let total = 0;

  if (!hasNumericFilters) {
    const [rows, count] = await Promise.all([
      prisma.listing.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
        select: listingSelect,
      }),
      prisma.listing.count({ where }),
    ]);
    listings = rows;
    total = count;
  } else {
    const candidates = await prisma.listing.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: { id: true, details: true },
    });
    const filteredIds = candidates
      .filter((candidate) => {
        const totalSize = readNumericDetailsValue(candidate.details, ["Total Size"]);
        const salary = readNumericDetailsValue(candidate.details, ["Salary", "Salary (ETB)"]);
        return (
          passesRange(totalSize, numericSizeMin, numericSizeMax) &&
          passesRange(salary, numericSalaryMin, numericSalaryMax)
        );
      })
      .map((candidate) => candidate.id);

    total = filteredIds.length;
    const pageIds = filteredIds.slice(skip, skip + pageSize);
    if (pageIds.length > 0) {
      const pageRows = await prisma.listing.findMany({
        where: { id: { in: pageIds } },
        select: listingSelect,
      });
      const rowById = new Map(pageRows.map((row) => [row.id, row]));
      listings = pageIds.map((id) => rowById.get(id)).filter(Boolean) as typeof pageRows;
    }
  }

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
