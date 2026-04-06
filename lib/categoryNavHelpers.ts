import {
  CATEGORY_SUBCATEGORIES,
  CONSTRUCTION_MACHINERIES_REPAIRS_CATEGORY,
  type HomeCategory,
} from "@/lib/categories";
import { CONSTRUCTION_LEAVES_BY_SUB } from "@/lib/constructionListingLeaves";

export function getSubcategoriesForNav(categoryName: string): string[] {
  return CATEGORY_SUBCATEGORIES[categoryName] || [];
}

/** Third level exists today for Construction, Machineries and Repairs (item types per sub). */
export function getThirdLevelForNav(categoryName: string, subcategoryName: string): string[] {
  if (categoryName !== CONSTRUCTION_MACHINERIES_REPAIRS_CATEGORY) return [];
  const leaves = CONSTRUCTION_LEAVES_BY_SUB[subcategoryName];
  return leaves ? [...leaves] : [];
}

export function hasThirdLevelNav(categoryName: string, subcategoryName: string): boolean {
  return getThirdLevelForNav(categoryName, subcategoryName).length > 0;
}

/** Browse URL with optional filters (subcategory / construction item) for deep links. */
export function buildCategoryBrowseHref(
  cat: HomeCategory,
  subcategory?: string,
  constructionItem?: string,
): string {
  const [pathname, rawQuery] = cat.path.includes("?") ? cat.path.split("?") : [cat.path, ""];
  const params = new URLSearchParams(rawQuery);
  if (!params.get("category")) params.set("category", cat.name);
  if (subcategory) params.set("subcategory", subcategory);
  else params.delete("subcategory");
  if (constructionItem) params.set("constructionItem", constructionItem);
  else params.delete("constructionItem");
  const q = params.toString();
  return q ? `${pathname}?${q}` : pathname;
}
