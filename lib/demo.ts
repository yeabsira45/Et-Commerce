export const demoVendor = {
  id: "demo-vendor",
  userId: "demo-user",
  storeName: "Demo Store",
  slug: "demo-store",
  city: "Addis Ababa",
  area: "Ethiopia",
  street: "Bole",
  phone: "+251-911-000000",
};

export const demoUser = {
  id: "demo-user",
  /** Sign-in identifier is this username only (`demo`), not an email. Password: `password`. */
  username: "demo",
  /** Placeholder for forms/API; use username `demo` to log in, not this address. */
  email: "demo@example.invalid",
  role: "ADMIN" as const,
  vendor: demoVendor,
};

export const demoListings = [
  {
    id: "demo-iphone-13",
    title: "Used iPhone 13",
    description: "128GB, gently used, includes charger and box.",
    price: 38000,
    category: "Mobile Devices",
    subcategory: "Smartphones",
    condition: "USED",
    status: "ACTIVE",
    city: "Addis Ababa",
    area: "Bole",
    vendorId: demoVendor.id,
    ownerId: demoUser.id,
    images: [{ url: "/errorpage.svg" }],
    vendor: demoVendor,
    details: {
      Brand: "Apple",
      Model: "iPhone 13",
      Condition: "Used",
      RAM: "4 GB",
      "Internal Storage": "128 GB",
      "Screen Size": "6.1 in",
      "Operating System": "iOS",
      "Battery Capacity (mAh)": "3240",
      "Main Camera": "12 MP",
      "Selfie Camera": "12 MP",
      Color: "Blue",
      "Price (ETB)": "38000",
    },
  },
  {
    id: "demo-samsung-tv-55",
    title: "Samsung TV 55\"",
    description: "55-inch 4K UHD, vibrant colors, clean screen.",
    price: 42000,
    category: "TV & Audio Systems",
    subcategory: "Televisions",
    condition: "USED",
    status: "ACTIVE",
    city: "Addis Ababa",
    area: "Kazanchis",
    vendorId: demoVendor.id,
    ownerId: demoUser.id,
    images: [{ url: "/errorpage.svg" }],
    vendor: demoVendor,
    details: {
      Brand: "Samsung",
      Model: "TU7000",
      Condition: "Used",
      Type: "Smart TV",
      "Screen Size": "55 in",
      "Display Tech": "LED",
      Resolution: "4K UHD",
      "Smart TV": "Yes",
      "HDMI Ports": "3",
      "Price (ETB)": "42000",
    },
  },
  {
    id: "demo-wooden-coffee-table",
    title: "Wooden Coffee Table",
    description: "Solid wood, modern finish, great for living rooms.",
    price: 9500,
    category: "Home, Furniture & Appliances",
    subcategory: "Living Room Furniture",
    condition: "USED",
    status: "ACTIVE",
    city: "Addis Ababa",
    area: "CMC",
    vendorId: demoVendor.id,
    ownerId: demoUser.id,
    images: [{ url: "/errorpage.svg" }],
    vendor: demoVendor,
    details: {
      Condition: "Used",
      Material: "Solid wood",
      Color: "Walnut",
      "Price (ETB)": "9500",
    },
  },
  {
    id: "demo-toyota-corolla-2008",
    title: "Toyota Corolla 2008",
    description: "Well maintained, automatic, clean interior.",
    price: 780000,
    category: "Vehicles",
    subcategory: "Cars",
    condition: "USED",
    status: "ACTIVE",
    city: "Addis Ababa",
    area: "Ayat",
    vendorId: demoVendor.id,
    ownerId: demoUser.id,
    images: [{ url: "/errorpage.svg" }],
    vendor: demoVendor,
    details: {
      "Vehicle Make": "Toyota",
      Model: "Corolla",
      "Year of Manufacture": "2008",
      Trim: "LE",
      "Body Type": "Sedan",
      Seats: "5",
      "Engine Size (cc)": "1800",
      "Horsepower (hp)": "130",
      Drivetrain: "FWD",
      "Fuel Type": "Petrol",
      Transmission: "Automatic",
      "Top Speed": "180 km/h",
      Mileage: "150,000 km",
      "Plate Number": "AA-12345",
      "Registration status": "Registered",
      Color: "Silver",
      "Interior Color": "Black",
      Condition: "Used",
      "Price (ETB)": "780000",
      "Negotiable?": "Yes",
    },
  },
  {
    id: "demo-gaming-laptop",
    title: "Gaming Laptop",
    description: "RTX graphics, 16GB RAM, 512GB SSD.",
    price: 125000,
    category: "Computing & Electronics",
    subcategory: "Laptops",
    condition: "USED",
    status: "ACTIVE",
    city: "Addis Ababa",
    area: "Bole",
    vendorId: demoVendor.id,
    ownerId: demoUser.id,
    images: [{ url: "/errorpage.svg" }],
    vendor: demoVendor,
    details: {
      Brand: "Lenovo",
      Model: "Legion 5",
      Condition: "Used",
      "Processor (CPU)": "Ryzen 7",
      "Graphics (GPU)": "RTX 3060",
      RAM: "16 GB",
      Storage: "512 GB SSD",
      "Screen Size": "15.6 in",
      "Operating System": "Windows 11",
      "Battery Life": "4-5 hrs",
      "Price (ETB)": "125000",
    },
  },
];

export const demoReviews = [
  {
    id: "demo-review-1",
    vendorId: demoVendor.id,
    reviewerId: "demo-reviewer-1",
    rating: 5,
    comment: "Great communication and the item matched the description.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    reviewer: { username: "alem" },
  },
  {
    id: "demo-review-2",
    vendorId: demoVendor.id,
    reviewerId: "demo-reviewer-2",
    rating: 4,
    comment: "Smooth pickup and fair price. Would buy again.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8).toISOString(),
    reviewer: { username: "hana" },
  },
  {
    id: "demo-review-3",
    vendorId: demoVendor.id,
    reviewerId: "demo-reviewer-3",
    rating: 5,
    comment: "Fast response, very helpful.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
    reviewer: { username: "sami" },
  },
];

export function filterDemoListings(
  filters: {
    category?: string | null;
    priceMin?: string | null;
    priceMax?: string | null;
    location?: string | null;
    condition?: string | null;
    vendorId?: string | null;
  },
  sourceListings: typeof demoListings = demoListings
) {
  let results = [...sourceListings];

  const categoryAliases: Record<string, string[]> = {
    "Real Estate": ["Real Estate", "Properties", "Property"],
    "Mobile Devices": ["Mobile Devices", "Phones & Tablets"],
    "Home, Furniture & Appliances": ["Home, Furniture & Appliances", "Home Appliances"],
    "Clothing & Fashion": ["Clothing & Fashion", "Fashion"],
    "Beauty & Personal Care": ["Beauty & Personal Care", "Beauty"],
    "Commercial Equipment": ["Commercial Equipment", "Commercial Equipment & Tools"],
    "Leisure & Hobbies": ["Leisure & Hobbies", "Leisure & Activities"],
    "Kids & Baby Items": ["Kids & Baby Items", "Babies & Kids"],
    "Agriculture & Farming": ["Agriculture & Farming", "Food, Agriculture & Farming"],
    "Pets & Animals": ["Pets & Animals", "Animals & Pets"],
    "Construction, Machineries and Repairs": ["Construction, Machineries and Repairs", "Construction & Repair"],
  };

  if (filters.vendorId) {
    results = results.filter((item) => item.vendorId === filters.vendorId);
  }
  if (filters.category) {
    const accepted = categoryAliases[filters.category] || [filters.category];
    results = results.filter((item) => accepted.includes(item.category));
  }
  if (filters.condition) {
    results = results.filter((item) => item.condition === filters.condition);
  }
  if (filters.priceMin) {
    const min = Number(filters.priceMin);
    results = results.filter((item) => (item.price ?? 0) >= min);
  }
  if (filters.priceMax) {
    const max = Number(filters.priceMax);
    results = results.filter((item) => (item.price ?? 0) <= max);
  }
  if (filters.location) {
    const q = filters.location.toLowerCase();
    results = results.filter(
      (item) => item.city.toLowerCase().includes(q) || item.area.toLowerCase().includes(q)
    );
  }
  return results;
}

export function getDemoListingById(id: string) {
  return demoListings.find((item) => item.id === id) || null;
}

export function getDemoVendorBySlug(slug: string) {
  if (slug !== demoVendor.slug) return null;
  return {
    ...demoVendor,
    user: demoUser,
    listings: demoListings,
  };
}

export function getDemoReviewSummary() {
  const count = demoReviews.length;
  const average =
    count === 0 ? 0 : Math.round((demoReviews.reduce((sum, r) => sum + r.rating, 0) / count) * 10) / 10;
  return { count, average };
}
