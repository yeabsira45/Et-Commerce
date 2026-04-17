/**
 * Lightweight opt-in audit trail for listing mutations (dev console or LISTING_AUDIT_LOG=1).
 */
export function logListingAudit(event: string, meta?: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "development" && process.env.LISTING_AUDIT_LOG !== "1") return;
  try {
    console.info(`[listing-audit] ${event}`, meta ?? {});
  } catch {
    // ignore
  }
}
