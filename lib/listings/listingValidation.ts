import { REAL_ESTATE_RESIDENTIAL_SUBCATEGORIES } from "@/lib/categories";
import { LISTING_VALIDATION } from "@/lib/listingValidationMessages";
import { isElectronicsListingCategory } from "@/lib/listings/electronicsListingProcessor";
import { validateElectronicsDetailsFromSchema } from "@/lib/listings/listingFieldSchema";

function splitList(value?: string) {
  return (value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

/** Residential real-estate rules (shared by sell UI + API). */
export function validateRealEstateResidentialDetails(
  category: string,
  subcategory: string,
  details: Record<string, string>,
  description: string
): string | null {
  if (category !== "Real Estate" || !REAL_ESTATE_RESIDENTIAL_SUBCATEGORIES.has(subcategory)) return null;

  const propertyTypes = splitList(details["Property Type"]);
  const isApartmentSelected = propertyTypes.includes("Apartment");
  const propertyAddress = (details["Property Address"] || "").trim();
  const estateName = (details["Estate Name"] || "").trim();
  const propertySize = (details["Property Size"] || "").trim();
  const listingType = (
    subcategory === "Apartment or House for Sale"
      ? "For Sale"
      : subcategory === "Apartment or House for Rent"
        ? "For Rent"
        : details["Listing Type"] || ""
  ).trim();
  const listedBy = (details["Listed By"] || "").trim();
  const price = (details["Price (ETB)"] || "").trim();
  const trimmedDescription = description.trim();

  if (!propertyAddress) return LISTING_VALIDATION.propertyAddressRequired;
  if (propertyAddress.length > 60) return LISTING_VALIDATION.propertyAddressMaxLength;
  if (estateName.length > 60) return LISTING_VALIDATION.estateNameMaxLength;
  if (!propertySize) return LISTING_VALIDATION.propertySizeRequired;
  if (propertyTypes.length === 0) return LISTING_VALIDATION.propertyTypeRequired;
  if (!listingType) return LISTING_VALIDATION.listingTypeRequired;
  if (!listedBy) return LISTING_VALIDATION.listedByRequired;
  if (!price) return LISTING_VALIDATION.priceRequired;
  if (!trimmedDescription) return LISTING_VALIDATION.descriptionRequired;
  if (trimmedDescription.length > 850) return LISTING_VALIDATION.descriptionMaxLength;
  if (listingType === "For Rent" && !(details["Minimum Rental Period"] || "").trim()) {
    return LISTING_VALIDATION.minimumRentalPeriodRequired;
  }

  if (isApartmentSelected) {
    if (!(details["Condition"] || "").trim()) return LISTING_VALIDATION.apartmentConditionRequired;
    if (!(details["Furnishing"] || "").trim()) return LISTING_VALIDATION.apartmentFurnishingRequired;
    if (!(details["Bathrooms"] || "").trim()) return LISTING_VALIDATION.apartmentBathroomsRequired;
    const bedrooms = Number(details["Bedrooms"] || "0");
    if (!Number.isFinite(bedrooms) || bedrooms < 1) return LISTING_VALIDATION.apartmentBedroomsMin;
  }

  return null;
}

/**
 * Single entry for listing `details` + description checks before create/update.
 * Electronics branch uses `listingFieldSchema`; real estate uses shared messages.
 */
export function validateListingDetailsForPublish(
  category: string,
  subcategory: string | null | undefined,
  details: Record<string, string>,
  description: string
): string | null {
  const sub = subcategory || "";
  const reErr = validateRealEstateResidentialDetails(category, sub, details, description);
  if (reErr) return reErr;
  if (isElectronicsListingCategory(category)) {
    return validateElectronicsDetailsFromSchema(sub, details);
  }
  return null;
}
