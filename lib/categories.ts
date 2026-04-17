export type HomeCategory = {
  name: string;
  count: string;
  icon: string;
  path: string;
};

/** Canonical listing category label (replaces legacy "Construction & Repair"). */
export const CONSTRUCTION_MACHINERIES_REPAIRS_CATEGORY = "Construction, Machineries and Repairs";

export const HOME_CATEGORIES: HomeCategory[] = [
  { icon: "🚗", name: "Vehicles", count: "20,368 ads", path: "/vehicles" },
  { icon: "🏢", name: "Real Estate", count: "20,905 ads", path: "/properties?category=Real%20Estate" },
  { icon: "📱", name: "Mobile Devices", count: "166,382 ads", path: "/electronics?category=Mobile%20Devices" },
  { icon: "💻", name: "Computing & Electronics", count: "122,410 ads", path: "/electronics?category=Computing%20%26%20Electronics" },
  { icon: "📺", name: "TV & Audio Systems", count: "77,590 ads", path: "/electronics?category=TV%20%26%20Audio%20Systems" },
  { icon: "🏠", name: "Home, Furniture & Appliances", count: "65,080 ads", path: "/home-furniture-appliances" },
  { icon: "👕", name: "Clothing & Fashion", count: "38,420 ads", path: "/fashion" },
  { icon: "💄", name: "Beauty & Personal Care", count: "36,081 ads", path: "/beauty-personal-care?category=Beauty%20%26%20Personal%20Care" },
  {
    icon: "🧱",
    name: CONSTRUCTION_MACHINERIES_REPAIRS_CATEGORY,
    count: "12,522 ads",
    path: `/services?category=${encodeURIComponent(CONSTRUCTION_MACHINERIES_REPAIRS_CATEGORY)}`,
  },
  { icon: "🏭", name: "Commercial Equipment", count: "11,084 ads", path: "/commercial-equipment-tools?category=Commercial%20Equipment" },
  { icon: "🎸", name: "Leisure & Hobbies", count: "14,220 ads", path: "/leisure-activities?category=Leisure%20%26%20Hobbies" },
  { icon: "🧸", name: "Kids & Baby Items", count: "10,472 ads", path: "/babies-kids?category=Kids%20%26%20Baby%20Items" },
  { icon: "🌾", name: "Agriculture & Farming", count: "18,931 ads", path: "/food-agriculture-farming?category=Agriculture%20%26%20Farming" },
  { icon: "🐾", name: "Pets & Animals", count: "8,644 ads", path: "/animals-pets?category=Pets%20%26%20Animals" },
  { icon: "💼", name: "Jobs & Employment", count: "9,204 ads", path: "/jobs-seeking-work-cvs?category=Jobs%20%26%20Employment" },
  { icon: "📄", name: "Job Seekers (CVs)", count: "2,800 ads", path: "/jobs-seeking-work-cvs?category=Job%20Seekers%20(CVs)" },
  { icon: "🛠", name: "Services", count: "2,522 ads", path: "/services?category=Services" },
];

export const CATEGORY_SUBCATEGORIES: Record<string, string[]> = {
  Vehicles: ["Cars", "SUVs & Crossovers", "Motorbikes & Scooters", "Trucks & Lorries", "Buses & Vans", "Heavy Machinery", "Vehicle Parts", "Tires & Wheels", "Vehicle Accessories", "Boats & Watercraft", "Other"],
  "Real Estate": [
    "Apartment or House for Rent",
    "Apartment or House for Sale",
    "Land & Plots",
    "Commercial Spaces",
    "Short-Term Rentals",
    "Other",
  ],
  "Mobile Devices": ["Smartphones", "Feature Phones", "Tablets", "Smartwatches", "Mobile Accessories", "Mobile Spare Parts", "Other"],
  "Computing & Electronics": ["Laptops", "Desktop Computers", "Computer Accessories", "Networking Equipment", "Printers & Scanners", "Software", "Other"],
  "TV & Audio Systems": ["Televisions", "Home Theater Systems", "Speakers", "Headphones", "DVD & Media Players", "Other"],
  "Home, Furniture & Appliances": ["Living Room Furniture", "Bedroom Furniture", "Office Furniture", "Kitchen Appliances", "Home Appliances", "Home Decor", "Garden Supplies", "Other"],
  "Clothing & Fashion": ["Men's Clothing", "Women's Clothing", "Shoes & Footwear", "Bags & Backpacks", "Watches", "Jewelry", "Accessories", "Other"],
  "Beauty & Personal Care": ["Skincare", "Haircare", "Makeup", "Fragrance", "Body Care", "Men's Grooming", "Beauty Tools & Accessories", "Other"],
  [CONSTRUCTION_MACHINERIES_REPAIRS_CATEGORY]: ["Materials", "Heavy Machinery", "Tools & Equipment", "Services", "Other"],
  Services: ["Repair & Maintenance", "Construction", "Cleaning Services", "Moving & Delivery Services", "Beauty Services", "IT & Tech Services", "Event Services", "Consulting", "Other"],
  "Commercial Equipment": ["Industrial Equipment", "Manufacturing Tools", "Store Equipment", "Restaurant Equipment", "Other"],
  "Leisure & Hobbies": ["Sports Equipment", "Musical Instruments", "Books & Games", "Camping & Outdoor Gear", "Other"],
  "Kids & Baby Items": ["Baby Products", "Toys & Games", "Kids Clothing", "School Supplies", "Other"],
  "Agriculture & Farming": ["Farm Machinery", "Livestock", "Seeds & Fertilizers", "Agricultural Tools", "Other"],
  "Pets & Animals": ["Dogs & Puppies", "Cats & Kittens", "Birds", "Fish", "Pet Accessories", "Other"],
  "Jobs & Employment": ["Accounting & Finance", "IT & Technology", "Sales & Marketing", "Customer Service", "Driving Jobs", "Construction Jobs", "Other"],
  "Job Seekers (CVs)": ["Part-Time Seekers", "Full-Time Seekers", "Internship Seekers", "Other"],
};

export function getSubcategories(category: string | null | undefined): string[] {
  if (!category) return [];
  return CATEGORY_SUBCATEGORIES[category] || [];
}

export function isValidSubcategoryForCategory(category: string | null | undefined, subcategory: string | null | undefined): boolean {
  if (!category || !subcategory) return false;
  return getSubcategories(category).includes(subcategory);
}

export function getDefaultSubcategory(category: string | null | undefined): string {
  return getSubcategories(category)[0] || "";
}

/** Maps legacy real-estate subcategory labels to current merged names. */
export const REAL_ESTATE_SUBCATEGORY_LEGACY_MAP: Record<string, string> = {
  "Apartments for Rent": "Apartment or House for Rent",
  "Houses for Rent": "Apartment or House for Rent",
  "Apartments for Sale": "Apartment or House for Sale",
  "Houses for Sale": "Apartment or House for Sale",
};

/** Maps legacy construction subcategory labels to current names under the construction category. */
export const CONSTRUCTION_REPAIR_SUBCATEGORY_LEGACY_MAP: Record<string, string> = {
  "Building Materials": "Materials",
  "Construction & Building Materials": "Materials",
  "Construction & Heavy Machinery": "Heavy Machinery",
  Machinery: "Heavy Machinery",
  "Repair & Construction": "Tools & Equipment",
  "Tools & Equipment": "Tools & Equipment",
  "Electrical Supplies": "Tools & Equipment",
  "Plumbing Supplies": "Tools & Equipment",
};

export function normalizeRealEstateSubcategory(sub: string | null | undefined): string {
  if (!sub) return "";
  return REAL_ESTATE_SUBCATEGORY_LEGACY_MAP[sub] || sub;
}

export function normalizeConstructionRepairSubcategory(sub: string | null | undefined): string {
  if (!sub) return "";
  return CONSTRUCTION_REPAIR_SUBCATEGORY_LEGACY_MAP[sub] || sub;
}

/** Subcategories that use the residential property detail + validation schema. */
export const REAL_ESTATE_RESIDENTIAL_SUBCATEGORIES = new Set([
  "Apartment or House for Rent",
  "Apartment or House for Sale",
  "Short-Term Rentals",
]);
