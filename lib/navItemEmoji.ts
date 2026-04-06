/**
 * Single emoji per nav label (subcategories + construction flyout items).
 * Used by homepage category hover menu only — no API.
 */
const NAV_ITEM_EMOJI: Record<string, string> = {
  // Vehicles
  Cars: "🚗",
  "SUVs & Crossovers": "🚙",
  "Motorbikes & Scooters": "🏍️",
  "Trucks & Lorries": "🚚",
  "Buses & Vans": "🚌",
  "Heavy Machinery": "🏗️",
  "Vehicle Parts": "🔩",
  "Tires & Wheels": "⭕",
  "Vehicle Accessories": "🧰",
  "Boats & Watercraft": "🛥️",

  // Real Estate
  "Apartment or House for Rent": "🏢",
  "Apartment or House for Sale": "🏠",
  "Land & Plots": "🌍",
  "Commercial Spaces": "🏬",
  "Short-Term Rentals": "🗓️",

  // Mobile Devices
  Smartphones: "📱",
  "Feature Phones": "📞",
  Tablets: "📲",
  Smartwatches: "⌚",
  "Mobile Accessories": "🔌",
  "Mobile Spare Parts": "🧩",

  // Computing & Electronics
  Laptops: "💻",
  "Desktop Computers": "🖥️",
  "Computer Accessories": "🖱️",
  "Networking Equipment": "📡",
  "Printers & Scanners": "🖨️",
  Software: "💾",

  // TV & Audio
  Televisions: "📺",
  "Home Theater Systems": "🎬",
  Speakers: "🔊",
  Headphones: "🎧",
  "DVD & Media Players": "📀",

  // Home, Furniture & Appliances
  "Living Room Furniture": "🛋️",
  "Bedroom Furniture": "🛏️",
  "Office Furniture": "🪑",
  "Kitchen Appliances": "🍳",
  "Home Appliances": "⚡",
  "Home Decor": "🖼️",
  "Garden Supplies": "🌿",

  // Clothing & Fashion
  "Men's Clothing": "👔",
  "Women's Clothing": "👗",
  "Shoes & Footwear": "👟",
  "Bags & Backpacks": "🎒",
  Watches: "⌚",
  Jewelry: "💎",
  Accessories: "🎀",

  // Beauty & Personal Care
  Skincare: "🧴",
  Haircare: "💇",
  Makeup: "💄",
  Fragrance: "🌸",
  "Body Care": "🧼",
  "Men's Grooming": "🪒",
  "Beauty Tools & Accessories": "✨",

  // Construction category subs
  Materials: "🧱",
  "Tools & Equipment": "🛠️",
  Services: "🔧",

  // Services (top-level category subs)
  "Repair & Maintenance": "🔧",
  Construction: "👷",
  "Cleaning Services": "🧹",
  "Moving & Delivery Services": "📦",
  "Beauty Services": "💅",
  "IT & Tech Services": "💻",
  "Event Services": "🎉",
  Consulting: "📋",

  // Commercial Equipment
  "Industrial Equipment": "🏭",
  "Manufacturing Tools": "⚙️",
  "Store Equipment": "🏪",
  "Restaurant Equipment": "🍽️",

  // Leisure & Hobbies
  "Sports Equipment": "⚽",
  "Musical Instruments": "🎸",
  "Books & Games": "📚",
  "Camping & Outdoor Gear": "⛺",

  // Kids & Baby
  "Baby Products": "👶",
  "Toys & Games": "🧸",
  "Kids Clothing": "👕",
  "School Supplies": "✏️",

  // Agriculture
  "Farm Machinery": "🚜",
  Livestock: "🐄",
  "Seeds & Fertilizers": "🌱",
  "Agricultural Tools": "🔨",

  // Pets
  "Dogs & Puppies": "🐕",
  "Cats & Kittens": "🐈",
  Birds: "🐦",
  Fish: "🐟",
  "Pet Accessories": "🦴",

  // Jobs
  "Accounting & Finance": "📊",
  "IT & Technology": "💻",
  "Sales & Marketing": "📈",
  "Customer Service": "🎧",
  "Driving Jobs": "🚗",
  "Construction Jobs": "👷",

  // Job seekers
  "Part-Time Seekers": "⏱️",
  "Full-Time Seekers": "💼",
  "Internship Seekers": "🎓",

  // Generic (shared)
  Other: "📁",

  // Construction — Materials leaves
  Cement: "🧱",
  "Steel & Metal": "🔩",
  "Concrete & Precast": "🏗️",
  "Flooring Materials": "🪵",
  "Construction Adhesive": "🧴",
  "Pipes & Fittings": "🔧",
  "PVC Pipes": "🔧",
  "HDPE Pipes": "🔧",
  "Water Tanks": "💧",
  Fittings: "🔧",
  "Roofing Materials": "🏠",
  Paints: "🎨",
  "Paint Brushes, Rollers & Trays": "🖌️",
  Tiles: "🔲",
  Ceramics: "🏺",
  Gypsum: "🧱",
  Glass: "🪟",
  Aluminum: "🔲",
  Marble: "🪨",
  Plasterboard: "🧱",
  Plasters: "🧱",
  Plywood: "🪵",
  Polystyrene: "📦",
  Sand: "🏖️",
  "Rock & Gravel": "🪨",
  Sealants: "🧴",
  "Tiles & Slabs": "🔲",
  Wallpaper: "🖼️",
  "Cables & Wires": "🔌",
  Switches: "🔘",
  "Circuit Breakers": "⚡",
  Transformers: "⚡",

  // Construction — Heavy machinery leaves
  Excavators: "🚜",
  Loaders: "🚜",
  Bulldozers: "🚧",
  Graders: "🛣️",
  Cranes: "🏗️",
  "Concrete Equipment": "🧱",
  "Road Equipment": "🛣️",
  "Backhoe Loaders": "🚜",
  Tractors: "🚜",
  "Concrete Pumps": "🧱",
  Forklifts: "🚜",
  "Road Rollers": "🛣️",
  Dumpers: "🚚",
  "Wheel Loaders": "🚜",
  "Concrete Mixers": "🧱",
  "Boom Lifts": "🛗",
  Compactors: "🛣️",
  Compressors: "💨",
  "Pallet Stackers": "📦",
  "Drilling Rigs": "⛏️",
  Crushers: "⚙️",

  // Construction — Tools & Equipment leaves
  "Power Tools": "🔌",
  "Hand Tools": "🔨",
  "Welding Machines": "🧑‍🏭",
  "Electrical Supplies": "⚡",
  "Plumbing Supplies": "🚿",
  "Safety Equipment": "⛑️",
  "DIY & Construction Accessories": "🧰",

  // Construction — Services leaves
  "Construction Services": "👷",
  "Machinery Rental": "🏗️",
  "Engineering Services": "📐",
};

export function getNavItemEmoji(label: string): string {
  return NAV_ITEM_EMOJI[label] ?? "📋";
}
