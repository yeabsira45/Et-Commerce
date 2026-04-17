/**
 * Prevent title-detection prefill from overwriting fields the seller already edited manually.
 */
export function mergeDetectionRespectingUserEditedKeys(
  previous: Record<string, string>,
  detectionMerged: Record<string, string>,
  userEditedKeys: ReadonlySet<string>
): Record<string, string> {
  const out = { ...detectionMerged };
  for (const key of userEditedKeys) {
    if (Object.prototype.hasOwnProperty.call(previous, key)) {
      out[key] = previous[key] ?? "";
    }
  }
  return out;
}
