import path from "path";

export const PRIVATE_UPLOAD_DIR = path.join(process.cwd(), "private", "uploads");
const PUBLIC_UPLOAD_BASE = process.env.NEXT_PUBLIC_UPLOAD_BASE_PATH?.trim() || "/api/uploads";

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export function extensionForMime(mime: string): string | null {
  return MIME_TO_EXT[mime] || null;
}

export function detectMimeByMagicBytes(buf: Buffer): string | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    buf.length >= 12 &&
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

export function parseUploadIdFromValue(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const direct = /^[a-z0-9]{10,}$/i.test(trimmed);
  if (direct) return trimmed;
  const match = trimmed.match(/\/api\/uploads\/([a-z0-9]+)(?:\?.*)?$/i);
  return match?.[1] || null;
}

export function uploadApiPath(uploadId: string) {
  return `${PUBLIC_UPLOAD_BASE.replace(/\/+$/, "")}/${uploadId}`;
}

export function isPublicUploadEntityType(linkedEntityType: string | null | undefined): boolean {
  return linkedEntityType === "LISTING" || linkedEntityType === "VENDOR_PROFILE";
}
