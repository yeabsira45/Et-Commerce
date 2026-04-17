/** Client-side rules for listing photos (classifieds post flow). */
import { MAX_IMAGE_UPLOAD_BYTES } from "@/lib/imageUploadValidation";

export const MAX_LISTING_IMAGES = 10;
export const MAX_LISTING_IMAGE_FILE_BYTES = MAX_IMAGE_UPLOAD_BYTES;

export function isDataImageUrl(url: string): boolean {
  return /^data:/i.test(url.trim());
}

export type SanitizedListingImages = {
  urls: string[];
  warnings: string[];
};

/**
 * Drops data URLs, enforces max count. For remote URLs we cannot know byte size in the browser
 * without fetching; uploads are enforced separately on the file picker.
 */
export function sanitizeListingImageUrls(urls: string[]): SanitizedListingImages {
  const warnings: string[] = [];
  const next: string[] = [];
  const trimmed = urls.map((s) => s.trim()).filter(Boolean);

  for (const url of trimmed) {
    if (isDataImageUrl(url)) {
      warnings.push("Inline or pasted images are not allowed. Add photos using the upload button.");
      continue;
    }
    if (next.length >= MAX_LISTING_IMAGES) {
      break;
    }
    next.push(url);
  }

  if (trimmed.length > MAX_LISTING_IMAGES) {
    warnings.push(`You can add up to ${MAX_LISTING_IMAGES} images per listing. Extra images were removed.`);
  }

  return { urls: next, warnings: dedupeWarnings(warnings) };
}

function dedupeWarnings(items: string[]): string[] {
  return [...new Set(items)];
}
