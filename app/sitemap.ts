import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000";

const staticRoutes = [
  "",
  "/saved",
  "/messages",
  "/sell",
  "/vehicles",
  "/electronics",
  "/property",
  "/properties",
  "/services",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const [listings, vendors] = await Promise.all([
      prisma.listing.findMany({
        where: { status: "ACTIVE" },
        select: { id: true, updatedAt: true },
        take: 500,
        orderBy: { updatedAt: "desc" },
      }),
      prisma.vendor.findMany({
        select: { slug: true, updatedAt: true },
        take: 500,
        orderBy: { updatedAt: "desc" },
      }),
    ]);

    return [
      ...staticRoutes.map((route) => ({
        url: `${appUrl}${route}`,
        changeFrequency: route === "" ? "daily" as const : "weekly" as const,
        priority: route === "" ? 1 : 0.7,
      })),
      ...listings.map((listing) => ({
        url: `${appUrl}/item/${listing.id}`,
        lastModified: listing.updatedAt,
        changeFrequency: "daily" as const,
        priority: 0.8,
      })),
      ...vendors.map((vendor) => ({
        url: `${appUrl}/vendor/${vendor.slug}`,
        lastModified: vendor.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
    ];
  } catch {
    return staticRoutes.map((route) => ({
      url: `${appUrl}${route}`,
      changeFrequency: route === "" ? "daily" as const : "weekly" as const,
      priority: route === "" ? 1 : 0.7,
    }));
  }
}
