import { applyStorageFormatting } from "@/lib/listings/storageFormat";
import { brandShowsBatteryHealthForMobile } from "@/lib/listings/electronicsBatteryPolicy";

export function isElectronicsListingCategory(category: string): boolean {
  return ["Mobile Devices", "Computing & Electronics", "TV & Audio Systems"].includes(category);
}

/** Mutates `next`: GPU vendor UI → canonical `Graphics (GPU)`; strips internal keys. */
export function flattenLaptopDesktopGpuForSubmit(next: Record<string, string>, subcategory: string) {
  if (subcategory !== "Laptops" && subcategory !== "Desktop Computers") return;
  const gv = String(next["GPU Vendor"] || "").trim();
  const customGpu = String(next["GPU Other Name"] || "").trim();
  if (gv === "Other" && customGpu) next["Graphics (GPU)"] = customGpu;
  else if (gv && gv !== "Other") next["Graphics (GPU)"] = gv;
  delete next["GPU Vendor"];
  delete next["GPU Other Name"];
}

/** Mutates `next`: PC OS “Other” UI → single `Operating System` string. */
export function flattenLaptopDesktopOsForSubmit(next: Record<string, string>, subcategory: string) {
  if (subcategory !== "Laptops" && subcategory !== "Desktop Computers") return;
  const osPick = String(next["Operating System"] || "").trim();
  if (osPick === "Other") {
    const customOs = String(next["Computer OS Other"] || "").trim();
    if (customOs) next["Operating System"] = customOs;
  }
  delete next["Computer OS Other"];
}

export function migrateBatteryLifeToMah(next: Record<string, string>) {
  if (String(next["Battery Life"] || "").trim() && !String(next["Battery Capacity (mAh)"] || "").trim()) {
    next["Battery Capacity (mAh)"] = String(next["Battery Life"]).trim();
    delete next["Battery Life"];
  }
}

/** Storage + laptop/desktop GPU/OS + battery key migration for electronics listings. */
export function applyElectronicsNormalizationForSubmit(next: Record<string, string>, category: string, subcategory: string) {
  if (!isElectronicsListingCategory(category)) return;
  applyStorageFormatting(next, "Internal Storage");
  applyStorageFormatting(next, "Storage");
  flattenLaptopDesktopGpuForSubmit(next, subcategory);
  flattenLaptopDesktopOsForSubmit(next, subcategory);
  migrateBatteryLifeToMah(next);
}

export function clampBatteryHealthPercent(next: Record<string, string>) {
  if (next["Battery Health (%)"] !== undefined && String(next["Battery Health (%)"]).trim() !== "") {
    const n = Math.min(100, Math.max(0, Number(String(next["Battery Health (%)"]).replace(/[^\d.-]/g, "")) || 0));
    next["Battery Health (%)"] = String(Math.round(n));
  }
  if (!brandShowsBatteryHealthForMobile(next)) {
    delete next["Battery Health (%)"];
  }
}

export function stripSimCountIfNotPhone(next: Record<string, string>, subcategory: string) {
  if (subcategory !== "Smartphones" && subcategory !== "Feature Phones") {
    delete next["SIM Count"];
  }
}
