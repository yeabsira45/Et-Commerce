import type { StorableSellDraft } from "@/lib/sellDraftStorage";
import { normalizeSellDraftForStorage } from "@/lib/sellDraftStorage";

const STACK_KEY = "sellListingUndoStackV1";
const MAX_FRAMES = 12;
const TTL_MS = 30 * 60 * 1000;

/** Persists across refresh; multi-tab last-write-wins (same as most draft UX). */
function getUndoStorage(): Storage | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage;
}

export type ListingUndoReason = "taxonomy_change" | "detection_prefill" | "form_reset";

export type ListingUndoFrame = {
  savedAt: number;
  reason: ListingUndoReason;
  details: Record<string, string>;
  price: string;
  description: string;
  condition: "NEW" | "USED";
  subCategory: string;
  draftJson: string;
};

type StackPayload = { frames: ListingUndoFrame[] };

function readStack(): StackPayload {
  const store = getUndoStorage();
  if (!store) return { frames: [] };
  try {
    const raw = store.getItem(STACK_KEY);
    if (!raw) return { frames: [] };
    const parsed = JSON.parse(raw) as StackPayload;
    if (!parsed?.frames || !Array.isArray(parsed.frames)) return { frames: [] };
    const now = Date.now();
    const fresh = parsed.frames.filter((f) => f && typeof f.savedAt === "number" && now - f.savedAt <= TTL_MS);
    return { frames: fresh };
  } catch {
    return { frames: [] };
  }
}

function writeStack(frames: ListingUndoFrame[]) {
  const store = getUndoStorage();
  if (!store) return;
  try {
    if (frames.length === 0) {
      store.removeItem(STACK_KEY);
      return;
    }
    store.setItem(STACK_KEY, JSON.stringify({ frames }));
  } catch {
    // ignore quota / private mode
  }
}

export function pushListingUndoFrame(frame: Omit<ListingUndoFrame, "savedAt">) {
  const { frames } = readStack();
  const next: ListingUndoFrame[] = [{ ...frame, savedAt: Date.now() }, ...frames].slice(0, MAX_FRAMES);
  writeStack(next);
}

/** Top frame without removing (null if empty / expired). */
export function peekListingUndoFrame(): ListingUndoFrame | null {
  const { frames } = readStack();
  return frames[0] ?? null;
}

/** Remove top frame and return it (null if none). */
export function popListingUndoFrame(): ListingUndoFrame | null {
  const { frames } = readStack();
  if (frames.length === 0) return null;
  const [head, ...rest] = frames;
  writeStack(rest);
  return head ?? null;
}

/** Drop top frame without restoring (user dismissed undo). */
export function discardTopListingUndoFrame() {
  popListingUndoFrame();
}

export function clearListingUndoStack() {
  writeStack([]);
}

export function parseUndoDraftJson(draftJson: string): ReturnType<typeof normalizeSellDraftForStorage> {
  const parsed = JSON.parse(draftJson) as Partial<StorableSellDraft>;
  return normalizeSellDraftForStorage(parsed);
}
