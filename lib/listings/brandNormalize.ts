export function normalizeBrandName(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const aliases: Record<string, string> = {
    hp: "HP",
    "hewlett packard": "HP",
    dell: "Dell",
    lenovo: "Lenovo",
    asus: "Asus",
    acer: "Acer",
    samsung: "Samsung",
    "tp-link": "TP-Link",
    tplink: "TP-Link",
    sandisk: "SanDisk",
    sony: "Sony",
  };
  return aliases[trimmed.toLowerCase()] || trimmed;
}
