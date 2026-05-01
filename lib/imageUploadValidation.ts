export const MAX_IMAGE_UPLOAD_MB = 10;
export const MAX_IMAGE_UPLOAD_BYTES = MAX_IMAGE_UPLOAD_MB * 1024 * 1024;

export const SAFE_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export function validateImageFile(
  file: Pick<File, "name" | "size" | "type">,
  opts?: { maxBytes?: number }
): string | null {
  const maxBytes = opts?.maxBytes ?? MAX_IMAGE_UPLOAD_BYTES;
  const mime = String(file.type || "").toLowerCase();

  if (!SAFE_IMAGE_MIME_TYPES.has(mime)) {
    return "Only JPG, JPEG, PNG, and WebP images are allowed.";
  }

  if (file.size > maxBytes) {
    const mb = Math.round(maxBytes / (1024 * 1024));
    return `Image exceeds ${mb}MB limit. Please choose a smaller file.`;
  }

  return null;
}
