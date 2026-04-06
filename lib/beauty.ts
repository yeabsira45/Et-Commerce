export type BeautySubcategory =
  | "Skincare"
  | "Haircare"
  | "Makeup"
  | "Fragrance"
  | "Body Care"
  | "Men's Grooming"
  | "Beauty Tools & Accessories";

export const BEAUTY_SUBCATEGORIES: BeautySubcategory[] = [
  "Skincare",
  "Haircare",
  "Makeup",
  "Fragrance",
  "Body Care",
  "Men's Grooming",
  "Beauty Tools & Accessories",
];

const SHARED_BEAUTY_BRANDS = [
  "L'Oréal",
  "Nivea",
  "Dove",
  "Garnier",
  "Neutrogena",
  "Olay",
  "Cerave",
  "La Roche-Posay",
  "The Ordinary",
  "Clinique",
  "Estée Lauder",
  "Dior",
  "Chanel",
  "Lancôme",
  "Sephora",
  "Vaseline",
  "Aveeno",
  "Eucerin",
  "Bioderma",
];

export const BEAUTY_BRANDS_BY_SUBCATEGORY: Record<BeautySubcategory, string[]> = {
  Skincare: [
    "Nivea",
    "Garnier",
    "Neutrogena",
    "Olay",
    "Cerave",
    "La Roche-Posay",
    "The Ordinary",
    "Clinique",
    "Bioderma",
    "Aveeno",
    "Eucerin",
    ...SHARED_BEAUTY_BRANDS,
    "Other",
  ],
  Haircare: [
    "Pantene",
    "Head & Shoulders",
    "Sunsilk",
    "Tresemme",
    "SheaMoisture",
    "OGX",
    "Moroccanoil",
    "L'Oréal",
    "Garnier",
    "Dove",
    "Other",
  ],
  Makeup: [
    "MAC",
    "Fenty Beauty",
    "Maybelline",
    "Revlon",
    "NYX",
    "Huda Beauty",
    "Dior",
    "Chanel",
    "Lancôme",
    "Estée Lauder",
    "Sephora",
    "L'Oréal",
    "Other",
  ],
  Fragrance: [
    "Dior",
    "Chanel",
    "Lancôme",
    "Estée Lauder",
    "Old Spice",
    "Nivea",
    "Revlon",
    "Sephora",
    "Other",
  ],
  "Body Care": [
    "Dove",
    "Nivea",
    "Vaseline",
    "Aveeno",
    "Eucerin",
    "Bioderma",
    "Garnier",
    "Other",
  ],
  "Men's Grooming": [
    "Gillette",
    "Nivea Men",
    "Old Spice",
    "L'Oréal",
    "Dove",
    "Nivea",
    "Other",
  ],
  "Beauty Tools & Accessories": [
    "Sephora",
    "MAC",
    "Philips",
    "Panasonic",
    "Remington",
    "Other",
  ],
};

export const BEAUTY_PRODUCT_TYPES: Record<BeautySubcategory, string[]> = {
  Skincare: ["Cleanser", "Face Wash", "Moisturizer", "Serum", "Toner", "Sunscreen", "Face Mask", "Eye Cream", "Acne Treatment", "Other"],
  Haircare: ["Shampoo", "Conditioner", "Hair Oil", "Hair Mask", "Hair Serum", "Styling Gel", "Hair Spray", "Other"],
  Makeup: ["Foundation", "Concealer", "Powder", "Lipstick", "Lip Gloss", "Mascara", "Eyeliner", "Eyeshadow", "Blush", "Highlighter", "Other"],
  Fragrance: ["Perfume", "Body Spray", "Cologne", "Deodorant", "Other"],
  "Body Care": ["Body Lotion", "Body Wash", "Body Scrub", "Soap", "Hand Cream", "Other"],
  "Men's Grooming": ["Beard Oil", "Shaving Cream", "Aftershave", "Face Wash", "Hair Styling Products", "Other"],
  "Beauty Tools & Accessories": ["Makeup Brushes", "Hair Dryer", "Straightener", "Curling Iron", "Trimmer", "Razor", "Other"],
};

export const BEAUTY_GENDER_OPTIONS = ["Male", "Female", "Unisex"];
export const BEAUTY_SKIN_TYPES = ["Oily", "Dry", "Combination", "Sensitive"];
export const BEAUTY_HAIR_TYPES = ["Curly", "Straight", "Wavy"];
export const BEAUTY_CONDITION_OPTIONS = ["New", "Slightly Used"];

export const BEAUTY_BRAND_SUGGESTIONS = [
  "Nivea",
  "Dove",
  "L'Oréal",
  "Maybelline",
  "MAC",
  "Fenty Beauty",
  "Pantene",
  "Gillette",
];

export function getBeautyBrands(subcategory: string) {
  return BEAUTY_BRANDS_BY_SUBCATEGORY[(subcategory as BeautySubcategory) || "Skincare"] || [...SHARED_BEAUTY_BRANDS, "Other"];
}

export function getBeautyProductTypes(subcategory: string) {
  return BEAUTY_PRODUCT_TYPES[(subcategory as BeautySubcategory) || "Skincare"] || ["Other"];
}
