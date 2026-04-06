import {
  CATEGORY_SUBCATEGORIES,
  CONSTRUCTION_MACHINERIES_REPAIRS_CATEGORY,
} from "@/lib/categories";
import { CONSTRUCTION_LEAVES_BY_SUB } from "@/lib/constructionListingLeaves";
import { SMARTPHONE_MODEL_SUGGESTIONS_FOR_DETECTION } from "@/lib/smartphoneModelsForSellDetection";
import { VEHICLE_MODEL_SUGGESTIONS_FOR_DETECTION } from "@/lib/vehicleModelsForSellDetection";

/** Result of matching the listing title against known category / subcategory / leaf keywords. */
export type SellTitleDetection = {
  category: string;
  subcategory: string;
  constructionItem?: string;
  brand?: string;
  model?: string;
  label: string;
  /** Human-friendly hierarchy for UI (may differ slightly from raw category names). */
  pathLabels: string[];
};

type RuleResultCore = Omit<SellTitleDetection, "label" | "pathLabels"> & {
  pathLabels?: string[];
};

type Rule = {
  label: string;
  test: (t: string) => boolean;
  result: RuleResultCore;
};

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function withPathLabels(result: RuleResultCore): Omit<SellTitleDetection, "label"> {
  const pathLabels =
    result.pathLabels ||
    (() => {
      const parts: string[] = [result.category, result.subcategory];
      if (result.constructionItem) parts.push(result.constructionItem);
      if (result.brand) parts.push(result.brand);
      if (result.model) parts.push(result.model);
      return parts;
    })();
  const { pathLabels: _p, ...rest } = result;
  return { ...rest, pathLabels };
}

const HANDCRAFTED_RULES: Rule[] = [
  {
    label: "UD Trucks (construction — heavy machinery)",
    test: (t) => /\bud\s*trucks?\b/i.test(t) || (/\bud\b/i.test(t) && /\btruck\b/i.test(t)),
    result: {
      category: CONSTRUCTION_MACHINERIES_REPAIRS_CATEGORY,
      subcategory: "Heavy Machinery",
      constructionItem: "Other",
      pathLabels: [CONSTRUCTION_MACHINERIES_REPAIRS_CATEGORY, "Heavy Machinery", "UD Trucks"],
    },
  },
  {
    label: "Nissan truck / pickup",
    test: (t) =>
      /\bnissan\b/i.test(t) &&
      !/\bud\b/i.test(t) &&
      /\b(truck|trucks|lorry|lorries|navara|pickup|pick-up|cabstar|atlas)\b/i.test(t),
    result: {
      category: "Vehicles",
      subcategory: "Trucks & Lorries",
      brand: "Nissan",
      pathLabels: ["Vehicles", "Trucks & Lorries", "Nissan"],
    },
  },
  {
    label: "Dump or tipper — commercial vehicle",
    test: (t) => /\bdump\s*truck\b/i.test(t) || /\b(tipper|tippers)\b/i.test(t),
    result: {
      category: "Vehicles",
      subcategory: "Trucks & Lorries",
      pathLabels: ["Vehicles", "Trucks & Lorries", "Dump / tipper"],
    },
  },
  {
    label: "Dumper (construction machinery)",
    test: (t) => /\bdump\s*truck\b/i.test(t) || /\b(tipper|tippers)\b/i.test(t),
    result: {
      category: CONSTRUCTION_MACHINERIES_REPAIRS_CATEGORY,
      subcategory: "Heavy Machinery",
      constructionItem: "Dumpers",
      pathLabels: [CONSTRUCTION_MACHINERIES_REPAIRS_CATEGORY, "Heavy Machinery", "Dumpers"],
    },
  },
  {
    label: "Truck / lorry (commercial)",
    test: (t) =>
      /\btruck\b/i.test(t) &&
      !/\bud\b/i.test(t) &&
      t.length <= 52 &&
      !/\b(toy|toys|diecast|hot\s*wheels|scale\s*1|r\/c|rc\s*car|model|miniature)\b/i.test(t),
    result: {
      category: "Vehicles",
      subcategory: "Trucks & Lorries",
      pathLabels: ["Vehicles", "Trucks & Lorries"],
    },
  },
  {
    label: "Toyota Vitz",
    test: (t) => /\bvitz\b/i.test(t),
    result: {
      category: "Vehicles",
      subcategory: "Cars",
      brand: "Toyota",
      model: "Vitz",
      pathLabels: ["Vehicles", "Cars", "Toyota", "Vitz"],
    },
  },
  {
    label: "Toyota Yaris",
    test: (t) => /\byaris\b/i.test(t),
    result: { category: "Vehicles", subcategory: "Cars", brand: "Toyota", model: "Yaris", pathLabels: ["Vehicles", "Cars", "Toyota", "Yaris"] },
  },
  {
    label: "Toyota Corolla",
    test: (t) => /\bcorolla\b/i.test(t),
    result: { category: "Vehicles", subcategory: "Cars", brand: "Toyota", model: "Corolla", pathLabels: ["Vehicles", "Cars", "Toyota", "Corolla"] },
  },
  {
    label: "Toyota Hilux",
    test: (t) => /\bhilux\b/i.test(t),
    result: { category: "Vehicles", subcategory: "Cars", brand: "Toyota", model: "Hilux", pathLabels: ["Vehicles", "Cars", "Toyota", "Hilux"] },
  },
  {
    label: "Toyota Land Cruiser",
    test: (t) => /\b(land\s*cruiser|prado)\b/i.test(t),
    result: {
      category: "Vehicles",
      subcategory: "Cars",
      brand: "Toyota",
      model: "Land Cruiser",
      pathLabels: ["Vehicles", "Cars", "Toyota", "Land Cruiser"],
    },
  },
  {
    label: "Bulldozer",
    test: (t) => /\bbulldozer\b/i.test(t) || /\bdozer\b/i.test(t),
    result: {
      category: CONSTRUCTION_MACHINERIES_REPAIRS_CATEGORY,
      subcategory: "Heavy Machinery",
      constructionItem: "Bulldozers",
      pathLabels: [CONSTRUCTION_MACHINERIES_REPAIRS_CATEGORY, "Machinery", "Bulldozer"],
    },
  },
  {
    label: "Excavator",
    test: (t) => /\bexcavator\b/i.test(t),
    result: {
      category: CONSTRUCTION_MACHINERIES_REPAIRS_CATEGORY,
      subcategory: "Heavy Machinery",
      constructionItem: "Excavators",
      pathLabels: [CONSTRUCTION_MACHINERIES_REPAIRS_CATEGORY, "Machinery", "Excavator"],
    },
  },
  {
    label: "Cement",
    test: (t) => /\bcement\b/i.test(t),
    result: {
      category: CONSTRUCTION_MACHINERIES_REPAIRS_CATEGORY,
      subcategory: "Materials",
      constructionItem: "Cement",
      pathLabels: ["Construction", "Materials", "Cement"],
    },
  },
  {
    label: "PVC Pipes",
    test: (t) => /\bpvc\b/i.test(t) && /\b(pipe|pipes|piping)\b/i.test(t),
    result: {
      category: CONSTRUCTION_MACHINERIES_REPAIRS_CATEGORY,
      subcategory: "Materials",
      constructionItem: "PVC Pipes",
      pathLabels: [CONSTRUCTION_MACHINERIES_REPAIRS_CATEGORY, "Materials", "Plumbing Materials", "PVC Pipes"],
    },
  },
  {
    label: "PVC",
    test: (t) => /\bpvc\b/i.test(t),
    result: {
      category: CONSTRUCTION_MACHINERIES_REPAIRS_CATEGORY,
      subcategory: "Materials",
      constructionItem: "PVC Pipes",
      pathLabels: [CONSTRUCTION_MACHINERIES_REPAIRS_CATEGORY, "Materials", "Plumbing Materials", "PVC"],
    },
  },
  {
    label: "Wheel Loader",
    test: (t) => /\bwheel\s*loader\b/i.test(t),
    result: {
      category: CONSTRUCTION_MACHINERIES_REPAIRS_CATEGORY,
      subcategory: "Heavy Machinery",
      constructionItem: "Wheel Loaders",
      pathLabels: [CONSTRUCTION_MACHINERIES_REPAIRS_CATEGORY, "Machinery", "Wheel Loader"],
    },
  },
  {
    label: "Concrete Mixer",
    test: (t) => /\bconcrete\s*mixer\b/i.test(t),
    result: {
      category: CONSTRUCTION_MACHINERIES_REPAIRS_CATEGORY,
      subcategory: "Heavy Machinery",
      constructionItem: "Concrete Mixers",
      pathLabels: [CONSTRUCTION_MACHINERIES_REPAIRS_CATEGORY, "Machinery", "Concrete Mixer"],
    },
  },
  {
    label: "Samsung phone",
    test: (t) =>
      /\bsamsung\b/i.test(t) &&
      !/\b(tv|television|refrigerator|fridge|washer|dryer|monitor|soundbar)\b/i.test(t),
    result: {
      category: "Mobile Devices",
      subcategory: "Smartphones",
      brand: "Samsung",
      pathLabels: ["Electronics", "Mobile Phones", "Samsung"],
    },
  },
  {
    label: "iPhone",
    test: (t) => /\biphone\b/i.test(t),
    result: {
      category: "Mobile Devices",
      subcategory: "Smartphones",
      brand: "Apple",
      pathLabels: ["Electronics", "Mobile Phones", "Apple (iPhone)"],
    },
  },
  {
    label: "Xiaomi / Redmi",
    test: (t) => /\b(xiaomi|redmi|poco)\b/i.test(t),
    result: {
      category: "Mobile Devices",
      subcategory: "Smartphones",
      brand: "Xiaomi",
      pathLabels: ["Electronics", "Mobile Phones", "Xiaomi"],
    },
  },
  {
    label: "Tecno",
    test: (t) => /\btecno\b/i.test(t),
    result: {
      category: "Mobile Devices",
      subcategory: "Smartphones",
      brand: "Tecno",
      pathLabels: ["Electronics", "Mobile Phones", "Tecno"],
    },
  },
  {
    label: "Infinix",
    test: (t) => /\binfinix\b/i.test(t),
    result: {
      category: "Mobile Devices",
      subcategory: "Smartphones",
      brand: "Infinix",
      pathLabels: ["Electronics", "Mobile Phones", "Infinix"],
    },
  },
  {
    label: "Google Pixel",
    test: (t) => /\b(pixel\s*[0-9]|google\s*pixel)\b/i.test(t),
    result: {
      category: "Mobile Devices",
      subcategory: "Smartphones",
      brand: "Google Pixel",
      pathLabels: ["Electronics", "Mobile Phones", "Google Pixel"],
    },
  },
  {
    label: "Oppo",
    test: (t) => /\boppo\b/i.test(t),
    result: {
      category: "Mobile Devices",
      subcategory: "Smartphones",
      brand: "Oppo",
      pathLabels: ["Electronics", "Mobile Phones", "Oppo"],
    },
  },
  {
    label: "Vivo",
    test: (t) => /\bvivo\b/i.test(t),
    result: {
      category: "Mobile Devices",
      subcategory: "Smartphones",
      brand: "Vivo",
      pathLabels: ["Electronics", "Mobile Phones", "Vivo"],
    },
  },
  {
    label: "Realme",
    test: (t) => /\brealme\b/i.test(t),
    result: {
      category: "Mobile Devices",
      subcategory: "Smartphones",
      brand: "Realme",
      pathLabels: ["Electronics", "Mobile Phones", "Realme"],
    },
  },
  {
    label: "Generic smartphone keywords",
    test: (t) =>
      /\b(smartphone|android phone|mobile phone|cellphone|cell phone)\b/i.test(t) && t.length < 80,
    result: {
      category: "Mobile Devices",
      subcategory: "Smartphones",
      pathLabels: ["Electronics", "Mobile Phones"],
    },
  },
];

function buildConstructionLeafRules(): Rule[] {
  const out: Rule[] = [];
  for (const [sub, leaves] of Object.entries(CONSTRUCTION_LEAVES_BY_SUB)) {
    const sorted = [...leaves].filter((l) => l !== "Other").sort((a, b) => b.length - a.length);
    for (const leaf of sorted) {
      const pattern = escapeRegex(leaf).replace(/\s+/g, "\\s+");
      const re = new RegExp(`\\b${pattern}\\b`, "i");
      out.push({
        label: `${leaf} (${sub})`,
        test: (t) => re.test(t),
        result: {
          category: CONSTRUCTION_MACHINERIES_REPAIRS_CATEGORY,
          subcategory: sub,
          constructionItem: leaf,
        },
      });
    }
  }
  return out;
}

function buildVehicleModelRules(): Rule[] {
  const out: Rule[] = [];
  for (const [brand, models] of Object.entries(VEHICLE_MODEL_SUGGESTIONS_FOR_DETECTION)) {
    const sorted = [...models].sort((a, b) => b.length - a.length);
    for (const model of sorted) {
      const pattern = escapeRegex(model).replace(/\s+/g, "\\s+");
      const re = new RegExp(`\\b${pattern}\\b`, "i");
      out.push({
        label: `${brand} ${model}`,
        test: (t) => re.test(t),
        result: {
          category: "Vehicles",
          subcategory: "Cars",
          brand,
          model,
          pathLabels: ["Vehicles", "Cars", brand, model],
        },
      });
    }
  }
  return out;
}

function buildSmartphoneModelRules(): Rule[] {
  const out: Rule[] = [];
  for (const [brand, models] of Object.entries(SMARTPHONE_MODEL_SUGGESTIONS_FOR_DETECTION)) {
    const sorted = [...models].filter((m) => m !== "Other").sort((a, b) => b.length - a.length);
    for (const model of sorted) {
      const pattern = escapeRegex(model).replace(/\s+/g, "\\s+");
      const re = new RegExp(`\\b${pattern}\\b`, "i");
      out.push({
        label: `${brand} ${model}`,
        test: (t) => re.test(t),
        result: {
          category: "Mobile Devices",
          subcategory: "Smartphones",
          brand,
          model,
          pathLabels: ["Electronics", "Mobile Phones", brand, model],
        },
      });
    }
  }
  return out;
}

/**
 * Subcategory labels we do not match as bare phrases — too generic or handled elsewhere.
 * (Duplicate labels like "Heavy Machinery" across Vehicles vs Construction are kept: both match.)
 */
const SKIP_SUB_PHRASE = new Set([
  "Other",
  "Construction", // Services → Construction; matches almost every listing title
  "Consulting",
  "Software",
  "Services", // Construction subcategory "Services"; word appears everywhere
  "Cars", // handled by model rules; "cars" is extremely common English
]);

/**
 * Natural phrases that map to a category + subcategory when the official sub name is not in the title.
 * Placed before bare subcategory phrase rules; still after handcrafted + catalog rules.
 */
function buildSubcategoryAliasRules(): Rule[] {
  const RE = (category: string, subcategory: string, label: string, test: (t: string) => boolean): Rule => ({
    label,
    test,
    result: { category, subcategory },
  });

  return [
    RE("Real Estate", "Apartment or House for Rent", "Real Estate: apartment / flat for rent", (t) => {
      const hasHome = /\b(apartment|apt\.?|flat|studio|condo|condominium|townhouse|duplex)\b/i.test(t);
      const hasRent = /\b(rent|rental|lease|leasing|tenant)\b/i.test(t);
      return hasHome && hasRent && !/\b(sale|sell|sold)\b/i.test(t);
    }),
    RE("Real Estate", "Apartment or House for Sale", "Real Estate: home for sale", (t) => {
      const hasHome = /\b(apartment|apt\.?|flat|house|villa|townhouse|duplex|bungalow)\b/i.test(t);
      const hasSale = /\b(sale|sell|selling|price\s*reduced)\b/i.test(t);
      return hasHome && hasSale && !/\b(rent|rental|lease)\b/i.test(t);
    }),
    RE("Real Estate", "Land & Plots", "Real Estate: land / plot", (t) => {
      const hasLand = /\b(land|plot|plots|farmland|hectare|acres?|acreage)\b/i.test(t);
      const hasIntent = /\b(sale|sell|rent|lease|for sale|for rent)\b/i.test(t);
      return hasLand && hasIntent && !/\b(apartment|flat|villa|condo)\b/i.test(t);
    }),
    RE("Real Estate", "Commercial Spaces", "Real Estate: commercial space", (t) => {
      const hasType = /\b(office|shop|store|warehouse|retail|showroom|workshop|factory\s*space)\b/i.test(t);
      const hasIntent = /\b(rent|lease|sale|for rent|for sale|sqm|sq\s*m)\b/i.test(t);
      return hasType && hasIntent;
    }),
    RE("Real Estate", "Short-Term Rentals", "Real Estate: short stay / nightly", (t) =>
      /\b(airbnb|per\s*night|nightly|short[\s-]*term|weekly\s*rent|daily\s*rate|guest\s*house)\b/i.test(t),
    ),
    RE("Mobile Devices", "Feature Phones", "Mobile: feature / button phone", (t) =>
      /\b(feature\s*phone|button\s*phone|dumb\s*phone|basic\s*phone)\b/i.test(t),
    ),
    RE("Mobile Devices", "Tablets", "Mobile: tablet", (t) =>
      /\b(tablet|ipad|tab\s*a\d|galaxy\s*tab)\b/i.test(t) && !/\b(laptop|notebook)\b/i.test(t),
    ),
    RE("Mobile Devices", "Smartwatches", "Mobile: smartwatch", (t) => /\b(smartwatch|smart\s*watch|apple\s*watch|galaxy\s*watch)\b/i.test(t)),
    RE("Computing & Electronics", "Laptops", "Computing: laptop", (t) =>
      /\b(laptop|notebook|macbook|chromebook)\b/i.test(t),
    ),
    RE("Computing & Electronics", "Desktop Computers", "Computing: desktop PC", (t) =>
      /\b(desktop\s*pc|desktop\s*computer|gaming\s*pc|workstation)\b/i.test(t),
    ),
    RE("TV & Audio Systems", "Televisions", "TV: television", (t) =>
      /\b(tv|television|smart\s*tv|oled|qled|4k\s*tv)\b/i.test(t) && !/\b(tv\s*stand|mount)\b/i.test(t),
    ),
    RE("Home, Furniture & Appliances", "Kitchen Appliances", "Home: kitchen appliance", (t) =>
      /\b(fridge|refrigerator|freezer|microwave|oven|cooker|stove|dishwasher|blender|juicer)\b/i.test(t),
    ),
    RE("Home, Furniture & Appliances", "Home Appliances", "Home: washer / AC / vacuum", (t) =>
      /\b(washing\s*machine|washer|dryer|vacuum|air\s*conditioner|a\/c|ac\s*unit|water\s*heater|geyser)\b/i.test(t),
    ),
    RE("Clothing & Fashion", "Shoes & Footwear", "Fashion: shoes", (t) =>
      /\b(sneakers?|boots?|sandals?|heels?|loafers?|trainers?|footwear|nike\s*air|adidas)\b/i.test(t) &&
      !/\b(phone|laptop)\b/i.test(t),
    ),
    RE("Pets & Animals", "Dogs & Puppies", "Pets: dog / puppy", (t) =>
      /\b(puppy|puppies|dogs?|canine)\b/i.test(t) && !/\b(hot\s*dog|underdog)\b/i.test(t),
    ),
    RE("Pets & Animals", "Cats & Kittens", "Pets: cat / kitten", (t) =>
      /\b(kitten|kittens|cats?|feline|persian\s*cat)\b/i.test(t),
    ),
    RE("Pets & Animals", "Birds", "Pets: bird / parrot", (t) =>
      /\b(parrot|parakeet|canary|cockatiel|lovebird|poultry\s*for\s*sale)\b/i.test(t),
    ),
    RE("Pets & Animals", "Fish", "Pets: aquarium fish", (t) =>
      /\b(goldfish|aquarium|tropical\s*fish|koi|betta|guppy)\b/i.test(t),
    ),
    RE("Jobs & Employment", "Driving Jobs", "Jobs: driver / chauffeur", (t) =>
      /\b(driver|driving\s*job|chauffeur|delivery\s*driver|truck\s*driver|with\s*license)\b/i.test(t) &&
      /\b(job|vacancy|hire|hiring|urgent)\b/i.test(t),
    ),
    RE("Jobs & Employment", "IT & Technology", "Jobs: IT / developer hire", (t) =>
      /\b(developer|software\s*engineer|full[\s-]*stack|react|devops|it\s*support)\b/i.test(t) &&
      /\b(job|vacancy|hire|hiring)\b/i.test(t),
    ),
    RE("Jobs & Employment", "Sales & Marketing", "Jobs: sales / marketing role", (t) =>
      /\b(sales\s*rep|salesperson|marketing\s*manager|digital\s*marketing)\b/i.test(t) &&
      /\b(job|vacancy|hire|hiring)\b/i.test(t),
    ),
    RE("Job Seekers (CVs)", "Full-Time Seekers", "Job seeker: CV / resume", (t) =>
      /\b(cv|c\.v\.|resume|curriculum\s*vitae)\b/i.test(t) &&
      /\b(seeking|looking\s*for\s*work|job\s*seeker|available\s*for\s*work)\b/i.test(t) &&
      !/\b(part[\s-]*time)\b/i.test(t),
    ),
    RE("Job Seekers (CVs)", "Part-Time Seekers", "Job seeker: part-time CV", (t) =>
      /\b(cv|resume)\b/i.test(t) && /\b(part[\s-]*time)\b/i.test(t) && /\b(seeking|looking\s*for)\b/i.test(t),
    ),
    RE("Services", "Cleaning Services", "Services: cleaning", (t) =>
      /\b(cleaning\s*service|house\s*cleaning|office\s*cleaning|maid|deep\s*clean)\b/i.test(t),
    ),
    RE("Services", "Moving & Delivery Services", "Services: movers / delivery", (t) =>
      /\b(moving\s*company|movers|relocation|furniture\s*delivery|cargo\s*delivery)\b/i.test(t),
    ),
    RE("Services", "Beauty Services", "Services: salon / spa", (t) =>
      /\b(salon|hair\s*salon|nails|manicure|spa|makeup\s*artist|bridal\s*makeup)\b/i.test(t) &&
      /\b(service|booking|appointment)\b/i.test(t),
    ),
    RE("Services", "IT & Tech Services", "Services: IT support / repair shop", (t) =>
      /\b(computer\s*repair|laptop\s*repair|phone\s*repair|it\s*support|wifi\s*setup)\b/i.test(t) &&
      /\b(service|shop|technician)\b/i.test(t),
    ),
    RE("Services", "Repair & Maintenance", "Services: repair (general)", (t) =>
      /\b(repair\s*service|fix\s*service|maintenance\s*contract)\b/i.test(t) &&
      !/\b(phone|laptop|computer)\s*repair\b/i.test(t),
    ),
    RE("Agriculture & Farming", "Livestock", "Farming: livestock / cattle", (t) =>
      /\b(cattle|cows?|goats?|sheep|livestock|dairy|heifer|bull)\b/i.test(t),
    ),
    RE("Agriculture & Farming", "Seeds & Fertilizers", "Farming: seeds / fertilizer", (t) =>
      /\b(seeds?|fertilizer|fertiliser|urea|npk|compost)\b/i.test(t),
    ),
    RE("Leisure & Hobbies", "Musical Instruments", "Leisure: instrument", (t) =>
      /\b(guitar|piano|keyboard|drum\s*kit|violin|saxophone|amplifier|mixer\s*board)\b/i.test(t),
    ),
    RE("Leisure & Hobbies", "Sports Equipment", "Leisure: sports gear", (t) =>
      /\b(treadmill|dumbbell|bicycle|mountain\s*bike|football|basketball|gym\s*equipment)\b/i.test(t),
    ),
    RE("Commercial Equipment", "Restaurant Equipment", "Commercial: restaurant / kitchen equip.", (t) =>
      /\b(restaurant\s*equipment|commercial\s*oven|industrial\s*fridge|espresso\s*machine)\b/i.test(t),
    ),
    RE("Kids & Baby Items", "Baby Products", "Kids: baby / stroller", (t) =>
      /\b(stroller|pram|baby\s*carrier|crib|cot|diaper|baby\s*monitor)\b/i.test(t),
    ),
    RE("Vehicles", "Motorbikes & Scooters", "Vehicles: motorbike / boda", (t) =>
      /\b(motorbike|motorcycle|scooter|boda|boda-boda|yamaha\s*r\d|ducati|honda\s*cbr)\b/i.test(t) &&
      !/\bcar\b/i.test(t),
    ),
    RE("Vehicles", "Buses & Vans", "Vehicles: bus / van", (t) =>
      /\b(mini\s*bus|minibus|coaster|sprinter|van\s*for\s*sale|passenger\s*van)\b/i.test(t),
    ),
    RE("Vehicles", "Boats & Watercraft", "Vehicles: boat", (t) =>
      /\b(boat|speedboat|yacht|outboard|fiber\s*boat)\b/i.test(t),
    ),
    RE("Vehicles", "Vehicle Parts", "Vehicles: spare parts", (t) =>
      /\b(spare\s*parts?|car\s*parts?|engine\s*parts?|headlight|bumper|alternator)\b/i.test(t),
    ),
    RE("Vehicles", "Tires & Wheels", "Vehicles: tyres / rims", (t) =>
      /\b(tyre|tire|rims?|alloy\s*wheels?|wheel\s*set)\b/i.test(t),
    ),
  ];
}

/** Every official subcategory label as a phrase match (per category), longest first. */
function buildSubcategoryPhraseRules(): Rule[] {
  const out: Rule[] = [];
  for (const [category, subs] of Object.entries(CATEGORY_SUBCATEGORIES)) {
    const sorted = [...subs].filter((sub) => !SKIP_SUB_PHRASE.has(sub)).sort((a, b) => b.length - a.length);
    for (const sub of sorted) {
      const pattern = escapeRegex(sub).replace(/\s+/g, "\\s+");
      const re = new RegExp(`\\b${pattern}\\b`, "i");
      out.push({
        label: `${category}: ${sub}`,
        test: (t) => re.test(t),
        result: { category, subcategory: sub },
      });
    }
  }
  return out;
}

const RULES: Rule[] = [
  ...HANDCRAFTED_RULES,
  ...buildConstructionLeafRules(),
  ...buildVehicleModelRules(),
  ...buildSmartphoneModelRules(),
  ...buildSubcategoryAliasRules(),
  ...buildSubcategoryPhraseRules(),
];

/** Stable identity for comparing detections (excludes label / pathLabels). */
export function detectionResultKey(d: Pick<SellTitleDetection, "category" | "subcategory" | "constructionItem" | "brand" | "model">): string {
  return [d.category, d.subcategory, d.constructionItem || "", d.brand || "", d.model || ""].join("|");
}

/**
 * All matching rules for the title (order preserved). Use for suggestion lists.
 * De-duplicates identical category paths.
 */
export function detectAllListingsFromTitle(title: string): SellTitleDetection[] {
  const t = title.trim();
  if (t.length < 2) return [];
  const out: SellTitleDetection[] = [];
  const seen = new Set<string>();
  for (const rule of RULES) {
    if (!rule.test(t)) continue;
    const built = withPathLabels(rule.result);
    const full: SellTitleDetection = { ...built, label: rule.label };
    const key = detectionResultKey(full);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(full);
  }
  return out;
}

/**
 * Infer category hierarchy from a free-text title. First matching rule wins (order matters).
 */
export function detectListingFromTitle(title: string): SellTitleDetection | null {
  const all = detectAllListingsFromTitle(title);
  return all[0] || null;
}
