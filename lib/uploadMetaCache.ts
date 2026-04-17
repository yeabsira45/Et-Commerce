import { isPublicUploadEntityType } from "@/lib/uploadSecurity";

export type CachedUploadMeta = {
  id: string;
  path: string;
  mimeType: string;
  linkedEntityType: string | null;
};

type CacheEntry = {
  value: CachedUploadMeta;
  expiresAt: number;
};

const uploadMetaCache = new Map<string, CacheEntry>();
const PUBLIC_META_TTL_MS = 10 * 60 * 1000;
const PRIVATE_META_TTL_MS = 60 * 1000;

export function getUploadMetaFromCache(uploadId: string): CachedUploadMeta | null {
  const entry = uploadMetaCache.get(uploadId);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    uploadMetaCache.delete(uploadId);
    return null;
  }
  return entry.value;
}

export function setUploadMetaCache(meta: CachedUploadMeta) {
  const ttlMs = isPublicUploadEntityType(meta.linkedEntityType) ? PUBLIC_META_TTL_MS : PRIVATE_META_TTL_MS;
  uploadMetaCache.set(meta.id, {
    value: meta,
    expiresAt: Date.now() + ttlMs,
  });
}

export function invalidateUploadMetaCache(uploadId: string) {
  uploadMetaCache.delete(uploadId);
}

export function invalidateUploadMetaCacheMany(uploadIds: string[]) {
  for (const uploadId of uploadIds) {
    uploadMetaCache.delete(uploadId);
  }
}
