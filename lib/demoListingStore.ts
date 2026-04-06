import { demoListings, demoUser, demoVendor } from "@/lib/demo";

export type DemoListingRow = (typeof demoListings)[number];

const overrides = new Map<string, Partial<DemoListingRow>>();
const deletedIds = new Set<string>();

export function getResolvedDemoListings(): DemoListingRow[] {
  return demoListings
    .filter((l) => !deletedIds.has(l.id))
    .map((l) => ({ ...l, ...overrides.get(l.id) })) as DemoListingRow[];
}

export function getResolvedDemoListingById(id: string): DemoListingRow | null {
  return getResolvedDemoListings().find((l) => l.id === id) ?? null;
}

function parsePriceInput(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  const n = Number(String(value).replace(/[^\d.]/g, ""));
  return Number.isNaN(n) ? null : n;
}

export function patchDemoListing(
  id: string,
  patch: {
    title?: string;
    price?: unknown;
    status?: string;
    condition?: string;
    description?: string | null;
    images?: { url: string }[];
  }
): DemoListingRow | null {
  const base = demoListings.find((l) => l.id === id);
  if (!base || deletedIds.has(id)) return null;
  const prev = overrides.get(id) || {};
  const next: Partial<DemoListingRow> = { ...prev };
  if (patch.title !== undefined) next.title = patch.title;
  if (patch.status !== undefined) next.status = patch.status as DemoListingRow["status"];
  if (patch.condition !== undefined) next.condition = patch.condition as DemoListingRow["condition"];
  if (patch.description !== undefined) next.description = patch.description === null ? undefined : patch.description;
  if (patch.images !== undefined) next.images = patch.images;
  if (patch.price !== undefined) next.price = parsePriceInput(patch.price) ?? undefined;
  overrides.set(id, next);
  return getResolvedDemoListingById(id);
}

export function deleteDemoListing(id: string): boolean {
  if (!demoListings.find((l) => l.id === id)) return false;
  deletedIds.add(id);
  return true;
}

export function userCanModifyDemoListing(userId: string | undefined, role: string | undefined, listing: DemoListingRow): boolean {
  if (!userId) return false;
  if (role === "ADMIN") return true;
  return listing.ownerId === userId;
}

export function getDemoVendorBundleBySlug(slug: string) {
  if (slug !== demoVendor.slug) return null;
  return {
    ...demoVendor,
    user: demoUser,
    listings: getResolvedDemoListings(),
  };
}
