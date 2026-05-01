export function normalizeLocalPhoneDigits(input: string) {
  const digits = String(input || "").replace(/\D/g, "");
  let local = digits;
  if (local.startsWith("251")) local = local.slice(3);
  if (local.startsWith("0")) local = local.slice(1);
  return local.slice(0, 10);
}

export function formatPhoneForStorage(localDigits: string) {
  const normalized = normalizeLocalPhoneDigits(localDigits);
  return normalized ? `+251${normalized}` : "";
}

export function formatStoredPhoneToLocalDigits(stored: string) {
  return normalizeLocalPhoneDigits(stored || "");
}

export function isValidStoredEthiopianPhone(phone: string) {
  return /^\+251\d{1,10}$/.test(phone);
}
