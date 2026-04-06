import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { filterDemoListings } from "@/lib/demo";
import { getResolvedDemoListings } from "@/lib/demoListingStore";
import { CONSTRUCTION_MACHINERIES_REPAIRS_CATEGORY } from "@/lib/categories";

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

  const where: any = { status: "ACTIVE" };

  if (category) {
    const aliases = CATEGORY_ALIASES[category] || [category];
    where.category = aliases.length === 1 ? aliases[0] : { in: aliases };
  }
  if (condition) where.condition = condition === "NEW" ? "NEW" : "USED";
  if (vendorId) where.vendorId = vendorId;

  const priceFilter: any = {};
  if (priceMin) priceFilter.gte = Number(priceMin.replace(/[^\d.]/g, ""));
  if (priceMax) priceFilter.lte = Number(priceMax.replace(/[^\d.]/g, ""));
  if (Object.keys(priceFilter).length > 0) where.price = priceFilter;

  if (location) {
    where.OR = [
      { city: { contains: location, mode: "insensitive" } },
      { area: { contains: location, mode: "insensitive" } },
    ];
  }

  let listings: any[] = [];
  try {
    listings = await prisma.listing.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { images: { take: 1, orderBy: { sortOrder: "asc" } }, vendor: true },
    });
  } catch {
    listings = [];
  }

  const demoListings = filterDemoListings(
    {
      category,
      priceMin,
      priceMax,
      location,
      condition,
      vendorId,
    },
    getResolvedDemoListings()
  );

  const merged = [...demoListings, ...listings].filter((listing: any) => {
    const details = (listing.details || {}) as Record<string, any>;
    const numericPrice =
      listing.price === null || listing.price === undefined
        ? null
        : Number(String(listing.price).replace(/[^\d.]/g, ""));

    if (priceMin && numericPrice !== null && numericPrice < Number(priceMin.replace(/[^\d.]/g, ""))) return false;
    if (priceMax && numericPrice !== null && numericPrice > Number(priceMax.replace(/[^\d.]/g, ""))) return false;

    if (brands.length > 0) {
      const brand = details.Brand || details["Vehicle Make"] || details["Brand / Maker"];
      if (!brand || !brands.includes(String(brand))) return false;
    }
    if (fuels.length > 0 && (!details["Fuel Type"] || !fuels.includes(String(details["Fuel Type"])))) return false;
    if (transmissions.length > 0 && (!details.Transmission || !transmissions.includes(String(details.Transmission)))) return false;
    if (jobTypes.length > 0 && (!details["Job Type"] || !jobTypes.includes(String(details["Job Type"])))) return false;
    if (bedrooms.length > 0 && (!details.Bedrooms || !bedrooms.includes(String(details.Bedrooms)))) return false;
    if (sizeMin && Number(details["Total Size"] || 0) < Number(sizeMin.replace(/[^\d.]/g, ""))) return false;
    if (sizeMax && Number(details["Total Size"] || 0) > Number(sizeMax.replace(/[^\d.]/g, ""))) return false;
    if (salaryMin && Number(String(details.Salary || "").replace(/[^\d.]/g, "")) < Number(salaryMin.replace(/[^\d.]/g, ""))) return false;
    if (salaryMax && Number(String(details.Salary || "").replace(/[^\d.]/g, "")) > Number(salaryMax.replace(/[^\d.]/g, ""))) return false;
    if (beautySubcategory && listing.subcategory !== beautySubcategory) return false;
    if (beautyBrands.length > 0) {
      const brand = details["Custom Brand"] || details.Brand;
      if (!brand || !beautyBrands.includes(String(brand))) return false;
    }
    if (beautyTypes.length > 0) {
      const productType = details["Custom Product Type"] || details["Product Type"];
      if (!productType || !beautyTypes.includes(String(productType))) return false;
    }
    if (beautyGenders.length > 0) {
      const gender = details.Gender;
      if (!gender || !beautyGenders.includes(String(gender))) return false;
    }

    return true;
  });

  return NextResponse.json({ listings: merged });
}
