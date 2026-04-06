export type CityNode = {
  value: string;
  label: string;
  subcities: { value: string; label: string }[];
};

export const ETHIOPIAN_CITIES: CityNode[] = [
  {
    value: "Addis Abeba / አዲስ አበባ",
    label: "Addis Abeba / አዲስ አበባ",
    subcities: [
      "Addis Ketema / አዲስ ከተማ",
      "Akaki Kality / አቃቂ ቃሊቲ",
      "Arada / አራዳ",
      "Bole / ቦሌ",
      "Gullele / ጉለሌ",
      "Kirkos / ቂርቆስ",
      "Kolfe Keraniyo / ኮልፌ ቀራኒዮ",
      "Lideta / ልደታ",
      "Nifas Silk-Lafto / ንፋስ ስልክ ላፍቶ",
      "Yeka / የካ",
      "Lemi Kura / ለሚ ኩራ",
    ].map((label) => ({ value: label, label })),
  },
  {
    value: "Adama / አዳማ",
    label: "Adama / አዳማ",
    subcities: ["Maganassa / መጋናሳ", "Burat / ቡራት", "Taitu / ጣይቱ", "Ambassador / አምባሳደር", "Arada / አራዳ"].map((label) => ({ value: label, label })),
  },
  {
    value: "Bahir Dar / ባሕር ዳር",
    label: "Bahir Dar / ባሕር ዳር",
    subcities: ["Belay Zeleke / በላይ ዘለቀ", "Gion / ግዮን", "Shum Abo / ሹም አቦ", "Tana / ጣና", "Hidar 11 / ህዳር 11"].map((label) => ({ value: label, label })),
  },
  {
    value: "Dire Dawa / ድሬ ዳዋ",
    label: "Dire Dawa / ድሬ ዳዋ",
    subcities: ["Sabian / ሳቢያን", "Legehare / ለገሃሬ", "Gende Kore / ገንደ ቆሬ", "Kezira / ከዚራ", "Dechatu / ደቻቱ"].map((label) => ({ value: label, label })),
  },
  {
    value: "Hawassa / ሀዋሳ",
    label: "Hawassa / ሀዋሳ",
    subcities: ["Addis Ketema / አዲስ ከተማ", "Hayk Dar / ሐይቅ ዳር", "Mehal / መሀል", "Menahariya / መናሃሪያ", "Misrak / ምስራቅ"].map((label) => ({ value: label, label })),
  },
  {
    value: "Mekelle / መቐለ",
    label: "Mekelle / መቐለ",
    subcities: ["Adi Haqi / ኣዲ ሓቂ", "Ayder / አይደር", "Hadnet / ሓድነት", "Hawelti / ሓወልቲ", "Quiha / ቁሓ"].map((label) => ({ value: label, label })),
  },
];
