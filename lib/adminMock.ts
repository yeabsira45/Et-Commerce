/** Extra mock users/listings for Super Admin tab (demo session). */

export type AdminMockUser = {
  id: string;
  username: string;
  email: string;
  role: "VENDOR";
  vendorId: string;
  storeName: string;
  slug: string;
  city: string;
  phone: string;
};

export type AdminMockListing = {
  id: string;
  title: string;
  ownerId: string;
  vendorId: string;
  status: string;
  price: number | null;
  city: string;
  area: string;
  category?: string;
  images: { url: string }[];
};

export const ADMIN_MOCK_USERS: AdminMockUser[] = [
  {
    id: "mock-owner-alem",
    username: "Alem Trading",
    email: "alem@mock.test",
    role: "VENDOR",
    vendorId: "mock-vendor-alem",
    storeName: "Alem Trading PLC",
    slug: "alem-trading-plc",
    city: "Addis Ababa",
    phone: "+251911222333",
  },
  {
    id: "mock-owner-hana",
    username: "Hana Home",
    email: "hana@mock.test",
    role: "VENDOR",
    vendorId: "mock-vendor-hana",
    storeName: "Hana Home Goods",
    slug: "hana-home-goods",
    city: "Hawassa",
    phone: "+251922333444",
  },
];

export const ADMIN_MOCK_LISTINGS: AdminMockListing[] = [
  {
    id: "mock-listing-sofa",
    title: "L-shaped Sofa (used)",
    ownerId: "mock-owner-alem",
    vendorId: "mock-vendor-alem",
    status: "ACTIVE",
    price: 18500,
    city: "Addis Ababa",
    area: "CMC",
    category: "Home, Furniture & Appliances",
    images: [{ url: "/errorpage.svg" }],
  },
  {
    id: "mock-listing-desk",
    title: "Office Desk",
    ownerId: "mock-owner-hana",
    vendorId: "mock-vendor-hana",
    status: "ACTIVE",
    price: 6500,
    city: "Hawassa",
    area: "Tabor",
    category: "Home, Furniture & Appliances",
    images: [{ url: "/errorpage.svg" }],
  },
];
