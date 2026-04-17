import type { StorableSellDraft } from "@/lib/sellDraftStorage";
import { CONSTRUCTION_MACHINERIES_REPAIRS_CATEGORY } from "@/lib/categories";
import { getBeautyBrands } from "@/lib/beauty";
import { normalizeBrandName } from "@/lib/listings/brandNormalize";

export function mapMaterialLeafToSupplyType(leaf: string): string | undefined {
  const plumbing = new Set([
    "PVC Pipes",
    "HDPE Pipes",
    "Pipes & Fittings",
    "Fittings",
    "Water Tanks",
    "Sealants",
    "Construction Adhesive",
  ]);
  const electrical = new Set(["Cables & Wires", "Switches", "Circuit Breakers", "Transformers"]);
  if (plumbing.has(leaf)) return "Plumbing";
  if (electrical.has(leaf)) return "Electrical";
  const building = new Set([
    "Cement",
    "Steel & Metal",
    "Concrete & Precast",
    "Flooring Materials",
    "Roofing Materials",
    "Tiles",
    "Ceramics",
    "Gypsum",
    "Glass",
    "Aluminum",
    "Marble",
    "Plasterboard",
    "Plasters",
    "Plywood",
    "Polystyrene",
    "Sand",
    "Rock & Gravel",
    "Tiles & Slabs",
    "Wallpaper",
    "Paints",
    "Paint Brushes, Rollers & Trays",
  ]);
  if (building.has(leaf)) return "Building";
  return undefined;
}

export type ListingDetectionModelDeps = {
  vehicleModelsForBrand: (brand: string) => string[];
  electronicsModelsForBrand: (subcategory: string, brand: string) => string[];
  /** Returns undefined if subcategory has no fixed brand list (e.g. fashion). */
  fashionBrandOptionsForSub?: (subcategory: string) => string[] | undefined;
  /** If set, used to decide whether to attach a model when electronics has no catalog for sub. */
  electronicsSubHasModelSuggestions?: (subcategory: string) => boolean;
};

export function mergeDetectedHintsIntoListingDetails(
  base: Record<string, string>,
  opts: {
    category: string;
    subcategory: string;
    hints?: StorableSellDraft["detectedHints"];
    constructionItem?: string;
    isElectronicsCategory: boolean;
  },
  deps: ListingDetectionModelDeps
): Record<string, string> {
  const next = { ...base };
  const { category, subcategory, hints, constructionItem, isElectronicsCategory } = opts;
  const leaf = (constructionItem || hints?.constructionItem)?.trim();
  const brandHint = hints?.brand?.trim();
  const modelHint = hints?.model?.trim();

  if (brandHint) {
    const nb = normalizeBrandName(brandHint);
    next["Brand"] = nb || brandHint;
    if (next["Brand"] !== "Other") next["Custom Brand"] = "";
  }

  const effectiveBrand = (next["Brand"] === "Other" ? next["Custom Brand"] : next["Brand"]) || "";

  if (modelHint && effectiveBrand) {
    let modelList: string[] = [];
    if (category === "Vehicles") {
      modelList = deps.vehicleModelsForBrand(effectiveBrand) || [];
    } else if (isElectronicsCategory) {
      modelList = deps.electronicsModelsForBrand(subcategory, effectiveBrand) || [];
    }
    const m = modelHint;
    if (modelList.length) {
      if (modelList.includes(m)) {
        next["Model"] = m;
        next["Custom Model"] = "";
      } else {
        next["Model"] = "Other";
        next["Custom Model"] = m;
      }
    } else if (category === "Vehicles") {
      next["Model"] = "Other";
      next["Custom Model"] = m;
    } else if (
      isElectronicsCategory &&
      deps.electronicsSubHasModelSuggestions &&
      !deps.electronicsSubHasModelSuggestions(subcategory)
    ) {
      // e.g. Mobile Accessories — brand only; skip orphan model
    } else {
      next["Model"] = m;
      next["Custom Model"] = "";
    }
  }

  if (category === "Beauty & Personal Care" && brandHint) {
    const allowed = new Set(getBeautyBrands(subcategory));
    const b = next["Brand"] || "";
    if (b && !allowed.has(b) && b !== "Other") {
      next["Brand"] = "Other";
      next["Custom Brand"] = brandHint;
    }
  }

  if (category === "Clothing & Fashion" && brandHint && deps.fashionBrandOptionsForSub) {
    const optsList = deps.fashionBrandOptionsForSub(subcategory);
    const b = next["Brand"] || "";
    if (optsList?.length && b && !optsList.includes(b)) {
      next["Brand"] = "Other";
      next["Custom Brand"] = brandHint;
    }
  }

  if (category === CONSTRUCTION_MACHINERIES_REPAIRS_CATEGORY && leaf) {
    if (subcategory === "Materials") {
      const st = mapMaterialLeafToSupplyType(leaf);
      if (st) next["Supply Type"] = st;
      else if (!next["Size / Capacity"]?.trim()) next["Size / Capacity"] = leaf;
    } else if (subcategory === "Tools & Equipment") {
      next["Supply Type"] = "Tooling";
    } else if (!next["Size / Capacity"]?.trim()) {
      next["Size / Capacity"] = leaf;
    }
  }

  return next;
}

export function buildListingDetectionPrefillToken(
  draft: Pick<StorableSellDraft, "title" | "category" | "subcategory" | "detectedHints" | "constructionItem">,
  subCategory: string
): string {
  const hints = draft.detectedHints;
  const leaf = (draft.constructionItem || hints?.constructionItem)?.trim() ?? "";
  return [
    draft.title,
    draft.category,
    draft.subcategory ?? "",
    subCategory,
    hints?.brand ?? "",
    hints?.model ?? "",
    leaf,
  ].join("\0");
}

export function shouldApplyListingDetectionPrefill(
  draft: StorableSellDraft | null,
  subCategory: string
): draft is StorableSellDraft {
  if (!draft || !subCategory) return false;
  const hints = draft.detectedHints;
  const leaf = (draft.constructionItem || hints?.constructionItem)?.trim();
  if (!hints?.brand && !hints?.model && !leaf) return false;
  if (draft.subcategory && draft.subcategory !== subCategory) return false;
  return true;
}
