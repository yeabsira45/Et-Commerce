"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/components/ToastProvider";
import { sanitizeListingImageUrls } from "@/lib/listingImageRules";
import { normalizeSellDraftForStorage, type StorableSellDraft } from "@/lib/sellDraftStorage";
import {
  clearListingUndoStack,
  discardTopListingUndoFrame,
  finalizeListingDetailsForSubmit,
  logListingAudit,
  mergeDetectionRespectingUserEditedKeys,
  parseUndoDraftJson,
  peekListingUndoFrame,
  popListingUndoFrame,
  pushListingUndoFrame,
  runAtomicListingFormReset,
  runListingDetectionPrefill,
  validateListingDetailsForPublish,
  type ListingUndoReason,
} from "@/lib/listings/listingEngine";
import type { ListingDetectionModelDeps } from "@/lib/listings/listingDetectionPrefill";
import { normalizeBrandName } from "@/lib/listings/brandNormalize";
import { parseStorageString } from "@/lib/listings/storageFormat";
import { brandShowsBatteryHealthForMobile } from "@/lib/listings/electronicsBatteryPolicy";
import { useSearchParams, useRouter } from "next/navigation";
import { useAppContext } from "@/components/AppContext";
import { normalizePriceInput } from "@/lib/format";
import { SearchableSelect, type SelectGroup } from "@/components/form/SearchableSelect";
import {
  CATEGORY_SUBCATEGORIES,
  CONSTRUCTION_MACHINERIES_REPAIRS_CATEGORY,
  HOME_CATEGORIES,
  normalizeConstructionRepairSubcategory,
  getDefaultSubcategory,
  isValidSubcategoryForCategory,
  normalizeRealEstateSubcategory,
  REAL_ESTATE_RESIDENTIAL_SUBCATEGORIES,
} from "@/lib/categories";
import {
  BEAUTY_CONDITION_OPTIONS,
  BEAUTY_GENDER_OPTIONS,
  BEAUTY_HAIR_TYPES,
  BEAUTY_SKIN_TYPES,
  BEAUTY_SUBCATEGORIES,
  getBeautyBrands,
  getBeautyProductTypes,
} from "@/lib/beauty";
import "../../sell/sell.css";

type Draft = StorableSellDraft;

type Option = { value: string; label: string };

const COLORS = ["Black", "White", "Blue", "Red", "Green", "Silver", "Gray", "Gold", "Brown", "Beige"];
const LAPTOP_BRANDS = ["Apple", "Lenovo", "HP", "Dell", "Asus", "Acer", "MSI", "Microsoft"];
const ELECTRONICS_BRANDS = ["Samsung", "LG", "Sony", "TCL", "Hisense", "Apple", "Dell", "Lenovo", "HP", "Asus", "Popular Electronics", "Ethelco", "Local Electronics Brand", "Other"];
const HOME_APPLIANCE_BRANDS = ["LG", "Samsung", "Whirlpool", "Bosch", "GE", "KitchenAid", "Miele", "Panasonic", "Philips", "Popular Electronics", "Ethelco", "Local Electronics Brand", "Other"];
const FURNITURE_BRANDS = ["IKEA", "Ashley", "Habesha Furniture", "Nilkamal", "Other"];
const ETHIOPIAN_ELECTRONICS_BRANDS = ["Popular Electronics", "Ethelco", "Local Electronics Brand"];
const FASHION_SHARED_BRANDS = [
  "Bella Style",
  "Mafi Mafi",
  "Undken",
  "Fikirte Addis (Yefikir Design)",
  "Meron Addis Ababa",
  "Gofere Sportswear",
  "Local Fashion Brand",
  "Made in Ethiopia",
];

const TV_AUDIO_BRAND_MAP: Record<string, string[]> = {
  Televisions: ["Samsung", "LG", "Sony", "TCL", "Hisense", "Panasonic", "Sharp", "Philips", "Vizio", ...ETHIOPIAN_ELECTRONICS_BRANDS, "Other"],
  "Home Theater Systems": ["Sony", "Samsung", "LG", "Bose", "Yamaha", "JBL", "Panasonic", "Popular Electronics", "Ethelco", "Local Electronics Brand", "Other"],
  Speakers: ["JBL", "Bose", "Sony", "Yamaha", "Samsung", "LG", "Klipsch", "Polk Audio", "Beats", "Marshall", "Harman Kardon", "Popular Electronics", "Ethelco", "Local Electronics Brand", "Other"],
  Headphones: ["Sony", "Bose", "Sennheiser", "Apple", "Samsung", "JBL", "Beats", "Audio-Technica", "Anker Soundcore", "Popular Electronics", "Ethelco", "Local Electronics Brand", "Other"],
  "DVD & Media Players": ["Sony", "Samsung", "LG", "Panasonic", "Philips", "Other"],
};

const HOME_APPLIANCE_TYPE_OPTIONS = ["Washer", "Dryer", "Refrigerator", "Oven", "Microwave", "Other"];
const FURNITURE_ITEM_OPTIONS = ["Sofa", "Table", "Chair", "Bed", "Wardrobe", "Desk", "Shelf", "Other"];
const FURNITURE_MATERIAL_OPTIONS = ["Wood", "Metal", "Plastic", "Leather", "Fabric", "Other"];
/** Laptop / desktop OS picker (names + version numbers only; no release years). */
const LAPTOP_DESKTOP_OS_OPTIONS = [
  "Windows 7",
  "Windows 8",
  "Windows 8.1",
  "Windows 10",
  "Windows 11",
  "Mac OS X 10.6 Snow Leopard",
  "Mac OS X 10.7 Lion",
  "Mac OS X 10.8 Mountain Lion",
  "Mac OS X 10.9 Mavericks",
  "Mac OS X 10.10 Yosemite",
  "Mac OS X 10.11 El Capitan",
  "macOS 10.12 Sierra",
  "macOS 10.13 High Sierra",
  "macOS 10.14 Mojave",
  "macOS 10.15 Catalina",
  "macOS 11 Big Sur",
  "macOS 12 Monterey",
  "macOS 13 Ventura",
  "macOS 14 Sonoma",
  "macOS 15 Sequoia",
  "Solaris 11.4",
  "IBM AIX",
  "HP-UX",
  "FreeBSD 14",
  "OpenBSD 7",
  "NetBSD 10",
  "ChromeOS",
  "Other",
];
const GPU_VENDOR_RADIO_OPTIONS = ["NVIDIA", "AMD", "Intel", "Other"];
const MOBILE_DISPLAY_TYPE_OPTIONS = ["LCD", "LED", "IPS LCD", "AMOLED", "Super AMOLED", "OLED", "Retina", "TFT", "Other"];
const COMPUTER_ACCESSORY_TYPE_OPTIONS = [
  "Mouse",
  "Keyboard",
  "Headset",
  "Speakers",
  "Webcam",
  "USB Hub",
  "External Hard Drive",
  "SSD",
  "Flash Drive",
  "Memory Card",
  "Laptop Charger",
  "Cooling Pad",
  "Monitor",
  "Printer",
  "Scanner",
  "Microphone",
  "Other",
];
const COMPUTER_ACCESSORY_BRANDS_ETHIOPIA = [
  "HP",
  "Dell",
  "Lenovo",
  "Asus",
  "Acer",
  "TP-Link",
  "Samsung",
];
const COMPUTER_ACCESSORY_BRANDS_INTERNATIONAL = [
  "Logitech",
  "Razer",
  "Corsair",
  "Kingston",
  "SanDisk",
  "Sony",
  "Apple",
  "Microsoft",
  "Huawei",
  "Xiaomi",
  "Google",
  "LG",
  "Panasonic",
  "Toshiba",
  "Fujitsu",
  "VAIO",
  "Chuwi",
  "Teclast",
  "SteelSeries",
  "HyperX",
  "Redragon",
  "Logitech G",
  "ASUS ROG",
  "MSI Gaming",
  "Alienware",
  "AORUS",
  "Glorious",
  "Cooler Master",
  "Zowie",
  "Roccat",
  "Thermaltake",
  "NZXT",
  "Deepcool",
  "Cougar",
  "GameSir",
  "PowerA",
  "Seagate",
  "Western Digital",
  "Crucial",
  "ADATA",
  "Lexar",
  "PNY",
  "Transcend",
  "TeamGroup",
  "Silicon Power",
  "Patriot",
  "Intel",
  "Kioxia",
  "D-Link",
  "Netgear",
  "Tenda",
  "Ubiquiti",
  "MikroTik",
  "Cisco",
  "ZTE",
  "Linksys",
  "Asus Networking",
  "Google Nest",
  "Eero",
  "Anker",
  "UGREEN",
  "Baseus",
  "Belkin",
  "Aukey",
  "Orico",
  "Sabrent",
  "Vention",
  "Cable Matters",
  "Choetech",
  "Spigen",
  "ESR",
  "Rock",
  "Hoco",
  "Remax",
  "JBL",
  "Bose",
  "Sennheiser",
  "Audio-Technica",
  "Beats",
  "AKG",
  "Skullcandy",
  "Anker Soundcore",
  "Marshall",
  "Bang & Olufsen",
  "Edifier",
  "Harman Kardon",
  "Shure",
  "Plantronics",
  "Epson",
  "Canon",
  "Brother",
  "Pantum",
  "Xerox",
  "Ricoh",
  "Kyocera",
  "Lexmark",
  "OKI",
  "BenQ",
  "AOC",
  "MSI",
  "Gigabyte",
  "ViewSonic",
  "Philips",
];
const ACCESSORY_TYPE_BRAND_CATEGORY_MAP: Record<string, string[]> = {
  Mouse: ["Logitech", "Logitech G", "Razer", "SteelSeries", "HP", "Dell", "Redragon", "Corsair", "Glorious"],
  Keyboard: ["Logitech", "Logitech G", "Razer", "SteelSeries", "Corsair", "Redragon", "HP", "Dell", "HyperX"],
  Headset: ["JBL", "Sony", "Bose", "Sennheiser", "SteelSeries", "Razer", "HyperX", "Plantronics"],
  Speakers: ["JBL", "Sony", "Bose", "Edifier", "Marshall", "Harman Kardon", "LG"],
  Webcam: ["Logitech", "HP", "Dell", "Microsoft", "Razer", "A4Tech"],
  "USB Hub": ["UGREEN", "Anker", "Baseus", "Belkin", "Orico", "TP-Link"],
  "External Hard Drive": ["Seagate", "Western Digital", "Toshiba", "Samsung", "SanDisk", "ADATA"],
  SSD: ["Samsung", "Kingston", "Crucial", "ADATA", "Western Digital", "SanDisk", "Kioxia"],
  "Flash Drive": ["SanDisk", "Kingston", "Transcend", "Lexar", "ADATA", "PNY"],
  "Memory Card": ["SanDisk", "Kingston", "Samsung", "Lexar", "PNY", "Transcend"],
  "Laptop Charger": ["HP", "Dell", "Lenovo", "Asus", "Acer", "Apple"],
  "Cooling Pad": ["Cooler Master", "Deepcool", "Thermaltake", "NZXT", "Cougar"],
  Monitor: ["Samsung", "LG", "Dell", "HP", "Asus", "Acer", "BenQ", "AOC", "ViewSonic"],
  Printer: ["HP", "Canon", "Epson", "Brother", "Pantum", "Xerox"],
  Scanner: ["Canon", "Epson", "Brother", "HP", "Fujitsu"],
  Microphone: ["Shure", "Audio-Technica", "Razer", "HyperX", "Sony", "JBL"],
};

const CATEGORY_BRAND_OPTIONS: Record<string, string[]> = {
  "Men's Clothing": ["Nike", "Adidas", "Puma", "Under Armour", "Levi's", "Zara", "H&M", "Guess", ...FASHION_SHARED_BRANDS, "Other"],
  "Women's Clothing": ["Nike", "Adidas", "Puma", "Zara", "H&M", "Forever 21", "Mango", "Guess", ...FASHION_SHARED_BRANDS, "Other"],
  "Shoes & Footwear": ["Nike", "Adidas", "Puma", "Reebok", "Converse", "Skechers", "Local Shoe Maker", "Other"],
  "Bags & Backpacks": ["Nike", "Adidas", "Samsonite", "Herschel", "Eastpak", "Local Bag Maker", "Other"],
  Watches: ["Casio", "Seiko", "Citizen", "Rolex", "Omega", "Fossil", "Timex", "Local Watch Brand", "Other"],
  Jewelry: ["Pandora", "Swarovski", "Tiffany & Co.", "Cartier", "Made in Ethiopia", "Other"],
  Accessories: ["H&M", "Zara", "Nike", "Adidas", ...FASHION_SHARED_BRANDS, "Other"],
  /** @deprecated legacy category label — prefer CONSTRUCTION_MACHINERIES_REPAIRS_CATEGORY */
  "Construction & Repair": ["Bosch", "Makita", "Total", "Stanley", "Local Hardware Distributor", "Other"],
  [CONSTRUCTION_MACHINERIES_REPAIRS_CATEGORY]: ["Bosch", "Makita", "Total", "Stanley", "Local Hardware Distributor", "Other"],
  "Commercial Equipment": ["Caterpillar", "Bosch", "Makita", "KitchenAid", "Local Equipment Supplier", "Other"],
  "Leisure & Hobbies": ["Nike", "Adidas", "Yamaha", "Fender", "Wilson", "Local Sports Shop", "Other"],
  "Kids & Baby Items": ["Chicco", "Fisher-Price", "Huggies", "Pampers", "Made in Ethiopia", "Other"],
  "Agriculture & Farming": ["John Deere", "Kubota", "Mahindra", "YTO", "Local Agro Dealer", "Other"],
  "Pets & Animals": ["Royal Canin", "Pedigree", "Whiskas", "Local Pet Store", "Other"],
};

const PHONE_BRAND_GROUPS: SelectGroup[] = [
  { label: "Suggestions", options: ["Apple", "Samsung", "Xiaomi", "OnePlus", "Google Pixel", "Tecno", "Infinix", "itel"].map(toOption) },
  {
    label: "All Brands",
    options: [
      "Apple",
      "Samsung",
      "Xiaomi",
      "OnePlus",
      "Vivo",
      "Oppo",
      "Realme",
      "Tecno",
      "Infinix",
      "itel",
      "Google Pixel",
      "Huawei",
      "Nokia",
      "Nothing",
      "Honor",
      "Motorola",
      "Asus",
      "Sony",
      "Other",
    ].map(toOption),
  },
];

const VEHICLE_BRAND_GROUPS: SelectGroup[] = [
  { label: "Suggestions", options: ["Toyota", "BYD", "Mercedes-Benz", "Suzuki", "Hyundai", "Honda", "Volkswagen", "Nissan", "Kia"].map(toOption) },
  {
    label: "All Brands",
    options: [
      "Toyota",
      "Nissan",
      "Honda",
      "Suzuki",
      "Hyundai",
      "Kia",
      "Ford",
      "Chevrolet",
      "BMW",
      "Mercedes-Benz",
      "Audi",
      "Volkswagen",
      "Peugeot",
      "Renault",
      "Mazda",
      "Mitsubishi",
      "Isuzu",
      "Subaru",
      "Lexus",
      "Tesla",
      "BYD",
      "Chery",
      "Geely",
      "Changan",
      "Great Wall",
      "Haval",
      "Dongfeng",
      "GAC",
      "BAIC",
      "FAW",
      "Wuling",
      "Denza",
      "Foton",
      "JMC",
      "Sinotruk",
      "Other",
    ].map(toOption),
  },
];

const MODEL_SUGGESTIONS: Record<string, string[]> = {
  Apple: ["iPhone 13", "iPhone 14", "iPhone 15 Pro", "AirPods Pro", "Watch Series 9", "MacBook Air M2", "MacBook Pro 14"],
  Samsung: ["Galaxy S21", "Galaxy S22 Ultra", "Galaxy A54", "Galaxy Book 3", "Q60B", "TU7000", "HW-Q600C"],
  Xiaomi: ["Redmi Note 13", "Xiaomi 13T"],
  "Google Pixel": ["Pixel 7", "Pixel 8 Pro"],
  Toyota: ["Corolla", "Yaris", "Vitz", "RAV4", "Hilux", "Land Cruiser"],
  Honda: ["Civic", "Accord", "CR-V"],
  Hyundai: ["Elantra", "Tucson", "Santa Fe"],
  BYD: ["Qin", "Song Plus", "Dolphin"],
  Dell: ["XPS 13", "Latitude 5420", "Inspiron 15"],
  HP: ["EliteBook 840", "Pavilion 15", "Victus 16"],
  Lenovo: ["ThinkPad T14", "IdeaPad 5", "Legion 5"],
  Asus: ["ROG Zephyrus G14", "Zenbook 14", "Vivobook 15"],
  Acer: ["Aspire 5", "Nitro 5", "Swift Go 14"],
  Sony: ["Bravia X75K", "HT-S40R", "WH-1000XM5"],
  LG: ["C2 OLED", "QNED80", "SN5Y"],
  TCL: ["P735", "C645"],
  Hisense: ["A6H", "U7K"],
  Panasonic: ["TH-55MX650", "SC-HTB490"],
  Bose: ["SoundLink Flex", "QuietComfort 45"],
  Beats: ["Studio3", "Solo 4"],
  Philips: ["TAB5309", "TAH4209"],
  "Popular Electronics": ["House Brand TV", "House Brand Speaker"],
  Ethelco: ["Imported LED TV", "Imported Refrigerator"],
  "TP-Link": ["Archer C6", "Archer AX23", "TL-WR840N"],
  MikroTik: ["hAP ac2", "hEX S", "RB3011UiAS"],
  Cisco: ["RV340", "CBS110-8T-D", "AIR-AP1832I"],
  "D-Link": ["DIR-825", "DGS-1016D", "DIR-X1560"],
  Huawei: ["B315", "AX3", "S5735-L24T4X"],
  Canon: ["PIXMA G3411", "imageRUNNER 2425", "LiDE 300"],
  Epson: ["EcoTank L3250", "L805", "Perfection V39"],
  Brother: ["DCP-T420W", "HL-L2350DW", "ADS-2200"],
  Microsoft: ["Microsoft 365", "Office Home 2024", "Windows 11 Pro"],
  Adobe: ["Photoshop", "Illustrator", "Premiere Pro"],
  Autodesk: ["AutoCAD", "Revit", "3ds Max"],
  Kaspersky: ["Kaspersky Standard", "Kaspersky Plus"],
  Nike: ["Air Force 1", "Air Max 90"],
  Adidas: ["Ultraboost", "Stan Smith"],
  JBL: ["Charge 5", "Flip 6", "PartyBox 110", "Tune 760NC"],
};

const VEHICLE_MODEL_SUGGESTIONS: Record<string, string[]> = {
  Toyota: ["Corolla", "Yaris", "Vitz", "Camry", "RAV4", "Highlander", "Fortuner", "Land Cruiser", "Prado", "Hilux", "Hiace"],
  Nissan: ["Sunny", "Altima", "Sentra", "X-Trail", "Qashqai", "Patrol", "Navara", "Urvan"],
  Honda: ["Civic", "Accord", "City", "CR-V", "HR-V", "Pilot"],
  Suzuki: ["Alto", "Swift", "Dzire", "Celerio", "Baleno", "Ertiga", "Vitara", "Jimny", "S-Presso"],
  Hyundai: ["Elantra", "Accent", "Sonata", "Tucson", "Santa Fe", "Creta", "Palisade"],
  Kia: ["Rio", "Cerato", "K5", "Sportage", "Sorento", "Seltos"],
  Ford: ["Focus", "Fusion", "Escape", "Explorer", "Ranger", "F-150"],
  Chevrolet: ["Spark", "Aveo", "Cruze", "Malibu", "Captiva", "Equinox", "Silverado"],
  BMW: ["1 Series", "3 Series", "5 Series", "7 Series", "X1", "X3", "X5", "X6"],
  "Mercedes-Benz": ["A-Class", "C-Class", "E-Class", "S-Class", "GLA", "GLC", "GLE", "GLS", "G-Class"],
  Audi: ["A3", "A4", "A6", "A8", "Q3", "Q5", "Q7", "Q8"],
  Volkswagen: ["Polo", "Golf", "Passat", "Tiguan", "Touareg"],
  Peugeot: ["208", "301", "308", "3008", "5008"],
  Renault: ["Kwid", "Logan", "Duster", "Koleos"],
  Mazda: ["Mazda 2", "Mazda 3", "Mazda 6", "CX-3", "CX-5", "CX-9"],
  Mitsubishi: ["Lancer", "Outlander", "Pajero", "Montero Sport", "L200"],
  Isuzu: ["D-Max", "MU-X"],
  Subaru: ["Impreza", "Legacy", "Forester", "Outback"],
  Lexus: ["RX", "NX", "LX", "GX", "ES", "IS"],
  Tesla: ["Model 3", "Model S", "Model X", "Model Y"],
  BYD: ["F3", "Qin", "Qin Plus", "Song", "Song Plus", "Song Pro", "Yuan Plus", "Yuan Up", "Tang", "Han", "Dolphin", "Seagull", "Seal"],
  Chery: ["Arrizo 5", "Arrizo 6", "Tiggo 2", "Tiggo 4", "Tiggo 7", "Tiggo 8"],
  Geely: ["Emgrand", "Coolray", "Atlas"],
  Changan: ["Alsvin", "Eado", "CS35", "CS55", "CS75"],
  "Great Wall": ["Wingle", "Poer"],
  Haval: ["H2", "H6", "Jolion"],
  Dongfeng: ["Rich", "AX7"],
  GAC: ["GS3", "GS4", "GS8"],
  BAIC: ["X25", "X35", "BJ40"],
  FAW: ["V2", "V5", "Bestune T77"],
  Wuling: ["Hongguang Mini EV", "Almaz"],
  Denza: ["D9", "N7"],
  Foton: ["Tunland", "View"],
  JMC: ["Vigus", "Boarding"],
  Sinotruk: ["Howo"],
};

type ElectronicsConfig = {
  brandOptions?: string[];
  brandGroups?: SelectGroup[];
  modelSuggestions?: Record<string, string[]>;
  brandLabel?: string;
  modelLabel?: string;
};

function uniqueNormalizedBrands(values: string[]): string[] {
  const seen = new Map<string, string>();
  values.forEach((value) => {
    const normalized = normalizeBrandName(value);
    if (!normalized) return;
    const key = normalized.toLowerCase();
    if (!seen.has(key)) seen.set(key, normalized);
  });
  return Array.from(seen.values());
}

function buildBrandGroups(priorityBrands: string[] = []): SelectGroup[] {
  const prioritized = uniqueNormalizedBrands(priorityBrands).filter((brand) => brand !== "Other");
  const ethiopia = uniqueNormalizedBrands([...prioritized, ...COMPUTER_ACCESSORY_BRANDS_ETHIOPIA]).filter((brand) => brand !== "Other");
  const international = uniqueNormalizedBrands(COMPUTER_ACCESSORY_BRANDS_INTERNATIONAL).filter((brand) => !ethiopia.includes(brand) && brand !== "Other");
  const groups: SelectGroup[] = [];
  if (prioritized.length > 0) {
    groups.push({ label: "Suggested for Selected Type", options: [...prioritized, "Other"].map(toOption) });
  }
  groups.push({ label: "Popular in Ethiopia", options: [...ethiopia, "Other"].map(toOption) });
  groups.push({ label: "International Brands", options: [...international, "Other"].map(toOption) });
  return groups;
}

const SMARTPHONE_MODEL_SUGGESTIONS: Record<string, string[]> = {
  Apple: ["iPhone 6", "iPhone 6 Plus", "iPhone 6s", "iPhone 6s Plus", "iPhone 7", "iPhone 7 Plus", "iPhone 8", "iPhone 8 Plus", "iPhone X", "iPhone XR", "iPhone XS", "iPhone XS Max", "iPhone 11", "iPhone 11 Pro", "iPhone 11 Pro Max", "iPhone 12", "iPhone 12 Mini", "iPhone 12 Pro", "iPhone 12 Pro Max", "iPhone 13", "iPhone 13 Mini", "iPhone 13 Pro", "iPhone 13 Pro Max", "iPhone 14", "iPhone 14 Plus", "iPhone 14 Pro", "iPhone 14 Pro Max", "iPhone 15", "iPhone 15 Plus", "iPhone 15 Pro", "iPhone 15 Pro Max", "iPhone 16", "iPhone 16 Plus", "iPhone 16 Pro", "iPhone 16 Pro Max", "Other"],
  Samsung: ["Galaxy S6", "Galaxy S6 Edge", "Galaxy S7", "Galaxy S7 Edge", "Galaxy S8", "Galaxy S8+", "Galaxy S9", "Galaxy S9+", "Galaxy S10", "Galaxy S10+", "Galaxy S10e", "Galaxy S20", "Galaxy S20+", "Galaxy S20 Ultra", "Galaxy S21", "Galaxy S21+", "Galaxy S21 Ultra", "Galaxy S22", "Galaxy S22+", "Galaxy S22 Ultra", "Galaxy S23", "Galaxy S23+", "Galaxy S23 Ultra", "Galaxy S24", "Galaxy S24+", "Galaxy S24 Ultra", "Galaxy S25", "Galaxy S25+", "Galaxy S25 Ultra", "Galaxy A10", "Galaxy A20", "Galaxy A30", "Galaxy A50", "Galaxy A51", "Galaxy A52", "Galaxy A53", "Galaxy A54", "Galaxy A55", "Galaxy Z Fold3", "Galaxy Z Fold4", "Galaxy Z Fold5", "Galaxy Z Fold6", "Galaxy Z Flip3", "Galaxy Z Flip4", "Galaxy Z Flip5", "Galaxy Z Flip6", "Other"],
  Xiaomi: ["Mi 9", "Mi 10", "Mi 11", "Xiaomi 12", "Xiaomi 12T", "Xiaomi 13", "Xiaomi 13T", "Xiaomi 14", "Xiaomi 14T", "Redmi Note 10", "Redmi Note 11", "Redmi Note 12", "Redmi Note 13", "Redmi Note 14", "POCO X3", "POCO X4", "POCO X5", "POCO X6", "POCO F3", "POCO F4", "POCO F5", "POCO F6", "Other"],
  OnePlus: ["OnePlus 6", "OnePlus 6T", "OnePlus 7", "OnePlus 7 Pro", "OnePlus 8", "OnePlus 8 Pro", "OnePlus 9", "OnePlus 9 Pro", "OnePlus 10 Pro", "OnePlus 11", "OnePlus 12", "OnePlus 13", "OnePlus 14", "OnePlus 15", "Nord", "Nord 2", "Nord 3", "Nord 4", "Other"],
  "Google Pixel": ["Pixel 4", "Pixel 5", "Pixel 6", "Pixel 6 Pro", "Pixel 7", "Pixel 7 Pro", "Pixel 8", "Pixel 8 Pro", "Pixel 9", "Pixel 9 Pro", "Other"],
  Tecno: ["Camon 15", "Camon 16", "Camon 17", "Camon 18", "Camon 19", "Camon 20", "Camon 30", "Spark 6", "Spark 7", "Spark 8", "Spark 9", "Spark 10", "Spark 20", "Spark 30", "Phantom X", "Phantom V Fold", "Other"],
  Infinix: ["Hot 10", "Hot 11", "Hot 12", "Hot 20", "Hot 30", "Hot 40", "Hot 50", "Note 10", "Note 11", "Note 12", "Note 30", "Note 40", "Note 50", "Zero 20", "Zero 30", "Zero 40", "Other"],
  itel: ["A16", "A23", "A56", "A60", "A70", "P36", "P38", "P40", "P55", "S16", "S17", "S23", "Other"],
  Huawei: ["P30", "P40", "P50", "P60 Pro", "Mate 30", "Mate 40", "Mate 50", "Nova 7i", "Nova 8i", "Nova 9", "Nova 10", "Nova 11i", "Nova 12i", "Pura 70", "Other"],
  Nokia: ["5.3", "6.1", "7.2", "G20", "G21", "G42", "XR21", "C30", "C31", "C32", "Other"],
  Vivo: ["V20", "V21", "V23", "V25", "V27", "V29", "V30", "Y20", "Y21", "Y33", "Y36", "Y100", "Other"],
  Oppo: ["A15", "A16", "A17", "A57", "A78", "A98", "Reno 8", "Reno 10", "Reno 11", "Reno 12", "Other"],
  Realme: ["C11", "C21", "C25", "C30", "C33", "C35", "C55", "C67", "C75", "11 Pro", "12 Pro", "Other"],
  Nothing: ["Phone (1)", "Phone (2)", "Phone (2a)", "Other"],
  Honor: ["X7", "X8", "X9a", "X9b", "X9c", "Magic5", "Magic6 Lite", "Magic7 Pro", "Other"],
  Motorola: ["Moto G Power", "Moto G Stylus", "Moto G84", "Moto G85", "Edge 30", "Edge 40", "Edge 50", "Other"],
};

const FEATURE_PHONE_MODEL_SUGGESTIONS: Record<string, string[]> = {
  Nokia: [
    "105",
    "106",
    "110",
    "110 4G",
    "120",
    "125",
    "130",
    "150",
    "210",
    "215 4G",
    "220 4G",
    "225 4G",
    "230",
    "2720 Flip",
    "5310",
    "5710 XpressAudio",
    "6310"
  ],

  Tecno: [
    "T301",
    "T302",
    "T312",
    "T352",
    "T372",
    "T454",
    "T468",
    "T472",
    "T528",
    "T529",
    "T901"
  ],

  Infinix: [
    "F110",
    "F115",
    "F118",
    "F122",
    "F125",
    "F160",
    "F180"
  ],

  itel: [
    "IT2160",
    "IT2163",
    "IT2170",
    "IT2171",
    "IT2173",
    "IT2175",
    "IT2180",
    "IT2190"
  ],

  Samsung: [
    "Guru Music 2",
    "Guru 1200",
    "Guru 1215"
  ],

  QMobile: [
    "E1000",
    "E2000",
    "E4000"
  ],

  Gionee: [
    "L800",
    "L900"
  ],

  Huawei: [
    "Y3 Classic"
  ],

  LG: [
    "A100",
    "B200"
  ]
};

const TABLET_MODEL_SUGGESTIONS: Record<string, string[]> = {
  Apple: [
    "iPad 5th Gen",
    "iPad 6th Gen",
    "iPad 7th Gen",
    "iPad 8th Gen",
    "iPad 9th Gen",
    "iPad 10th Gen",
    "iPad 11th Gen",
    "iPad Mini 5",
    "iPad Mini 6",
    "iPad Mini 7",
    "iPad Air 3",
    "iPad Air 4",
    "iPad Air 5",
    "iPad Air M2",
    "iPad Pro 10.5",
    "iPad Pro 11",
    "iPad Pro 12.9",
    "iPad Pro 13"
  ],

  Samsung: [
    "Galaxy Tab A7",
    "Galaxy Tab A7 Lite",
    "Galaxy Tab A8",
    "Galaxy Tab A9",
    "Galaxy Tab A9+",
    "Galaxy Tab S6 Lite",
    "Galaxy Tab S7",
    "Galaxy Tab S7+",
    "Galaxy Tab S7 FE",
    "Galaxy Tab S8",
    "Galaxy Tab S8+",
    "Galaxy Tab S8 Ultra",
    "Galaxy Tab S9",
    "Galaxy Tab S9+",
    "Galaxy Tab S9 Ultra",
    "Galaxy Tab S9 FE",
    "Galaxy Tab S9 FE+",
    "Galaxy Tab S10+",
    "Galaxy Tab S10 Ultra"
  ],

  Lenovo: [
    "Tab M8",
    "Tab M9",
    "Tab M10",
    "Tab M10 Plus",
    "Tab M11",
    "Tab P11",
    "Tab P11 Plus",
    "Tab P11 Pro",
    "Tab P12",
    "Tab P12 Pro",
    "Legion Tab",
    "Yoga Tab 11",
    "Yoga Tab 13"
  ],

  Huawei: [
    "MatePad T8",
    "MatePad T10",
    "MatePad T10s",
    "MatePad SE",
    "MatePad 10.4",
    "MatePad 11",
    "MatePad 11.5",
    "MatePad Air",
    "MatePad Pro 10.8",
    "MatePad Pro 11",
    "MatePad Pro 12.6"
  ],

  Xiaomi: [
    "Pad 5",
    "Pad 5 Pro",
    "Pad 6",
    "Pad 6 Pro",
    "Pad 7",
    "Pad 7 Pro",
    "Redmi Pad",
    "Redmi Pad SE",
    "Redmi Pad Pro"
  ],

  Tecno: [
    "MegaPad 10",
    "MegaPad 11"
  ],

  Infinix: [
    "XPad",
    "XPad 10"
  ],

  Amazon: [
    "Fire 7",
    "Fire HD 8",
    "Fire HD 10",
    "Fire Max 11"
  ],

  Microsoft: [
    "Surface Go 2",
    "Surface Go 3",
    "Surface Go 4",
    "Surface Pro 7",
    "Surface Pro 8",
    "Surface Pro 9",
    "Surface Pro 10"
  ],

  Nokia: [
    "T10",
    "T20",
    "T21"
  ],

  Oppo: [
    "Pad Air",
    "Pad 2"
  ],

  OnePlus: [
    "Pad",
    "Pad 2"
  ],

  Realme: [
    "Pad",
    "Pad Mini",
    "Pad X"
  ],

  Google: [
    "Pixel Tablet"
  ]
};

const SMARTWATCH_MODEL_SUGGESTIONS: Record<string, string[]> = {
  Apple: [
    "Watch Series 4",
    "Watch Series 5",
    "Watch Series 6",
    "Watch Series 7",
    "Watch Series 8",
    "Watch Series 9",
    "Watch Series 10",
    "Watch SE",
    "Watch SE 2",
    "Watch Ultra",
    "Watch Ultra 2"
  ],

  Samsung: [
    "Galaxy Watch Active",
    "Galaxy Watch Active 2",
    "Galaxy Watch 3",
    "Galaxy Watch 4",
    "Galaxy Watch 4 Classic",
    "Galaxy Watch 5",
    "Galaxy Watch 5 Pro",
    "Galaxy Watch6",
    "Galaxy Watch6 Classic",
    "Galaxy Watch7",
    "Galaxy Watch Ultra"
  ],

  Huawei: [
    "Watch GT 2",
    "Watch GT 2 Pro",
    "Watch GT 3",
    "Watch GT 3 Pro",
    "Watch GT 4",
    "Watch Fit",
    "Watch Fit 2",
    "Watch Fit 3",
    "Watch 3",
    "Watch 3 Pro"
  ],

  Amazfit: [
    "GTR 2",
    "GTR 3",
    "GTR 4",
    "GTS 2",
    "GTS 3",
    "GTS 4",
    "Bip U",
    "Bip 3",
    "Bip 5",
    "T-Rex",
    "T-Rex Pro",
    "T-Rex 2"
  ],

  Xiaomi: [
    "Mi Watch",
    "Mi Watch Lite",
    "Watch S1",
    "Watch S1 Active",
    "Watch 2",
    "Watch 2 Pro",
    "Redmi Watch 2",
    "Redmi Watch 3",
    "Redmi Watch 4"
  ],

  Garmin: [
    "Forerunner 55",
    "Forerunner 245",
    "Forerunner 255",
    "Forerunner 965",
    "Fenix 6",
    "Fenix 7",
    "Venu",
    "Venu 2",
    "Venu 3"
  ],

  Fitbit: [
    "Versa 2",
    "Versa 3",
    "Versa 4",
    "Sense",
    "Sense 2",
    "Charge 4",
    "Charge 5",
    "Charge 6",
    "Inspire 2",
    "Inspire 3"
  ],

  Realme: [
    "Watch",
    "Watch 2",
    "Watch 2 Pro",
    "Watch 3",
    "Watch S",
    "Watch S Pro"
  ],

  Oppo: [
    "Watch",
    "Watch 2",
    "Watch 3",
    "Watch Free"
  ],

  OnePlus: [
    "Watch",
    "Watch 2"
  ],

  Tecno: [
    "Watch Pro",
    "Watch 2"
  ],

  Infinix: [
    "XWatch 1",
    "XWatch 3"
  ]
};

const LAPTOP_MODEL_SUGGESTIONS: Record<string, string[]> = {
  Apple: ["MacBook Air M2", "MacBook Air M3", "MacBook Pro 14", "MacBook Pro 16"],
  Dell: ["Dell XPS Series", "Dell Inspiron Series","Dell Latitude Series","Dell Vostro Series","Dell Precision Series","Dell G Series","Dell Alienware Series"],
  HP: ["EliteBook Series", "Pavilion Series", "Envy Series", "Spectre Series", "Victus Series", "Omen Series", "ZBook Series"],
Lenovo: ["ThinkPad Series", "IdeaPad Series", "Legion Series", "Yoga Series", "ThinkBook Series", "LOQ Series", "Miix Series", "Essential Series"],
Asus: ["ROG Zephyrus Series", "ROG Strix Series", "ROG Flow Series", "Zenbook Series", "Vivobook Series", "TUF Gaming Series", "ExpertBook Series", "ProArt Series"],
Acer: ["Aspire Series", "Swift Series", "Nitro Series", "Predator Series", "Spin Series", "TravelMate Series", "Chromebook Series", "Vero Series"],
MSI: ["Stealth Series", "Raider Series", "Titan Series", "Crosshair Series", "Cyborg Series", "Katana Series", "Modern Series", "Prestige Series", "Summit Series", "Vector Series"],
Microsoft: ["Surface Laptop Series", "Surface Laptop Go Series", "Surface Laptop Studio Series", "Surface Pro Series", "Surface Book Series", "Surface Go Series", "Surface Studio Series", "Surface Neo Series", "Surface Duo Series"],

};

const DESKTOP_MODEL_SUGGESTIONS: Record<string, string[]> = {
Dell: ["OptiPlex Series", "Inspiron Desktop Series", "XPS Desktop Series", "Alienware Aurora Series"],
HP: ["ProDesk Series", "EliteDesk Series", "Pavilion Desktop Series", "OMEN Desktop Series"],
Lenovo: ["ThinkCentre Series", "IdeaCentre Series", "Legion Tower Series"],
Apple: ["iMac Series", "Mac Mini Series", "Mac Studio Series"],
Asus: ["ROG Strix Series", "Asus Desktop Series"],
Acer: ["Aspire Desktop Series", "Nitro Desktop Series", "Predator Desktop Series"],

};

const ACCESSORY_MODEL_SUGGESTIONS: Record<string, string[]> = {
  Logitech: [
    "MX Series",
    "K Series Keyboards",
    "M Series Mice",
    "G Pro Series",
    "G Series Gaming Headsets",
    "G Series Gaming Keyboards",
    "Brio Webcam Series",
    "C Series Webcam"
  ],
  Razer: [
    "DeathAdder Series",
    "Basilisk Series",
    "Viper Series",
    "BlackWidow Series",
    "Huntsman Series",
    "Kraken Headset Series",
    "Barracuda Series"
  ],
  Corsair: [
    "K Series Keyboards",
    "M Series Mice",
    "HS Series Headsets",
    "Void Headset Series",
    "Dark Core Mouse Series",
    "Ironclaw Series"
  ],
  HP: [
    "M Series Monitors",
    "E Series Monitors",
    "X Series Accessories",
    "HP Pavilion Accessories",
    "HP OMEN Gaming Accessories"
  ],
  Dell: [
    "P Series Monitors",
    "UltraSharp Monitor Series",
    "SE Series Monitors",
    "Alienware Gaming Accessories",
    "KM Series Keyboard & Mouse Combos"
  ],
  Lenovo: [
    "ThinkVision Monitor Series",
    "Legion Gaming Accessories",
    "ThinkPad Accessories",
    "300 Series Accessories"
  ],
  A4Tech: [
    "FG Series",
    "Bloody Gaming Series",
    "F Series Keyboards",
    "G Series Mice"
  ]
};

const NETWORKING_MODEL_SUGGESTIONS: Record<string, string[]> = {
  "TP-Link": [
    "Archer Series",
    "Deco Mesh Series",
    "TL-WR Router Series",
    "JetStream Switch Series",
    "Omada Business Series"
  ],
  MikroTik: [
    "hAP Series",
    "hEX Series",
    "RB RouterBOARD Series",
    "CCR Cloud Core Router Series",
    "CRS Switch Series"
  ],
  Cisco: [
    "RV Series Routers",
    "CBS Business Switch Series",
    "Catalyst Switch Series",
    "Aironet Access Point Series",
    "Meraki Cloud Networking Series"
  ],
  Netgear: [
    "Nighthawk Series",
    "Orbi Mesh Series",
    "RAX Router Series",
    "ProSAFE Business Series",
    "Insight Managed Series"
  ],
  Ubiquiti: [
    "UniFi Access Point Series",
    "UniFi Dream Series",
    "UniFi Protect Series",
    "EdgeRouter Series",
    "EdgeSwitch Series",
    "AmpliFi Mesh Series"
  ],
  "D-Link": [
    "DIR Router Series",
    "DGS Switch Series",
    "DWR Mobile Broadband Series",
    "Nuclias Business Series"
  ],
  Huawei: [
    "AX Series Routers",
    "B Series LTE Routers",
    "S Series Switches",
    "AirEngine Access Point Series",
    "CloudEngine Series"
  ],

  // 👇 Telco-based device families (service-driven, not product-driven)
  "Ethio Telecom": [
    "4G LTE Mobile WiFi (MiFi)",
    "5G Mobile WiFi",
    "Home Broadband Router",
    "Fiber ONT Router",
    "USB LTE Modem"
  ],
  Safaricom: [
    "4G LTE Portable WiFi (MiFi)",
    "5G Mobile WiFi",
    "Home Router",
    "Fiber ONT Router",
    "Fixed Wireless Router"
  ]
};

const PRINTER_MODEL_SUGGESTIONS: Record<string, string[]> = {
  HP: [
    "LaserJet Series",
    "LaserJet Pro Series",
    "LaserJet Enterprise Series",
    "DeskJet Series",
    "ENVY Series",
    "OfficeJet Series",
    "OfficeJet Pro Series",
    "Smart Tank Series",
    "PageWide Series",
    "DesignJet Series",
    "ScanJet Series"
  ],
  Canon: [
    "PIXMA Series",
    "MAXIFY Series",
    "imageRUNNER Series",
    "imageRUNNER ADVANCE Series",
    "imageCLASS Series",
    "SELPHY Photo Printer Series",
    "CanoScan Series"
  ],
  Epson: [
    "EcoTank Series",
    "WorkForce Series",
    "WorkForce Pro Series",
    "Expression Series",
    "SureColor Series",
    "SureLab Series",
    "Perfection Scanner Series"
  ],
  Brother: [
    "DCP Series",
    "HL Series",
    "MFC Series",
    "ADS Scanner Series",
    "PT Label Printer Series",
    "QL Label Printer Series",
    "RJ Mobile Printer Series"
  ]
};

const SOFTWARE_MODEL_SUGGESTIONS: Record<string, string[]> = {
  Microsoft: ["Microsoft 365", "Office Home 2024", "Windows 10 Pro", "Windows 11 Pro"],
  Adobe: ["Photoshop", "Illustrator", "Premiere Pro", "Lightroom"],
  Autodesk: ["AutoCAD", "Revit", "3ds Max"],
  Kaspersky: ["Kaspersky Standard", "Kaspersky Plus"],
};

const TELEVISION_MODEL_SUGGESTIONS: Record<string, string[]> = {
  Samsung: [
    "Crystal UHD Series",
    "QLED Series",
    "Neo QLED Series",
    "OLED Series",
    "The Frame Series",
    "The Serif Series",
    "The Terrace Series",
    "Lifestyle Series"
  ],
  LG: [
    "OLED Series",
    "QNED Series",
    "UHD Series",
    "NanoCell Series",
    "NanoCell AI ThinQ Series"
  ],
  Sony: [
    "Bravia Series",
    "Bravia OLED Series",
    "Bravia LED Series",
    "Bravia XR Series",
    "Bravia 4K Series",
    "Bravia 8K Series"
  ],
  TCL: [
    "QLED Series",
    "Mini LED Series",
    "UHD Series",
    "P-Series QLED",
    "C-Series LED"
  ],
  Hisense: [
    "QLED Series",
    "Mini LED Series",
    "UHD Series",
    "ULED Series"
  ],
  Panasonic: [
    "LED Series",
    "OLED Series",
    "HX Series",
    "JZ Series",
    "TX Series"
  ],
  Philips: [
    "LED Series",
    "OLED Series",
    "Ambilight Series",
    "The One Series"
  ]
};

const HOME_THEATER_MODEL_SUGGESTIONS: Record<string, string[]> = {
  Sony: ["HT Series", "HT-A Series", "Home Theater Soundbar Series"],
  Samsung: ["HW Series", "HW-Q Series", "Sound+ Series"],
  LG: ["SN Series", "S Series", "SoundBar Series"],
  Bose: ["Smart Soundbar Series", "Soundbar Series", "Lifestyle Series"],
  Yamaha: ["YHT Series", "SR Series", "MusicCast Series"],
  JBL: ["Bar Series", "Cinema Series", "CineBeam Series"],
  Panasonic: ["SC-HTB Series", "SoundSlayer Series", "SC-HT Series"]
};

const SPEAKER_MODEL_SUGGESTIONS: Record<string, string[]> = {
  JBL: ["Charge Series", "Flip Series", "PartyBox Series", "Boombox Series"],
  Bose: ["SoundLink Series", "Home Speaker Series", "Portable Series"],
  Sony: ["SRS Series", "X-Series Extra Bass", "XB Series"],
  Yamaha: ["HS Series", "SR Series", "MusicCast Series"],
  Samsung: ["MX Series", "Sound Tower Series", "Wireless Audio Series"],
  LG: ["XBOOM Series", "PL Series", "Ultra Sound Series"],
  Marshall: ["Emberton Series", "Acton Series", "Stanmore Series"],
  "Harman Kardon": ["Onyx Studio Series", "Aura Studio Series", "Citation Series"]
};

const HEADPHONE_MODEL_SUGGESTIONS: Record<string, string[]> = {
  Sony: ["WH-1000XM Series", "WF-1000XM Series", "WF-C Series", "Other Sony Headphones"],
  Bose: ["QuietComfort Series", "Ultra Series", "Other Bose Headphones"],
  Sennheiser: ["HD Series", "Momentum Series", "CX Series", "Other Sennheiser Headphones"],
  Apple: ["AirPods Series", "AirPods Pro Series", "AirPods Max Series", "Other Apple Headphones"],
  Samsung: ["Galaxy Buds Series", "Other Samsung Headphones"],
  JBL: ["Tune Series", "Live Series", "Other JBL Headphones"],
  Beats: ["Studio Series", "Solo Series", "Fit Series", "Other Beats Headphones"],
  "Audio-Technica": ["ATH Series", "Other Audio-Technica Headphones"],
  "Anker Soundcore": ["Life Series", "Space Series", "Other Soundcore Headphones"]
};

const DVD_MODEL_SUGGESTIONS: Record<string, string[]> = {
  Sony: ["BDP Series", "DVD Series", "Other Sony Players"],
  Samsung: ["BD Series", "DVD Series", "Other Samsung Players"],
  LG: ["BP Series", "DP Series", "Other LG Players"],
  Panasonic: ["DP Series", "DVD Series", "Other Panasonic Players"],
  Philips: ["TAB Series", "TAEP Series", "Other Philips Players"]
};

const ELECTRONICS_CONFIG: Record<string, ElectronicsConfig> = {
  Smartphones: { brandGroups: PHONE_BRAND_GROUPS, modelSuggestions: SMARTPHONE_MODEL_SUGGESTIONS },
  "Feature Phones": { brandOptions: ["Nokia", "Tecno", "Infinix", "itel", ...ETHIOPIAN_ELECTRONICS_BRANDS, "Other"], modelSuggestions: FEATURE_PHONE_MODEL_SUGGESTIONS },
  Tablets: { brandOptions: ["Apple", "Samsung", "Lenovo", "Huawei", "Xiaomi", "Tecno", ...ETHIOPIAN_ELECTRONICS_BRANDS, "Other"], modelSuggestions: TABLET_MODEL_SUGGESTIONS },
  Smartwatches: { brandOptions: ["Apple", "Samsung", "Huawei", "Amazfit", "Xiaomi", "Garmin", ...ETHIOPIAN_ELECTRONICS_BRANDS, "Other"], modelSuggestions: SMARTWATCH_MODEL_SUGGESTIONS },
  "Mobile Accessories": { brandOptions: ["Anker", "Baseus", "Oraimo", "Apple", "Samsung", ...ETHIOPIAN_ELECTRONICS_BRANDS, "Other"] },
  "Mobile Spare Parts": { brandOptions: ["Samsung", "Apple", "Xiaomi", "Tecno", "Infinix", "itel", "Oppo", "Vivo", ...ETHIOPIAN_ELECTRONICS_BRANDS, "Other"] },
  Laptops: { brandOptions: [...LAPTOP_BRANDS, "MSI", "Microsoft", ...ETHIOPIAN_ELECTRONICS_BRANDS, "Other"], modelSuggestions: LAPTOP_MODEL_SUGGESTIONS },
  "Desktop Computers": { brandOptions: ["Dell", "HP", "Lenovo", "Apple", "Asus", "Acer", "MSI", ...ETHIOPIAN_ELECTRONICS_BRANDS, "Other"], modelSuggestions: DESKTOP_MODEL_SUGGESTIONS },
  "Computer Accessories": { brandGroups: buildBrandGroups(["HP", "Dell", "Lenovo", "Asus", "Acer", "TP-Link", "Samsung", "Logitech", "Razer", "Corsair", "Kingston", "SanDisk", "Sony"]), modelSuggestions: ACCESSORY_MODEL_SUGGESTIONS },
  "Networking Equipment": { brandOptions: ["TP-Link", "MikroTik", "Cisco", "Netgear", "Ubiquiti", "D-Link", "Huawei", ...ETHIOPIAN_ELECTRONICS_BRANDS, "Other"], modelSuggestions: NETWORKING_MODEL_SUGGESTIONS },
  "Printers & Scanners": { brandOptions: ["HP", "Canon", "Epson", "Brother", ...ETHIOPIAN_ELECTRONICS_BRANDS, "Other"], modelSuggestions: PRINTER_MODEL_SUGGESTIONS },
  Software: { brandOptions: ["Microsoft", "Adobe", "Autodesk", "Kaspersky", "Local Electronics Brand", "Other"], modelSuggestions: SOFTWARE_MODEL_SUGGESTIONS, brandLabel: "Brand / Publisher", modelLabel: "Product" },
  Televisions: { brandOptions: TV_AUDIO_BRAND_MAP.Televisions, modelSuggestions: TELEVISION_MODEL_SUGGESTIONS },
  "Home Theater Systems": { brandOptions: TV_AUDIO_BRAND_MAP["Home Theater Systems"], modelSuggestions: HOME_THEATER_MODEL_SUGGESTIONS },
  Speakers: { brandOptions: TV_AUDIO_BRAND_MAP.Speakers, modelSuggestions: SPEAKER_MODEL_SUGGESTIONS },
  Headphones: { brandOptions: TV_AUDIO_BRAND_MAP.Headphones, modelSuggestions: HEADPHONE_MODEL_SUGGESTIONS },
  "DVD & Media Players": { brandOptions: TV_AUDIO_BRAND_MAP["DVD & Media Players"], modelSuggestions: DVD_MODEL_SUGGESTIONS },
};

const DETAIL_KEYS_TO_PRESERVE = new Set([
  "Delivery Available",
  "Delivery Charged",
  "Delivery Charge",
  "Price (ETB)",
  "Description",
  "pricing_type",
]);
const REAL_ESTATE_PROPERTY_TYPES = [
  "Apartment",
  "House",
  "Villa",
  "Duplex",
  "Bungalow",
  "Studio Apartment",
  "Penthouse",
  "Townhouse",
  "Other",
];
const REAL_ESTATE_CONDITION_OPTIONS = ["Newly Built", "Renovated", "Fairly Used", "Old"];
const REAL_ESTATE_FURNISHING_OPTIONS = ["Furnished", "Semi-Furnished", "Unfurnished"];
const REAL_ESTATE_BATHROOM_OPTIONS = ["1", "2", "3", "4", "5", "6+"];
const REAL_ESTATE_TOILET_OPTIONS = ["1", "2", "3", "4", "5", "6+"];
const REAL_ESTATE_FACILITY_OPTIONS = [
  "24-hour Electricity",
  "Balcony",
  "Dining Area",
  "Dishwasher",
  "En Suite",
  "Hot Water",
  "Kitchen Cabinets",
  "Kitchen Shelf",
  "Microwave",
  "Pop Ceiling",
  "Pre-Paid Meter",
  "Refrigerator",
  "Tiled Floor",
  "TV",
  "Wardrobe",
  "Wi-Fi",
  "Air Conditioning",
  "Parking Space",
  "Security",
];
const REAL_ESTATE_LISTING_TYPE_OPTIONS = ["For Sale", "For Rent"];
const REAL_ESTATE_LISTED_BY_OPTIONS = ["Owner", "Agent", "Developer"];
const REAL_ESTATE_MIN_RENTAL_PERIOD_OPTIONS = ["Daily", "Weekly", "Monthly", "Yearly"];
const VEHICLE_SUBCATEGORY_SCHEMA = new Set(CATEGORY_SUBCATEGORIES.Vehicles || []);
const ELECTRONICS_SUBCATEGORY_SCHEMA = new Set([
  ...(CATEGORY_SUBCATEGORIES["Mobile Devices"] || []),
  ...(CATEGORY_SUBCATEGORIES["Computing & Electronics"] || []),
  ...(CATEGORY_SUBCATEGORIES["TV & Audio Systems"] || []),
]);
const ELECTRONICS_RENDERED_SUBCATEGORIES = new Set([
  "Smartphones",
  "Feature Phones",
  "Tablets",
  "Smartwatches",
  "Mobile Accessories",
  "Mobile Spare Parts",
  "Laptops",
  "Desktop Computers",
  "Computer Accessories",
  "Networking Equipment",
  "Printers & Scanners",
  "Software",
  "Televisions",
  "Home Theater Systems",
  "Speakers",
  "Headphones",
  "DVD & Media Players",
  "Other",
]);
const REAL_ESTATE_SUBCATEGORY_SCHEMA = new Set(CATEGORY_SUBCATEGORIES["Real Estate"] || []);

const APPLE_MOBILE_SUBCATEGORIES = new Set(["Smartphones", "Feature Phones", "Tablets"]);
const APPLE_IOS_BRANDS = new Set(["Apple"]);

const PHONE_OS_BY_BRAND: Record<string, string> = {
  Apple: "iOS",
  Samsung: "Android",
  Xiaomi: "Android",
  OnePlus: "Android",
  Vivo: "Android",
  Oppo: "Android",
  Realme: "Android",
  Tecno: "Android",
  Infinix: "Android",
  "Google Pixel": "Android",
  Huawei: "Android",
  Nokia: "Android",
  Nothing: "Android",
  Honor: "Android",
  Motorola: "Android",
};

function hasMeaningfulListingInput(details: Record<string, string>, price: string, description: string): boolean {
  if (price.trim() || description.trim()) return true;
  return Object.values(details).some((v) => String(v || "").trim() !== "");
}

function describeListingUndoBanner(reason: ListingUndoReason | undefined): string {
  if (reason === "detection_prefill") {
    return "Title detection updated your listing fields. You can restore the previous values.";
  }
  if (reason === "taxonomy_change") {
    return "You changed category or subcategory and cleared listing fields. You can restore the previous state.";
  }
  if (reason === "form_reset") {
    return "Listing fields were reset. You can restore the previous state.";
  }
  return "You can undo your last listing change.";
}

export default function SellDetailsPage() {
  const params = useSearchParams();
  const category = params.get("category");
  const router = useRouter();
  const { user } = useAppContext();
  const showToast = useToast();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [subCategory, setSubcategory] = useState("");
  const [details, setDetails] = useState<Record<string, string>>({});
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [condition, setCondition] = useState<"NEW" | "USED">("USED");
  const [submitting, setSubmitting] = useState(false);
  const [titleError, setTitleError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");
  const [submitToast, setSubmitToast] = useState("");
  const [taxonomyChangeModal, setTaxonomyChangeModal] = useState<null | { kind: "category" | "subcategory"; target: string }>(null);
  const [showUndoBanner, setShowUndoBanner] = useState(false);
  const isElectronicsCategory = Boolean(draft && ["Mobile Devices", "Computing & Electronics", "TV & Audio Systems"].includes(draft.category));
  const detectionPrefillTokenRef = useRef<string>("");
  const userTouchedDetailKeysRef = useRef<Set<string>>(new Set());
  const detailsForDetectionRef = useRef(details);
  detailsForDetectionRef.current = details;

  const detectionModelDeps = useMemo<ListingDetectionModelDeps>(
    () => ({
      vehicleModelsForBrand: (b) => VEHICLE_MODEL_SUGGESTIONS[b] || [],
      electronicsModelsForBrand: (sub, b) => ELECTRONICS_CONFIG[sub]?.modelSuggestions?.[b] || [],
      fashionBrandOptionsForSub: (sub) => CATEGORY_BRAND_OPTIONS[sub],
      electronicsSubHasModelSuggestions: (sub) => Boolean(ELECTRONICS_CONFIG[sub]?.modelSuggestions),
    }),
    []
  );

  const detectionHintsFingerprint = useMemo(
    () =>
      [
        draft?.detectedHints?.brand ?? "",
        draft?.detectedHints?.model ?? "",
        draft?.detectedHints?.constructionItem ?? "",
        draft?.constructionItem ?? "",
      ].join("|"),
    [draft?.constructionItem, draft?.detectedHints]
  );

  useEffect(() => {
    userTouchedDetailKeysRef.current.clear();
  }, [detectionHintsFingerprint]);

  useEffect(() => {
    setShowUndoBanner(Boolean(peekListingUndoFrame()));
  }, []);

  useEffect(() => {
    detectionPrefillTokenRef.current = "";
  }, [category]);

  useEffect(() => {
    const loaded = readStoredDraft();
    if (!loaded) return;

    let nextDraft = loaded;
    const { urls: safeImages, warnings: imageWarnings } = sanitizeListingImageUrls(loaded.images);
    if (safeImages.length !== loaded.images.length || imageWarnings.length) {
      imageWarnings.forEach((msg) => showToast(msg, "warning"));
      nextDraft = { ...loaded, images: safeImages };
      try {
        const raw = window.localStorage.getItem("sellDraft");
        const parsed = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
        window.localStorage.setItem("sellDraft", JSON.stringify({ ...parsed, images: safeImages }));
      } catch {
        // ignore storage sync failures
      }
    }

    setDraft(nextDraft);
    let savedSubcategory = nextDraft.subcategory;
    if (nextDraft.category === "Real Estate" && savedSubcategory) {
      savedSubcategory = normalizeRealEstateSubcategory(savedSubcategory);
    }
    if (nextDraft.category === CONSTRUCTION_MACHINERIES_REPAIRS_CATEGORY && savedSubcategory) {
      savedSubcategory = normalizeConstructionRepairSubcategory(savedSubcategory);
    }
    const nextSubcategory = isValidSubcategoryForCategory(nextDraft.category, savedSubcategory)
      ? (savedSubcategory as string)
      : getDefaultSubcategory(nextDraft.category);
    setSubcategory(nextSubcategory);
    if (savedSubcategory !== nextDraft.subcategory && nextDraft.category === "Real Estate") {
      try {
        window.localStorage.setItem(
          "sellDraft",
          JSON.stringify({ ...nextDraft, subcategory: nextSubcategory })
        );
      } catch {
        // ignore
      }
    }
    setTitleError(nextDraft.title.trim().length < 3 ? "Title must be at least 3 characters." : "");
  }, [category, showToast]);

  useEffect(() => {
    if (!draft?.category || !subCategory) return;
    if (isValidSubcategoryForCategory(draft.category, subCategory)) return;
    setSubcategory(getDefaultSubcategory(draft.category));
  }, [draft?.category, subCategory]);

  useEffect(() => {
    if (!draft || !subCategory) return;
    try {
      const currentDraft = readStoredDraft() || draft;
      window.localStorage.setItem(
        "sellDraft",
        JSON.stringify({
          ...currentDraft,
          subcategory: subCategory,
          subcity: currentDraft.subcity || currentDraft.area,
        })
      );
    } catch {
      // ignore draft sync issues and keep in-memory state
    }
  }, [draft, subCategory]);

  useEffect(() => {
    if (!APPLE_MOBILE_SUBCATEGORIES.has(subCategory)) return;
    const brand = details["Brand"];
    const lockedOs = APPLE_IOS_BRANDS.has(brand || "") ? "iOS" : PHONE_OS_BY_BRAND[brand || ""];
    if (brand && lockedOs && details["Operating System"] !== lockedOs) {
      setDetails((prev) => ({ ...prev, "Operating System": lockedOs }));
    }
  }, [subCategory, details]);

  useEffect(() => {
    if (draft?.category !== "Beauty & Personal Care") return;
    const currentTypes = getBeautyProductTypes(subCategory);
    const selectedType = details["Product Type"];
    if (selectedType && selectedType !== "Other" && !currentTypes.includes(selectedType)) {
      setDetails((prev) => ({ ...prev, "Product Type": "" }));
    }
  }, [details, draft?.category, subCategory]);

  useEffect(() => {
    if (!subCategory) return;
    setDetails((prev) => {
      const nextEntries = Object.entries(prev).filter(([key]) => DETAIL_KEYS_TO_PRESERVE.has(key));
      const next = Object.fromEntries(nextEntries);
      if (Object.keys(next).length === Object.keys(prev).length) {
        return prev;
      }
      return next;
    });
    setCondition("USED");
    setSubmitError("");
    setSubmitSuccess("");
  }, [subCategory]);

  useEffect(() => {
    if (draft?.category !== "Real Estate") return;
    setDetails((prev) => {
      if (
        prev["Delivery Available"] === undefined &&
        prev["Delivery Charged"] === undefined &&
        (prev["Delivery Charge"] === undefined || prev["Delivery Charge"] === "")
      ) {
        return prev;
      }
      const next = { ...prev };
      delete next["Delivery Available"];
      delete next["Delivery Charged"];
      delete next["Delivery Charge"];
      return next;
    });
  }, [draft?.category]);

  useEffect(() => {
    if (draft?.category !== "Real Estate") return;
    if (!REAL_ESTATE_RESIDENTIAL_SUBCATEGORIES.has(subCategory)) return;
    setDetails((prev) => {
      if (prev["Listing Type"]) return prev;
      if (subCategory === "Apartment or House for Sale") {
        return { ...prev, "Listing Type": "For Sale" };
      }
      return { ...prev, "Listing Type": "For Rent" };
    });
  }, [draft?.category, subCategory]);

  useEffect(() => {
    setPrice(details["Price (ETB)"] || "");
  }, [details]);

  useEffect(() => {
    setDescription(details["Description"] || "");
  }, [details]);

  useEffect(() => {
    if (!isElectronicsCategory || !subCategory) return;
    setDetails((prev) => {
      const next = { ...prev };
      const currentConfig = ELECTRONICS_CONFIG[subCategory];
      const currentBrand = next["Brand"] || "";
      const currentCustomBrand = next["Custom Brand"] || "";
      const effectiveBrand = currentBrand === "Other" ? currentCustomBrand : currentBrand;
      const allowedBrands = new Set([
        ...(currentConfig?.brandOptions || []),
        ...(currentConfig?.brandGroups?.flatMap((group) => group.options.map((option) => option.value)) || []),
      ]);
      if (effectiveBrand && allowedBrands.size > 0 && !allowedBrands.has(currentBrand) && !allowedBrands.has(effectiveBrand)) {
        next["Brand"] = "";
        next["Custom Brand"] = "";
        next["Model"] = "";
        next["Custom Model"] = "";
      }

      const modelSuggestions = currentConfig?.modelSuggestions;
      const currentModel = next["Model"] || "";
      const allowedModels = modelSuggestions && effectiveBrand ? modelSuggestions[effectiveBrand] || [] : [];
      if (currentModel && currentModel !== "Other" && allowedModels.length > 0 && !allowedModels.includes(currentModel)) {
        next["Model"] = "";
        next["Custom Model"] = "";
      }

      if (["Smartphones", "Feature Phones"].includes(subCategory) && !brandShowsBatteryHealthForMobile(next)) {
        delete next["Battery Health (%)"];
      }

      return next;
    });
  }, [isElectronicsCategory, subCategory]);

  useEffect(() => {
    if (!draft || !subCategory) return;
    const prev = detailsForDetectionRef.current;
    const outcome = runListingDetectionPrefill(
      {
        draft,
        subCategory,
        previousDetails: prev,
        appliedToken: detectionPrefillTokenRef.current,
      },
      detectionModelDeps
    );
    if (outcome.kind === "skip") return;
    const merged = mergeDetectionRespectingUserEditedKeys(prev, outcome.details, userTouchedDetailKeysRef.current);
    if (JSON.stringify(prev) === JSON.stringify(merged)) {
      detectionPrefillTokenRef.current = outcome.token;
      return;
    }
    detectionPrefillTokenRef.current = outcome.token;
    logListingAudit("listing.sell.detection_prefill", { subCategory });
    setDetails(merged);
  }, [draft, subCategory, detectionModelDeps]);

  useEffect(() => {
    if (!draft?.category || !subCategory) return;
    const isKnown =
      (draft.category === "Vehicles" && VEHICLE_SUBCATEGORY_SCHEMA.has(subCategory)) ||
      (["Mobile Devices", "Computing & Electronics", "TV & Audio Systems"].includes(draft.category) &&
        ELECTRONICS_SUBCATEGORY_SCHEMA.has(subCategory) &&
        ELECTRONICS_RENDERED_SUBCATEGORIES.has(subCategory)) ||
      (draft.category === "Real Estate" && REAL_ESTATE_SUBCATEGORY_SCHEMA.has(subCategory)) ||
      (draft.category !== "Vehicles" &&
        !["Mobile Devices", "Computing & Electronics", "TV & Audio Systems", "Real Estate"].includes(draft.category) &&
        isValidSubcategoryForCategory(draft.category, subCategory));
    if (!isKnown) {
      setSubmitError("The selected subcategory is not configured correctly. Please reselect category and subcategory.");
    }
  }, [draft?.category, subCategory]);

  useEffect(() => {
    if (!submitToast) return;
    const timer = window.setTimeout(() => setSubmitToast(""), 2200);
    return () => window.clearTimeout(timer);
  }, [submitToast]);

  function setDetail(key: string, value: string) {
    userTouchedDetailKeysRef.current.add(key);
    setDetails((prev) => ({ ...prev, [key]: value }));
  }

  function setPriceValue(value: string) {
    const next = normalizePriceInput(value);
    setPrice(next);
    setDetail("Price (ETB)", next);
  }

  function setDescriptionValue(value: string) {
    setDescription(value);
    setDetail("Description", value);
  }

  function setConditionValue(value: string) {
    setDetail("Condition", value);
    setCondition(value === "New" || value === "Brand New" ? "NEW" : "USED");
  }

  function runAtomicFormReset(options?: { skipUndoSnapshot?: boolean }) {
    userTouchedDetailKeysRef.current.clear();
    if (
      !options?.skipUndoSnapshot &&
      draft &&
      hasMeaningfulListingInput(details, price, description)
    ) {
      pushListingUndoFrame({
        reason: "form_reset",
        details: { ...details },
        price,
        description,
        condition,
        subCategory: subCategory,
        draftJson: JSON.stringify(draft),
      });
      logListingAudit("listing.sell.form_reset_undo_snapshot", {
        category: draft.category,
        subcategory: subCategory,
      });
      setShowUndoBanner(true);
    }
    runAtomicListingFormReset({
      setDetails,
      setPrice,
      setDescription,
      setCondition,
      setSubmitError,
      setSubmitSuccess,
      clearDetectionPrefillToken: () => {
        detectionPrefillTokenRef.current = "";
      },
    });
  }

  function applyConfirmedCategoryChange(target: string) {
    if (!draft) return;
    runAtomicFormReset({ skipUndoSnapshot: true });
    const nextSub = getDefaultSubcategory(target);
    const nextDraft = normalizeSellDraftForStorage({
      ...draft,
      category: target,
      subcategory: nextSub,
      detectedHints: undefined,
      constructionItem: undefined,
    });
    setDraft(nextDraft);
    setSubcategory(nextSub);
    try {
      window.localStorage.setItem("sellDraft", JSON.stringify(nextDraft));
    } catch {
      // ignore
    }
    router.replace(`/sell/details?category=${encodeURIComponent(target)}`);
    setTaxonomyChangeModal(null);
  }

  function applyConfirmedSubcategoryChange(target: string) {
    runAtomicFormReset({ skipUndoSnapshot: true });
    setSubcategory(target);
    if (draft) {
      const nextDraft = normalizeSellDraftForStorage({
        ...draft,
        subcategory: target,
        detectedHints: undefined,
        constructionItem: undefined,
      });
      setDraft(nextDraft);
      try {
        window.localStorage.setItem("sellDraft", JSON.stringify(nextDraft));
      } catch {
        // ignore
      }
    }
    setTaxonomyChangeModal(null);
  }

  function requestCategoryChange(target: string) {
    if (!draft || target === draft.category) return;
    if (hasMeaningfulListingInput(details, price, description)) {
      setTaxonomyChangeModal({ kind: "category", target });
      return;
    }
    applyConfirmedCategoryChange(target);
  }

  function requestSubcategoryChange(target: string) {
    if (target === subCategory) return;
    if (hasMeaningfulListingInput(details, price, description)) {
      setTaxonomyChangeModal({ kind: "subcategory", target });
      return;
    }
    runAtomicFormReset();
    setSubcategory(target);
    if (draft) {
      const nextDraft = normalizeSellDraftForStorage({
        ...draft,
        subcategory: target,
        detectedHints: undefined,
        constructionItem: undefined,
      });
      setDraft(nextDraft);
      try {
        window.localStorage.setItem("sellDraft", JSON.stringify(nextDraft));
      } catch {
        // ignore
      }
    }
  }

  function confirmTaxonomyModal() {
    if (!taxonomyChangeModal || !draft) {
      setTaxonomyChangeModal(null);
      return;
    }
    const { kind, target } = taxonomyChangeModal;
    pushListingUndoFrame({
      reason: "taxonomy_change",
      details: { ...details },
      price,
      description,
      condition,
      subCategory: subCategory,
      draftJson: JSON.stringify(draft),
    });
    setShowUndoBanner(true);
    if (kind === "category") applyConfirmedCategoryChange(target);
    else applyConfirmedSubcategoryChange(target);
    logListingAudit("listing.sell.taxonomy_confirm", { kind, target });
  }

  function restoreListingUndo() {
    const frame = popListingUndoFrame();
    if (!frame) {
      setShowUndoBanner(Boolean(peekListingUndoFrame()));
      return;
    }
    try {
      userTouchedDetailKeysRef.current.clear();
      const nextDraft = parseUndoDraftJson(frame.draftJson);
      setDraft(nextDraft);
      setSubcategory(frame.subCategory);
      setDetails(frame.details);
      setPrice(frame.price);
      setDescription(frame.description);
      setCondition(frame.condition);
      detectionPrefillTokenRef.current = "";
      try {
        window.localStorage.setItem("sellDraft", JSON.stringify(nextDraft));
      } catch {
        // ignore
      }
      const cat = nextDraft.category;
      if (cat && category !== cat) {
        router.replace(`/sell/details?category=${encodeURIComponent(cat)}`);
      }
      logListingAudit("listing.sell.undo_restore", { reason: frame.reason });
    } catch {
      // ignore corrupt frame
    } finally {
      setShowUndoBanner(Boolean(peekListingUndoFrame()));
    }
  }

  function dismissListingUndoBanner() {
    discardTopListingUndoFrame();
    logListingAudit("listing.sell.undo_dismiss");
    setShowUndoBanner(Boolean(peekListingUndoFrame()));
  }

  const validTitle = Boolean(draft?.title.trim().length && draft.title.trim().length >= 3);
  const canPost = Boolean(draft?.title && draft?.category && draft?.city && draft?.area && subCategory && validTitle);

  async function submitListing() {
    if (!draft || !canPost) return;
    setSubmitError("");
    setSubmitSuccess("");
    const { urls: imageUrls, warnings: listingImageWarnings } = sanitizeListingImageUrls(draft.images);
    listingImageWarnings.forEach((msg) => showToast(msg, "warning"));
    if (imageUrls.length === 0) {
      setSubmitError("Please upload at least one photo before posting this listing.");
      return;
    }
    if (!user?.vendor?.phone?.trim()) {
      setSubmitError("Please add a vendor phone number before posting an item.");
      return;
    }
    const validationError = validateListingDetailsForPublish(draft.category, subCategory, details, description);
    if (validationError) {
      setSubmitError(validationError);
      return;
    }
    setSubmitting(true);
    try {
      const detailsPayload = finalizeListingDetailsForSubmit(details, draft.category, subCategory);
      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draft.title,
          category: draft.category,
          subcategory: subCategory,
          city: draft.city,
          area: draft.subcity || draft.area,
          images: imageUrls,
          price: price || undefined,
          description: description || undefined,
          condition,
          details: detailsPayload,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSubmitError(data.error || "Failed to post item.");
        setSubmitting(false);
        return;
      }

      setSubmitting(false);
      setSubmitSuccess("Item posted successfully");
      setSubmitToast("Item posted successfully");
      clearListingUndoStack();
      setShowUndoBanner(false);
      window.localStorage.removeItem("sellDraft");
      window.setTimeout(() => {
        router.push("/");
      }, 900);
    } catch (error) {
      setSubmitting(false);
      setSubmitError(error instanceof Error ? error.message : "Failed to post item.");
    }
  }

  if (!category) return <PageState text="Select a category first from the previous step." />;
  if (!draft) return <PageState text="Please complete the first step of your listing before continuing." />;
  if (!user) return <PageState text="Please sign in to post a listing." />;

  return (
    <div className="sellPage">
      {submitToast ? <div className="appToast appToastSuccess">{submitToast}</div> : null}
      {showUndoBanner ? (
        <div
          className="appToast appToastWarning"
          style={{
            position: "relative",
            margin: "0 auto 12px",
            maxWidth: 720,
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "10px",
            justifyContent: "center",
            animation: "none",
          }}
        >
          <span>{describeListingUndoBanner(peekListingUndoFrame()?.reason)}</span>
          <button type="button" className="sellModalBtn sellModalBtnPrimary" onClick={restoreListingUndo}>
            Restore previous
          </button>
          <button type="button" className="sellModalBtn sellModalBtnGhost" onClick={dismissListingUndoBanner}>
            Dismiss
          </button>
        </div>
      ) : null}
      {taxonomyChangeModal ? (
        <div
          className="sellModalOverlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="taxonomy-change-title"
          onClick={() => setTaxonomyChangeModal(null)}
        >
          <div className="sellModalCard" onClick={(e) => e.stopPropagation()}>
            <h2 id="taxonomy-change-title" className="sellModalTitle">
              Change {taxonomyChangeModal.kind === "category" ? "category" : "subcategory"}?
            </h2>
            <p className="sellModalBody">
              Changing the {taxonomyChangeModal.kind === "category" ? "category" : "subcategory"} will permanently clear all
              listing details you have already entered (including any detected or prefilled values, price, and description).
            </p>
            <div className="sellModalActions">
              <button type="button" className="sellModalBtn sellModalBtnGhost" onClick={() => setTaxonomyChangeModal(null)}>
                Cancel
              </button>
              <button type="button" className="sellModalBtn sellModalBtnPrimary" onClick={confirmTaxonomyModal}>
                Clear data and continue
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <div className="sellHeaderBar">
        <div className="sellHeaderInner">
          <h1 className="sellHeaderTitle">Post ad</h1>
        </div>
      </div>

      <main className="sellMain">
        <section className="sellCard">
          <div className="sellCardInner sellCardInnerCompact">
            <div className="sellSection">
              <h2 className="sellCardTitle sellCardTitleCompact">Listing summary</h2>
              <div className="sellGrid">
                <label className="sellField">
                  <span className="sellFieldLabel">Title</span>
                  <input className="sellInput" value={draft.title} readOnly />
                </label>
                <SearchableSelect
                  label="Category"
                  value={draft.category}
                  placeholder="Select category"
                  options={HOME_CATEGORIES.map((c) => ({ value: c.name, label: `${c.icon} ${c.name}` }))}
                  onChange={(v) => requestCategoryChange(v)}
                />
                <label className="sellField">
                  <span className="sellFieldLabel">City</span>
                  <input className="sellInput" value={draft.city} readOnly />
                </label>
                <label className="sellField">
                  <span className="sellFieldLabel">Subcity</span>
                  <input className="sellInput" value={draft.subcity || draft.area} readOnly />
                </label>
              </div>
              {titleError ? <p className="sellInlineError">{titleError}</p> : null}
            </div>

            {draft.category !== "Real Estate" ? (
              <DeliveryFields
                available={details["Delivery Available"] === "Yes"}
                charged={details["Delivery Charged"] === "Yes"}
                charge={details["Delivery Charge"] || ""}
                onAvailable={(value) => {
                  setDetail("Delivery Available", value ? "Yes" : "No");
                  if (!value) {
                    setDetail("Delivery Charged", "No");
                    setDetail("Delivery Charge", "0");
                  }
                }}
                onCharged={(value) => {
                  setDetail("Delivery Charged", value ? "Yes" : "No");
                  if (!value) setDetail("Delivery Charge", "0");
                }}
                onCharge={(value) => setDetail("Delivery Charge", value)}
              />
            ) : null}

            <div className="sellSection">
              <h2 className="sellCardTitle sellCardTitleCompact">Subcategory</h2>
              <div className="sellSubcategoryRow">
                <SearchableSelect
                  key={`subcategory-${draft.category}`}
                  label="Subcategory"
                  value={subCategory}
                  options={(CATEGORY_SUBCATEGORIES[draft.category] || []).map(toOption)}
                  onChange={(v) => requestSubcategoryChange(v)}
                />
              </div>
            </div>

            {draft.category === "Vehicles" ? (
              <VehicleForm details={details} subcategory={subCategory} onField={setDetail} onPrice={setPriceValue} onDescription={setDescriptionValue} onCondition={setConditionValue} />
            ) : ["Mobile Devices", "Computing & Electronics", "TV & Audio Systems"].includes(draft.category) ? (
              <ElectronicsForm key={`${draft.category}-${subCategory}`} category={draft.category} details={details} subcategory={subCategory} onField={setDetail} onPrice={setPriceValue} onDescription={setDescriptionValue} onCondition={setConditionValue} />
            ) : (
              <CategoryForm category={draft.category} details={details} subcategory={subCategory} onField={setDetail} onPrice={setPriceValue} onDescription={setDescriptionValue} onCondition={setConditionValue} />
            )}

            <button type="button" className="sellNextBtn" disabled={!canPost || submitting} onClick={submitListing}>
              {submitting ? "Posting..." : "Post ad"}
            </button>
            {submitError ? <p className="modalError">{submitError}</p> : null}
            {submitSuccess ? <p className="modalSub modalToastInline">{submitSuccess}</p> : null}
          </div>
        </section>
      </main>
    </div>
  );
}

function PageState({ text }: { text: string }) {
  return (
    <div className="sellPage">
      <main className="sellMain">
        <p>{text}</p>
      </main>
    </div>
  );
}

function VehicleForm({
  details,
  subcategory,
  onField,
  onPrice,
  onDescription,
  onCondition,
}: {
  details: Record<string, string>;
  subcategory: string;
  onField: (key: string, value: string) => void;
  onPrice: (value: string) => void;
  onDescription: (value: string) => void;
  onCondition: (value: string) => void;
}) {
  const isCarLike = subcategory === "Cars" || subcategory === "SUVs & Crossovers";
  const seatsRaw = details["Seats"];
  const seats = Math.max(
    1,
    Number(
      seatsRaw !== undefined && String(seatsRaw).trim() !== "" ? seatsRaw : isCarLike ? "5" : "1"
    )
  );
  const isRoadVehicle = ["Cars", "SUVs & Crossovers", "Motorbikes & Scooters", "Trucks & Lorries", "Buses & Vans"].includes(subcategory);
  const isHeavyMachine = subcategory === "Heavy Machinery";
  const isPartsLike = ["Vehicle Parts", "Tires & Wheels", "Vehicle Accessories"].includes(subcategory);
  const isBoat = subcategory === "Boats & Watercraft";
  const isOther = subcategory === "Other";

  return (
    <div className="sellSection">
      <h2 className="sellCardTitle sellCardTitleCompact">Vehicle details</h2>
      <div className="sellGrid">
        <BrandModelFields details={details} brandGroups={VEHICLE_BRAND_GROUPS} modelSuggestions={VEHICLE_MODEL_SUGGESTIONS} onField={onField} />
        <SearchableSelect label="Vehicle Type" value={subcategory} options={(CATEGORY_SUBCATEGORIES.Vehicles || []).map(toOption)} onChange={() => undefined} disabled />
        {isRoadVehicle ? (
          <>
            <TextField label="Year of Manufacture" value={details["Year of Manufacture"] || ""} onChange={(value) => onField("Year of Manufacture", value)} />
            <TextField label="Trim" value={details["Trim"] || ""} onChange={(value) => onField("Trim", value)} />
            <ColorSelect label="Color" value={details["Color"] || ""} onChange={(value) => onField("Color", value)} />
            <ColorSelect label="Interior Color" value={details["Interior Color"] || ""} onChange={(value) => onField("Interior Color", value)} />
            <ChoicePills label="Condition" value={details["Condition"] || ""} options={["Brand New", "Slightly Used", "Used"]} onChange={onCondition} />
            <SearchableSelect label="Transmission" value={details["Transmission"] || ""} options={["Automatic", "Manual", "CVT"].map(toOption)} onChange={(value) => onField("Transmission", value)} />
            <SearchableSelect label="Body Type" value={details["Body Type"] || ""} options={["Sedan", "SUV", "Hatchback", "Pickup", "Coupe", "Van", "Truck", "Bus"].map(toOption)} onChange={(value) => onField("Body Type", value)} />
            <SearchableSelect label="Fuel Type" value={details["Fuel Type"] || ""} options={["Petrol", "Diesel", "Hybrid", "Electric"].map(toOption)} onChange={(value) => onField("Fuel Type", value)} />
            <SearchableSelect label="Drivetrain" value={details["Drivetrain"] || ""} options={["FWD", "RWD", "AWD", "4WD"].map(toOption)} onChange={(value) => onField("Drivetrain", value)} />
            <SeatStepper value={seats} onChange={(value) => onField("Seats", String(value))} />
            <TextField label="Number of Cylinders" value={details["Number of Cylinders"] || ""} onChange={(value) => onField("Number of Cylinders", value)} />
            <TextField label="Engine Size (cc)" value={details["Engine Size (cc)"] || ""} onChange={(value) => onField("Engine Size (cc)", value)} />
            <TextField label="Horsepower (hp)" value={details["Horsepower (hp)"] || ""} onChange={(value) => onField("Horsepower (hp)", value)} />
            <TextField label="Top Speed" value={details["Top Speed"] || ""} onChange={(value) => onField("Top Speed", value)} />
            <TextField label="Mileage" value={details["Mileage"] || ""} onChange={(value) => onField("Mileage", value)} />
            <TextField label="Plate Number" value={details["Plate Number"] || ""} onChange={(value) => onField("Plate Number", value)} />
            <SearchableSelect label="Registration status" value={details["Registration status"] || ""} options={["Registered", "Not Registered", "Pending"].map(toOption)} onChange={(value) => onField("Registration status", value)} />
            <TextField label="VIN / Chassis Number" value={details["VIN / Chassis Number"] || ""} onChange={(value) => onField("VIN / Chassis Number", value)} />
            <TextField label="Key Features" value={details["Key Features"] || ""} onChange={(value) => onField("Key Features", value)} />
            <RadioGroup label="Exchange Possible" value={details["Exchange Possible"] || "No"} options={["Yes", "No"]} onChange={(value) => onField("Exchange Possible", value)} />
          </>
        ) : null}
        {isHeavyMachine ? (
          <>
            <ChoicePills label="Condition" value={details["Condition"] || ""} options={["Brand New", "Slightly Used", "Used"]} onChange={onCondition} />
            <TextField label="Equipment Type" value={details["Equipment Type"] || ""} onChange={(value) => onField("Equipment Type", value)} />
            <TextField label="Operating Hours" value={details["Operating Hours"] || ""} onChange={(value) => onField("Operating Hours", value)} />
            <SearchableSelect label="Fuel Type" value={details["Fuel Type"] || ""} options={["Diesel", "Petrol", "Electric", "Hybrid"].map(toOption)} onChange={(value) => onField("Fuel Type", value)} />
            <TextField label="Capacity / Load" value={details["Capacity / Load"] || ""} onChange={(value) => onField("Capacity / Load", value)} />
            <TextField label="Hydraulic Status" value={details["Hydraulic Status"] || ""} onChange={(value) => onField("Hydraulic Status", value)} />
            <TextAreaField label="Other" value={details["Other"] || ""} onChange={(value) => onField("Other", value)} />
          </>
        ) : null}
        {isPartsLike ? (
          <>
            <ChoicePills label="Condition" value={details["Condition"] || ""} options={["Brand New", "Slightly Used", "Used"]} onChange={onCondition} />
            <TextField label="Part Type" value={details["Part Type"] || ""} onChange={(value) => onField("Part Type", value)} />
            <TextField label="Compatibility" value={details["Compatibility"] || ""} onChange={(value) => onField("Compatibility", value)} />
            <TextField label="Part Number" value={details["Part Number"] || ""} onChange={(value) => onField("Part Number", value)} />
            <TextField label="Quantity" value={details["Quantity"] || ""} onChange={(value) => onField("Quantity", value)} />
            <TextAreaField label="Other" value={details["Other"] || ""} onChange={(value) => onField("Other", value)} />
          </>
        ) : null}
        {isBoat ? (
          <>
            <ChoicePills label="Condition" value={details["Condition"] || ""} options={["Brand New", "Slightly Used", "Used"]} onChange={onCondition} />
            <TextField label="Boat Type" value={details["Boat Type"] || ""} onChange={(value) => onField("Boat Type", value)} />
            <TextField label="Length" value={details["Length"] || ""} onChange={(value) => onField("Length", value)} />
            <TextField label="Engine Type" value={details["Engine Type"] || ""} onChange={(value) => onField("Engine Type", value)} />
            <TextField label="Engine Power" value={details["Engine Power"] || ""} onChange={(value) => onField("Engine Power", value)} />
            <TextField label="Capacity" value={details["Capacity"] || ""} onChange={(value) => onField("Capacity", value)} />
            <TextAreaField label="Other" value={details["Other"] || ""} onChange={(value) => onField("Other", value)} />
          </>
        ) : null}
        {isOther ? (
          <>
            <ChoicePills label="Condition" value={details["Condition"] || ""} options={["Brand New", "Slightly Used", "Used"]} onChange={onCondition} />
            <TextField label="Type" value={details["Type"] || ""} onChange={(value) => onField("Type", value)} />
            <TextField label="Specs" value={details["Specs"] || ""} onChange={(value) => onField("Specs", value)} />
            <TextAreaField label="Other" value={details["Other"] || ""} onChange={(value) => onField("Other", value)} />
          </>
        ) : null}
        <PriceField value={details["Price (ETB)"] || ""} onChange={onPrice} />
        <PricingTypeField details={details} onField={onField} />
      </div>
      <TextAreaField label="Description" value={details["Description"] || ""} onChange={onDescription} />
    </div>
  );
}

function ElectronicsForm({
  category,
  details,
  subcategory,
  onField,
  onPrice,
  onDescription,
  onCondition,
}: {
  category: string;
  details: Record<string, string>;
  subcategory: string;
  onField: (key: string, value: string) => void;
  onPrice: (value: string) => void;
  onDescription: (value: string) => void;
  onCondition: (value: string) => void;
}) {
  const isPhone = ["Smartphones", "Feature Phones"].includes(subcategory);
  const isAppleMobileSubcategory = APPLE_MOBILE_SUBCATEGORIES.has(subcategory);
  const isAppleBrand = APPLE_IOS_BRANDS.has(details["Brand"] || "");
  const isTvAudio = category === "TV & Audio Systems";
  const isMobileDevices = category === "Mobile Devices";
  const isComputerAccessories = subcategory === "Computer Accessories";
  const phoneOsLocked = isAppleMobileSubcategory && isAppleBrand;
  const computerAccessoryTypes = splitList(details["Accessory Type"]);
  const accessoryPriorityBrands = uniqueNormalizedBrands(
    computerAccessoryTypes.flatMap((type) => ACCESSORY_TYPE_BRAND_CATEGORY_MAP[type] || [])
  );
  const config = isComputerAccessories
    ? {
        ...ELECTRONICS_CONFIG[subcategory],
        brandGroups: buildBrandGroups(accessoryPriorityBrands),
        brandOptions: undefined,
      }
    : ELECTRONICS_CONFIG[subcategory];

  const otherBrandOptions = isMobileDevices
    ? [...PHONE_BRAND_GROUPS.flatMap((group) => group.options.map((option) => option.value).filter((value) => value !== "Other")), ...ETHIOPIAN_ELECTRONICS_BRANDS, "Other"]
    : isTvAudio
      ? Array.from(new Set(Object.values(TV_AUDIO_BRAND_MAP).flat()))
      : [...ELECTRONICS_BRANDS, ...ETHIOPIAN_ELECTRONICS_BRANDS, "Other"];

  return (
    <div className="sellSection">
      <h2 className="sellCardTitle sellCardTitleCompact">Electronics details</h2>
      <div className="sellGrid">
        {config ? (
          <BrandModelFields
            key={`electronics-brand-model-${subcategory}`}
            selectScope={subcategory}
            details={details}
            brandGroups={config.brandGroups}
            brandOptions={config.brandOptions}
            modelSuggestions={config.modelSuggestions}
            onField={onField}
            brandLabel={config.brandLabel}
            modelLabel={config.modelLabel}
          />
        ) : null}
        {subcategory === "Other" ? <BrandModelFields key={`electronics-brand-model-${subcategory}`} selectScope={subcategory} details={details} brandOptions={Array.from(new Set(otherBrandOptions))} onField={onField} /> : null}
        {isPhone ? (
          <>
            <ChoicePills key={`${subcategory}-condition`} label="Condition" value={details["Condition"] || ""} options={["New", "Used", "Refurbished"]} onChange={onCondition} />
            <TextField label="Screen Size" value={details["Screen Size"] || ""} onChange={(value) => onField("Screen Size", value)} />
            <TextField label="RAM" value={details["RAM"] || ""} onChange={(value) => onField("RAM", value)} />
            <GbTbStorageRow displayLabel="Internal Storage" combinedKey="Internal Storage" details={details} onField={onField} />
            <ColorSelect label="Color" value={details["Color"] || ""} onChange={(value) => onField("Color", value)} />
            <SearchableSelect key={`${subcategory}-operating-system`} label="Operating System" value={details["Operating System"] || ""} options={(isAppleBrand ? ["iOS"] : ["Android", "Windows Mobile", "Other"]).map(toOption)} onChange={(value) => onField("Operating System", value)} disabled={phoneOsLocked} />
            <SearchableSelect key={`${subcategory}-display-type`} label="Display Type" value={details["Display Type"] || ""} options={MOBILE_DISPLAY_TYPE_OPTIONS.map(toOption)} onChange={(value) => onField("Display Type", value)} />
            <SearchableSelect key={`${subcategory}-resolution`} label="Resolution" value={details["Resolution"] || ""} options={["720p", "1080p", "1440p", "4K"].map(toOption)} onChange={(value) => onField("Resolution", value)} />
            <SearchableSelect key={`${subcategory}-sim-type`} label="SIM Type" value={details["SIM Type"] || ""} options={["Unlocked", "Ethio Telecom", "Safaricom"].map(toOption)} onChange={(value) => onField("SIM Type", value)} />
            <SearchableSelect
              key={`${subcategory}-sim-count`}
              label="SIM Count"
              value={details["SIM Count"] || ""}
              options={["Single SIM", "Dual SIM", "Dual SIM + eSIM", "eSIM only", "Triple SIM", "Other"].map(toOption)}
              onChange={(value) => onField("SIM Count", value)}
            />
            <RadioGroup label="Card Slot" value={details["Card Slot"] || "No"} options={["Yes", "No"]} onChange={(value) => onField("Card Slot", value)} />
            <TextField label="Main Camera" value={details["Main Camera"] || ""} onChange={(value) => onField("Main Camera", value)} />
            <TextField label="Selfie Camera" value={details["Selfie Camera"] || ""} onChange={(value) => onField("Selfie Camera", value)} />
            <TextField label="Battery Capacity (mAh)" value={details["Battery Capacity (mAh)"] || ""} onChange={(value) => onField("Battery Capacity (mAh)", value)} />
            {brandShowsBatteryHealthForMobile(details) ? (
              <BatteryHealthPercentField value={details["Battery Health (%)"] || ""} onChange={(value) => onField("Battery Health (%)", value)} />
            ) : null}
            <RadioGroup label="Exchange Possible" value={details["Exchange Possible"] || "No"} options={["Yes", "No"]} onChange={(value) => onField("Exchange Possible", value)} />
          </>
        ) : null}
        {subcategory === "Tablets" ? (
          <>
            <ChoicePills key={`${subcategory}-condition`} label="Condition" value={details["Condition"] || ""} options={["New", "Used", "Refurbished"]} onChange={onCondition} />
            <TextField label="Screen Size" value={details["Screen Size"] || ""} onChange={(value) => onField("Screen Size", value)} />
            <TextField label="RAM" value={details["RAM"] || ""} onChange={(value) => onField("RAM", value)} />
            <GbTbStorageRow displayLabel="Storage" combinedKey="Storage" details={details} onField={onField} />
            <SearchableSelect key={`${subcategory}-os`} label="Operating System" value={details["Operating System"] || ""} options={(isAppleBrand ? ["iOS"] : ["Android", "Windows", "Other"]).map(toOption)} onChange={(value) => onField("Operating System", value)} disabled={phoneOsLocked} />
            <TextField label="Connectivity" value={details["Connectivity"] || ""} onChange={(value) => onField("Connectivity", value)} placeholder="Wi-Fi / SIM / eSIM" />
          </>
        ) : null}
        {subcategory === "Smartwatches" ? (
          <>
            <ChoicePills key={`${subcategory}-condition`} label="Condition" value={details["Condition"] || ""} options={["Brand New", "Slightly Used", "Used"]} onChange={onCondition} />
            <TextField label="Case Size (mm)" value={details["Case Size (mm)"] || ""} onChange={(value) => onField("Case Size (mm)", value)} />
            <TextField label="Band Material" value={details["Band Material"] || ""} onChange={(value) => onField("Band Material", value)} />
            <SearchableSelect key={`${subcategory}-connectivity`} label="Connectivity" value={details["Connectivity"] || ""} options={["Bluetooth", "Wi-Fi", "LTE", "GPS", "Multiple"].map(toOption)} onChange={(value) => onField("Connectivity", value)} />
            <TextField label="Battery Capacity (mAh)" value={details["Battery Capacity (mAh)"] || ""} onChange={(value) => onField("Battery Capacity (mAh)", value)} />
          </>
        ) : null}
        {subcategory === "Mobile Accessories" ? (
          <>
            <ChoicePills key={`${subcategory}-condition`} label="Condition" value={details["Condition"] || ""} options={["Brand New", "Slightly Used", "Used"]} onChange={onCondition} />
            <TextField label="Accessory Type" value={details["Accessory Type"] || ""} onChange={(value) => onField("Accessory Type", value)} />
            <TextField label="Compatibility" value={details["Compatibility"] || ""} onChange={(value) => onField("Compatibility", value)} />
            <TextField label="Quantity" value={details["Quantity"] || ""} onChange={(value) => onField("Quantity", value)} />
            <TextAreaField label="Other" value={details["Other"] || ""} onChange={(value) => onField("Other", value)} />
          </>
        ) : null}
        {subcategory === "Mobile Spare Parts" ? (
          <>
            <ChoicePills key={`${subcategory}-condition`} label="Condition" value={details["Condition"] || ""} options={["Brand New", "Slightly Used", "Used"]} onChange={onCondition} />
            <TextField label="Part Type" value={details["Part Type"] || ""} onChange={(value) => onField("Part Type", value)} />
            <TextField label="Compatibility" value={details["Compatibility"] || ""} onChange={(value) => onField("Compatibility", value)} />
            <TextField label="Part Number" value={details["Part Number"] || ""} onChange={(value) => onField("Part Number", value)} />
            <TextField label="Warranty" value={details["Warranty"] || ""} onChange={(value) => onField("Warranty", value)} />
            <TextAreaField label="Other" value={details["Other"] || ""} onChange={(value) => onField("Other", value)} />
          </>
        ) : null}
        {subcategory === "Laptops" ? (
          <>
            <ChoicePills key={`${subcategory}-condition`} label="Condition" value={details["Condition"] || ""} options={["Brand New", "Slightly Used", "Used"]} onChange={onCondition} />
            <TextField label="Processor (CPU)" value={details["Processor (CPU)"] || ""} onChange={(value) => onField("Processor (CPU)", value)} />
            <LaptopDesktopGpuSection details={details} onField={onField} />
            <TextField label="RAM" value={details["RAM"] || ""} onChange={(value) => onField("RAM", value)} />
            <GbTbStorageRow displayLabel="Storage" combinedKey="Storage" details={details} onField={onField} />
            <TextField label="Screen Size" value={details["Screen Size"] || ""} onChange={(value) => onField("Screen Size", value)} />
            <LaptopDesktopOsSection details={details} onField={onField} />
            <TextField label="Battery Capacity (mAh)" value={details["Battery Capacity (mAh)"] || ""} onChange={(value) => onField("Battery Capacity (mAh)", value)} />
          </>
        ) : null}
        {subcategory === "Televisions" ? (
          <>
            <NumberField label="Screen Size" value={details["Screen Size"] || ""} onChange={(value) => onField("Screen Size", value)} suffix="inches" />
            <SearchableSelect key={`${subcategory}-connectivity`} label="Connectivity" value={details["Connectivity"] || ""} options={["Wired", "Wireless", "Both"].map(toOption)} onChange={(value) => onField("Connectivity", value)} />
            <MultiSelectField label="Features" values={splitList(details["Features"])} options={["Smart", "HDR", "Dolby", "Other"]} onChange={(values) => onField("Features", values.join(", "))} />
            {splitList(details["Features"]).includes("Other") ? <TextAreaField label="Other" value={details["Other"] || ""} onChange={(value) => onField("Other", value)} /> : null}
          </>
        ) : null}
        {subcategory === "Home Theater Systems" ? (
          <>
            <NumberField label="Channels / Specs" value={details["Channels / Specs"] || ""} onChange={(value) => onField("Channels / Specs", value)} />
            <SearchableSelect key={`${subcategory}-connectivity`} label="Connectivity" value={details["Connectivity"] || ""} options={["Wired", "Wireless", "Both"].map(toOption)} onChange={(value) => onField("Connectivity", value)} />
            <TextAreaField label="Other" value={details["Other"] || ""} onChange={(value) => onField("Other", value)} />
          </>
        ) : null}
        {subcategory === "Speakers" ? (
          <>
            <SearchableSelect key={`${subcategory}-type`} label="Type" value={details["Type"] || ""} options={["Bluetooth", "Wired", "Other"].map(toOption)} onChange={(value) => onField("Type", value)} />
            <NumberField label="Power Output" value={details["Power Output"] || ""} onChange={(value) => onField("Power Output", value)} suffix="Watts" />
            <TextAreaField label="Other" value={details["Other"] || ""} onChange={(value) => onField("Other", value)} />
          </>
        ) : null}
        {subcategory === "Headphones" ? (
          <>
            <SearchableSelect key={`${subcategory}-type`} label="Type" value={details["Type"] || ""} options={["Over-ear", "In-ear", "On-ear"].map(toOption)} onChange={(value) => onField("Type", value)} />
            <SearchableSelect key={`${subcategory}-connectivity`} label="Connectivity" value={details["Connectivity"] || ""} options={["Wired", "Wireless", "Both"].map(toOption)} onChange={(value) => onField("Connectivity", value)} />
            <TextAreaField label="Other" value={details["Other"] || ""} onChange={(value) => onField("Other", value)} />
          </>
        ) : null}
        {subcategory === "DVD & Media Players" ? (
          <>
            <SearchableSelect key={`${subcategory}-type`} label="Type" value={details["Type"] || ""} options={["DVD", "Blu-ray", "Other"].map(toOption)} onChange={(value) => onField("Type", value)} />
            <SearchableSelect key={`${subcategory}-connectivity`} label="Connectivity" value={details["Connectivity"] || ""} options={["Wired", "Wireless", "Both"].map(toOption)} onChange={(value) => onField("Connectivity", value)} />
            <TextAreaField label="Other" value={details["Other"] || ""} onChange={(value) => onField("Other", value)} />
          </>
        ) : null}
        {subcategory === "Networking Equipment" ? (
          <>
            <TextField label="Ports" value={details["Ports"] || ""} onChange={(value) => onField("Ports", value)} />
            <TextField label="Wireless Standard" value={details["Wireless Standard"] || ""} onChange={(value) => onField("Wireless Standard", value)} />
            <TextAreaField label="Other" value={details["Other"] || ""} onChange={(value) => onField("Other", value)} />
          </>
        ) : null}
        {subcategory === "Desktop Computers" ? (
          <>
            <ChoicePills key={`${subcategory}-condition`} label="Condition" value={details["Condition"] || ""} options={["Brand New", "Slightly Used", "Used"]} onChange={onCondition} />
            <TextField label="Processor (CPU)" value={details["Processor (CPU)"] || ""} onChange={(value) => onField("Processor (CPU)", value)} />
            <LaptopDesktopGpuSection details={details} onField={onField} />
            <TextField label="RAM" value={details["RAM"] || ""} onChange={(value) => onField("RAM", value)} />
            <GbTbStorageRow displayLabel="Storage" combinedKey="Storage" details={details} onField={onField} />
            <TextField label="Motherboard" value={details["Motherboard"] || ""} onChange={(value) => onField("Motherboard", value)} />
            <TextField label="Power Supply (PSU)" value={details["Power Supply (PSU)"] || ""} onChange={(value) => onField("Power Supply (PSU)", value)} />
            <TextField label="Case Type" value={details["Case Type"] || ""} onChange={(value) => onField("Case Type", value)} />
            <LaptopDesktopOsSection details={details} onField={onField} />
          </>
        ) : null}
        {subcategory === "Computer Accessories" ? (
          <>
            <MultiCheckboxDropdownField
              label="Accessory Type"
              values={computerAccessoryTypes}
              options={COMPUTER_ACCESSORY_TYPE_OPTIONS}
              onChange={(values) => onField("Accessory Type", values.join(", "))}
              placeholder="Select accessory type"
            />
            <TextField label="Compatibility" value={details["Compatibility"] || ""} onChange={(value) => onField("Compatibility", value)} />
            <TextAreaField label="Other" value={details["Other"] || ""} onChange={(value) => onField("Other", value)} />
          </>
        ) : null}
        {subcategory === "Printers & Scanners" ? (
          <>
            <ChoicePills key={`${subcategory}-condition`} label="Condition" value={details["Condition"] || ""} options={["Brand New", "Slightly Used", "Used"]} onChange={onCondition} />
            <SearchableSelect key={`${subcategory}-type`} label="Type" value={details["Type"] || ""} options={["Printer", "Scanner", "All-in-One", "Other"].map(toOption)} onChange={(value) => onField("Type", value)} />
            <SearchableSelect key={`${subcategory}-print-technology`} label="Print Technology" value={details["Print Technology"] || ""} options={["Inkjet", "Laser", "Thermal", "Dot Matrix", "Other"].map(toOption)} onChange={(value) => onField("Print Technology", value)} />
            <SearchableSelect key={`${subcategory}-connectivity`} label="Connectivity" value={details["Connectivity"] || ""} options={["USB", "Wi-Fi", "Ethernet", "Bluetooth", "Multiple"].map(toOption)} onChange={(value) => onField("Connectivity", value)} />
            <TextAreaField label="Other" value={details["Other"] || ""} onChange={(value) => onField("Other", value)} />
          </>
        ) : null}
        {subcategory === "Software" ? (
          <>
            <SearchableSelect key={`${subcategory}-type`} label="Type" value={details["Type"] || ""} options={["Operating System", "Productivity", "Design", "Development", "Security", "Other"].map(toOption)} onChange={(value) => onField("Type", value)} />
            <SearchableSelect key={`${subcategory}-license`} label="License Type" value={details["License Type"] || ""} options={["Lifetime", "Subscription", "Trial", "Other"].map(toOption)} onChange={(value) => onField("License Type", value)} />
            <TextField label="Supported Platform" value={details["Supported Platform"] || ""} onChange={(value) => onField("Supported Platform", value)} />
            <TextAreaField label="Other" value={details["Other"] || ""} onChange={(value) => onField("Other", value)} />
          </>
        ) : null}
        {subcategory === "Other" ? (
          <>
            <ChoicePills key={`${subcategory}-condition`} label="Condition" value={details["Condition"] || ""} options={["Brand New", "Slightly Used", "Used"]} onChange={onCondition} />
            <TextField label="Type" value={details["Type"] || ""} onChange={(value) => onField("Type", value)} />
            <TextField label="Main Specs" value={details["Main Specs"] || ""} onChange={(value) => onField("Main Specs", value)} />
            <TextAreaField label="Other" value={details["Other"] || ""} onChange={(value) => onField("Other", value)} />
          </>
        ) : null}
        <PriceField value={details["Price (ETB)"] || ""} onChange={onPrice} />
        <PricingTypeField details={details} onField={onField} />
      </div>
      {!details["Other"] ? <TextAreaField label="Description" value={details["Description"] || ""} onChange={onDescription} /> : null}
    </div>
  );
}

function CategoryForm({
  category,
  details,
  subcategory,
  onField,
  onPrice,
  onDescription,
  onCondition,
}: {
  category: string;
  details: Record<string, string>;
  subcategory: string;
  onField: (key: string, value: string) => void;
  onPrice: (value: string) => void;
  onDescription: (value: string) => void;
  onCondition: (value: string) => void;
}) {
  const isResidentialRealEstate = category === "Real Estate" && REAL_ESTATE_RESIDENTIAL_SUBCATEGORIES.has(subcategory);

  return (
    <div className="sellSection">
      <h2 className="sellCardTitle sellCardTitleCompact">{category} details</h2>
      <div className="sellGrid">
        {category === "Home, Furniture & Appliances" ? (
          <>
            {["Living Room Furniture", "Bedroom Furniture", "Office Furniture"].includes(subcategory) ? (
              <>
                <SearchableSelect label="Item Type" value={details["Item Type"] || ""} options={FURNITURE_ITEM_OPTIONS.map(toOption)} onChange={(value) => onField("Item Type", value)} />
                {details["Item Type"] === "Other" ? <TextField label="Enter Item Type" value={details["Custom Item Type"] || ""} onChange={(value) => onField("Custom Item Type", value)} /> : null}
                <SearchableSelect label="Material" value={details["Material"] || ""} options={FURNITURE_MATERIAL_OPTIONS.map(toOption)} onChange={(value) => onField("Material", value)} />
                {details["Material"] === "Other" ? <TextField label="Enter Material" value={details["Custom Material"] || ""} onChange={(value) => onField("Custom Material", value)} /> : null}
                <TextField label="Dimensions" value={details["Dimensions"] || ""} onChange={(value) => onField("Dimensions", value)} placeholder="L x W x H" />
                <ColorSelect label="Color" value={details["Color"] || ""} onChange={(value) => onField("Color", value)} />
                <TextAreaField label="Other" value={details["Other"] || ""} onChange={(value) => onField("Other", value)} />
              </>
            ) : (
              <>
                {["Kitchen Appliances", "Home Appliances"].includes(subcategory) ? (
                  <BrandModelFields details={details} brandOptions={[...HOME_APPLIANCE_BRANDS.slice(0, -1), ...ETHIOPIAN_ELECTRONICS_BRANDS, "Other"]} onField={onField} />
                ) : null}
                {["Home Decor", "Garden Supplies", "Other"].includes(subcategory) ? (
                  <>
                    <TextField label="Item Type" value={details["Item Type"] || ""} onChange={(value) => onField("Item Type", value)} />
                    <TextField label="Material / Specs" value={details["Material / Specs"] || ""} onChange={(value) => onField("Material / Specs", value)} />
                    <TextAreaField label="Other" value={details["Other"] || ""} onChange={(value) => onField("Other", value)} />
                  </>
                ) : null}
              </>
            )}
            {["Kitchen Appliances", "Home Appliances"].includes(subcategory) ? (
              <>
                <SearchableSelect label="Type" value={details["Type"] || ""} options={HOME_APPLIANCE_TYPE_OPTIONS.map(toOption)} onChange={(value) => onField("Type", value)} />
                {details["Type"] === "Other" ? <TextField label="Enter Type" value={details["Custom Type"] || ""} onChange={(value) => onField("Custom Type", value)} /> : null}
                <SearchableSelect label="Power Source" value={details["Power Source"] || ""} options={["Electric", "Gas", "Other"].map(toOption)} onChange={(value) => onField("Power Source", value)} />
                {details["Power Source"] === "Other" ? <TextField label="Enter Power Source" value={details["Custom Power Source"] || ""} onChange={(value) => onField("Custom Power Source", value)} /> : null}
                <TextAreaField label="Other" value={details["Other"] || ""} onChange={(value) => onField("Other", value)} />
              </>
            ) : null}
          </>
        ) : null}
        {category === "Real Estate" ? (
          <>
            {REAL_ESTATE_RESIDENTIAL_SUBCATEGORIES.has(subcategory) ? (
              <ResidentialRealEstateFields subcategory={subcategory} details={details} onField={onField} onPrice={onPrice} onDescription={onDescription} onCondition={onCondition} />
            ) : null}
            {subcategory === "Land & Plots" ? (
              <>
                <TextField label="Land Size" value={details["Land Size"] || ""} onChange={(value) => onField("Land Size", value)} />
                <SearchableSelect label="Land Use" value={details["Land Use"] || ""} options={["Residential", "Commercial", "Agricultural", "Mixed Use"].map(toOption)} onChange={(value) => onField("Land Use", value)} />
                <RadioGroup label="Title Deed Available" value={details["Title Deed Available"] || "No"} options={["Yes", "No"]} onChange={(value) => onField("Title Deed Available", value)} />
              </>
            ) : null}
            {subcategory === "Commercial Spaces" ? (
              <>
                <TextField label="Total Size" value={details["Total Size"] || ""} onChange={(value) => onField("Total Size", value)} />
                <SearchableSelect label="Property Type" value={details["Property Type"] || ""} options={["Office", "Shop", "Warehouse", "Building", "Other"].map(toOption)} onChange={(value) => onField("Property Type", value)} />
                <TextField label="Floor Number" value={details["Floor Number"] || ""} onChange={(value) => onField("Floor Number", value)} />
                <RadioGroup label="Parking Available" value={details["Parking Available"] || "No"} options={["Yes", "No"]} onChange={(value) => onField("Parking Available", value)} />
              </>
            ) : null}
            {subcategory === "Other" ? (
              <>
                <TextField label="Property Type" value={details["Property Type"] || ""} onChange={(value) => onField("Property Type", value)} />
                <TextField label="Total Size" value={details["Total Size"] || ""} onChange={(value) => onField("Total Size", value)} />
                <TextAreaField label="Other" value={details["Other"] || ""} onChange={(value) => onField("Other", value)} />
              </>
            ) : null}
          </>
        ) : null}
        {category === "Clothing & Fashion" ? (
          <>
            {["Men's Clothing", "Women's Clothing"].includes(subcategory) ? <BrandModelFields details={details} brandOptions={CATEGORY_BRAND_OPTIONS[subcategory] || ["Other"]} onField={onField} /> : null}
            {subcategory === "Shoes & Footwear" ? <BrandModelFields details={details} brandOptions={CATEGORY_BRAND_OPTIONS[subcategory] || ["Other"]} onField={onField} /> : null}
            {subcategory === "Bags & Backpacks" ? <BrandModelFields details={details} brandOptions={CATEGORY_BRAND_OPTIONS[subcategory] || ["Other"]} onField={onField} /> : null}
            {["Watches", "Jewelry", "Accessories"].includes(subcategory) ? <BrandModelFields details={details} brandOptions={CATEGORY_BRAND_OPTIONS[subcategory] || ["Other"]} onField={onField} /> : null}
            {["Men's Clothing", "Women's Clothing"].includes(subcategory) ? <SearchableSelect label="Size" value={details["Size"] || ""} options={["XS", "S", "M", "L", "XL", "XXL"].map(toOption)} onChange={(value) => onField("Size", value)} /> : null}
            {subcategory === "Shoes & Footwear" ? <TextField label="Size" value={details["Size"] || ""} onChange={(value) => onField("Size", value)} /> : null}
            {subcategory === "Bags & Backpacks" ? <TextField label="Size" value={details["Size"] || ""} onChange={(value) => onField("Size", value)} /> : null}
            <ColorSelect label="Color" value={details["Color"] || ""} onChange={(value) => onField("Color", value)} />
            <TextField label="Material" value={details["Material"] || ""} onChange={(value) => onField("Material", value)} />
            <TextAreaField label="Other" value={details["Other"] || ""} onChange={(value) => onField("Other", value)} />
          </>
        ) : null}
        {category === "Beauty & Personal Care" ? (
          <>
            <SearchableSelect label="Brand" value={details["Brand"] || ""} options={getBeautyBrands(subcategory).map(toOption)} onChange={(value) => onField("Brand", value)} />
            {details["Brand"] === "Other" ? <TextField label="Enter Brand Name" value={details["Custom Brand"] || ""} onChange={(value) => onField("Custom Brand", value)} /> : null}
            <SearchableSelect label="Type" value={details["Product Type"] || ""} options={getBeautyProductTypes(subcategory).map(toOption)} onChange={(value) => onField("Product Type", value)} />
            {details["Product Type"] === "Other" ? <TextField label="Enter Type" value={details["Custom Product Type"] || ""} onChange={(value) => onField("Custom Product Type", value)} /> : null}
            <SearchableSelect label="Gender" value={details["Gender"] || ""} options={BEAUTY_GENDER_OPTIONS.map(toOption)} onChange={(value) => onField("Gender", value)} />
            {subcategory === "Skincare" ? <SearchableSelect label="Skin Type" value={details["Skin Type"] || ""} options={BEAUTY_SKIN_TYPES.map(toOption)} onChange={(value) => onField("Skin Type", value)} /> : null}
            {subcategory === "Haircare" ? <SearchableSelect label="Hair Type" value={details["Hair Type"] || ""} options={BEAUTY_HAIR_TYPES.map(toOption)} onChange={(value) => onField("Hair Type", value)} /> : null}
            <SearchableSelect label="Condition" value={details["Condition"] || ""} options={BEAUTY_CONDITION_OPTIONS.map(toOption)} onChange={(value) => onField("Condition", value)} />
            <TextField label="Volume / Size" value={details["Size (ml / g)"] || ""} onChange={(value) => onField("Size (ml / g)", value)} placeholder="e.g. 250 ml" />
            <TextField label="Expiry Date" value={details["Expiry Date"] || ""} onChange={(value) => onField("Expiry Date", value)} placeholder="Optional" />
            <TextAreaField label="Other" value={details["Other"] || ""} onChange={(value) => onField("Other", value)} />
          </>
        ) : null}
        {category === "Services" ? (
          <>
            <SearchableSelect label="Service Type" value={details["Service Type"] || ""} options={serviceTypeOptions(subcategory).map(toOption)} onChange={(value) => onField("Service Type", value)} />
            <SearchableSelect label="Availability" value={details["Availability"] || ""} options={["Weekdays", "Weekends", "24/7", "By Appointment"].map(toOption)} onChange={(value) => onField("Availability", value)} />
            <TextField label="Response Time" value={details["Response Time"] || ""} onChange={(value) => onField("Response Time", value)} />
            <RadioGroup label="On-site Service" value={details["On-site Service"] || "No"} options={["Yes", "No"]} onChange={(value) => onField("On-site Service", value)} />
          </>
        ) : null}
        {category === CONSTRUCTION_MACHINERIES_REPAIRS_CATEGORY ? (
          <>
            <SearchableSelect label="Brand / Type" value={details["Brand"] || ""} options={(CATEGORY_BRAND_OPTIONS[category] || ["Other"]).map(toOption)} onChange={(value) => onField("Brand", value)} />
            {details["Brand"] === "Other" ? <TextField label="Enter Brand / Type" value={details["Custom Brand"] || ""} onChange={(value) => onField("Custom Brand", value)} /> : null}
            <SearchableSelect label="Supply Type" value={details["Supply Type"] || ""} options={["Building", "Electrical", "Plumbing", "Tooling"].map(toOption)} onChange={(value) => onField("Supply Type", value)} />
            <TextField label="Size / Capacity" value={details["Size / Capacity"] || ""} onChange={(value) => onField("Size / Capacity", value)} />
            <TextAreaField label="Other" value={details["Other"] || ""} onChange={(value) => onField("Other", value)} />
          </>
        ) : null}
        {category === "Commercial Equipment" ? (
          <>
            <SearchableSelect label="Brand / Type" value={details["Brand"] || ""} options={(CATEGORY_BRAND_OPTIONS[category] || ["Other"]).map(toOption)} onChange={(value) => onField("Brand", value)} />
            {details["Brand"] === "Other" ? <TextField label="Enter Brand / Type" value={details["Custom Brand"] || ""} onChange={(value) => onField("Custom Brand", value)} /> : null}
            <TextField label="Model" value={details["Model"] || ""} onChange={(value) => onField("Model", value)} />
            <SearchableSelect label="Power Source" value={details["Power Source"] || ""} options={["Electric", "Diesel", "Petrol", "Manual", "Hydraulic"].map(toOption)} onChange={(value) => onField("Power Source", value)} />
            <TextField label="Capacity / Output" value={details["Capacity / Output"] || ""} onChange={(value) => onField("Capacity / Output", value)} />
            <TextAreaField label="Other" value={details["Other"] || ""} onChange={(value) => onField("Other", value)} />
          </>
        ) : null}
        {category === "Leisure & Hobbies" ? (
          <>
            <SearchableSelect label="Brand / Type" value={details["Brand"] || ""} options={(CATEGORY_BRAND_OPTIONS[category] || ["Other"]).map(toOption)} onChange={(value) => onField("Brand", value)} />
            {details["Brand"] === "Other" ? <TextField label="Enter Brand / Type" value={details["Custom Brand"] || ""} onChange={(value) => onField("Custom Brand", value)} /> : null}
            <TextField label="Model" value={details["Model"] || ""} onChange={(value) => onField("Model", value)} />
            <SearchableSelect label="Skill Level" value={details["Skill Level"] || ""} options={["Beginner", "Intermediate", "Advanced", "All Levels"].map(toOption)} onChange={(value) => onField("Skill Level", value)} />
            <TextField label="Material / Type" value={details["Material / Type"] || ""} onChange={(value) => onField("Material / Type", value)} />
            <TextAreaField label="Other" value={details["Other"] || ""} onChange={(value) => onField("Other", value)} />
          </>
        ) : null}
        {category === "Kids & Baby Items" ? (
          <>
            <SearchableSelect label="Brand / Type" value={details["Brand"] || ""} options={(CATEGORY_BRAND_OPTIONS[category] || ["Other"]).map(toOption)} onChange={(value) => onField("Brand", value)} />
            {details["Brand"] === "Other" ? <TextField label="Enter Brand / Type" value={details["Custom Brand"] || ""} onChange={(value) => onField("Custom Brand", value)} /> : null}
            <TextField label="Age Range" value={details["Age Range"] || ""} onChange={(value) => onField("Age Range", value)} />
            <SearchableSelect label="Gender" value={details["Gender"] || ""} options={["Male", "Female", "Unisex"].map(toOption)} onChange={(value) => onField("Gender", value)} />
            <TextField label="Size" value={details["Size"] || ""} onChange={(value) => onField("Size", value)} />
            <TextField label="Material" value={details["Material"] || ""} onChange={(value) => onField("Material", value)} />
            <TextAreaField label="Other" value={details["Other"] || ""} onChange={(value) => onField("Other", value)} />
          </>
        ) : null}
        {category === "Agriculture & Farming" ? (
          <>
            <SearchableSelect label="Brand / Type" value={details["Brand"] || ""} options={(CATEGORY_BRAND_OPTIONS[category] || ["Other"]).map(toOption)} onChange={(value) => onField("Brand", value)} />
            {details["Brand"] === "Other" ? <TextField label="Enter Brand / Type" value={details["Custom Brand"] || ""} onChange={(value) => onField("Custom Brand", value)} /> : null}
            <TextField label="Quantity" value={details["Quantity"] || ""} onChange={(value) => onField("Quantity", value)} />
            <SearchableSelect label="Unit" value={details["Unit"] || ""} options={["kg", "ton", "liter", "bag", "crate"].map(toOption)} onChange={(value) => onField("Unit", value)} />
            <SearchableSelect label="Product Type" value={details["Product Type"] || ""} options={foodTypeOptions(subcategory).map(toOption)} onChange={(value) => onField("Product Type", value)} />
            <TextField label="Harvest / Production Date" value={details["Harvest / Production Date"] || ""} onChange={(value) => onField("Harvest / Production Date", value)} />
            <TextAreaField label="Other" value={details["Other"] || ""} onChange={(value) => onField("Other", value)} />
          </>
        ) : null}
        {category === "Pets & Animals" ? (
          <>
            <SearchableSelect label="Brand / Type" value={details["Brand"] || ""} options={(CATEGORY_BRAND_OPTIONS[category] || ["Other"]).map(toOption)} onChange={(value) => onField("Brand", value)} />
            {details["Brand"] === "Other" ? <TextField label="Enter Brand / Type" value={details["Custom Brand"] || ""} onChange={(value) => onField("Custom Brand", value)} /> : null}
            <TextField label="Age" value={details["Age"] || ""} onChange={(value) => onField("Age", value)} />
            <TextField label="Breed" value={details["Breed"] || ""} onChange={(value) => onField("Breed", value)} />
            <RadioGroup label="Vaccination Status" value={details["Vaccination Status"] || "No"} options={["Yes", "No"]} onChange={(value) => onField("Vaccination Status", value)} />
            <SearchableSelect label="Sex" value={details["Sex"] || ""} options={["Male", "Female", "Unknown"].map(toOption)} onChange={(value) => onField("Sex", value)} />
            <TextAreaField label="Other" value={details["Other"] || ""} onChange={(value) => onField("Other", value)} />
          </>
        ) : null}
        {category === "Jobs & Employment" || category === "Job Seekers (CVs)" ? (
          <>
            <TextField label="Salary" value={details["Salary"] || ""} onChange={(value) => onField("Salary", value)} />
            <SearchableSelect label="Job Type" value={details["Job Type"] || ""} options={["Full-Time", "Part-Time", "Remote", "Contract", "Internship"].map(toOption)} onChange={(value) => onField("Job Type", value)} />
            <SearchableSelect label="Experience Level" value={details["Experience Level"] || ""} options={["Entry Level", "Mid Level", "Senior Level", "Expert"].map(toOption)} onChange={(value) => onField("Experience Level", value)} />
            <TextField label="Qualification / Skills" value={details["Qualification / Skills"] || ""} onChange={(value) => onField("Qualification / Skills", value)} />
            <TextAreaField label="Other" value={details["Other"] || ""} onChange={(value) => onField("Other", value)} />
          </>
        ) : null}
        {!isResidentialRealEstate ? <PriceField value={details["Price (ETB)"] || ""} onChange={onPrice} /> : null}
        {!isResidentialRealEstate ? <PricingTypeField details={details} onField={onField} /> : null}
      </div>
      {!isResidentialRealEstate ? <TextAreaField label="Description" value={details["Description"] || ""} onChange={onDescription} /> : null}
    </div>
  );
}

function DeliveryFields({
  available,
  charged,
  charge,
  onAvailable,
  onCharged,
  onCharge,
}: {
  available: boolean;
  charged: boolean;
  charge: string;
  onAvailable: (value: boolean) => void;
  onCharged: (value: boolean) => void;
  onCharge: (value: string) => void;
}) {
  return (
    <div className="sellSection">
      <h2 className="sellCardTitle sellCardTitleCompact">Delivery</h2>
      <div className="sellGrid">
        <RadioGroup label="Delivery available" value={available ? "Yes" : "No"} options={["Yes", "No"]} onChange={(value) => onAvailable(value === "Yes")} />
        {available ? <RadioGroup label="Delivery charged?" value={charged ? "Yes" : "No"} options={["Yes", "No"]} onChange={(value) => onCharged(value === "Yes")} /> : null}
        {available && charged ? <TextField label="Delivery charge" value={charge} onChange={onCharge} placeholder="ETB or %" /> : null}
      </div>
    </div>
  );
}

function BrandField({ details, groups, onField }: { details: Record<string, string>; groups: SelectGroup[]; onField: (key: string, value: string) => void }) {
  const brand = details["Brand"] || "";
  return (
    <>
      <SearchableSelect label="Brand" value={brand} groups={groups} onChange={(value) => onField("Brand", value)} />
      {brand === "Other" ? <TextField label="Enter Brand Name" value={details["Custom Brand"] || ""} onChange={(value) => onField("Custom Brand", value)} /> : null}
    </>
  );
}

function BrandModelFields({
  details,
  brandOptions,
  brandGroups,
  modelSuggestions,
  onField,
  brandLabel = "Brand",
  modelLabel = "Model",
  selectScope = "default",
}: {
  details: Record<string, string>;
  brandOptions?: string[];
  brandGroups?: SelectGroup[];
  modelSuggestions?: Record<string, string[]>;
  onField: (key: string, value: string) => void;
  brandLabel?: string;
  modelLabel?: string;
  selectScope?: string;
}) {
  const brand = details["Brand"] || "";
  const customBrand = details["Custom Brand"] || "";
  const effectiveBrand = brand === "Other" ? customBrand : brand;
  const modelOptions = getModelSuggestions(brand, customBrand, modelSuggestions);
  const normalizedBrandOptions = Array.from(new Set([...(brandOptions || []), "Other"]));
  const normalizedBrandGroups = brandGroups?.map((group) => ({
    ...group,
    options: Array.from(new Set([...group.options.map((option) => option.value), "Other"])).map(toOption),
  }));
  const normalizedModelOptions = Array.from(new Set([...(modelOptions || []), "Other"]));

  return (
    <>
      <SearchableSelect key={`${selectScope}-${brandLabel}-brand`} label={brandLabel} value={brand} groups={normalizedBrandGroups} options={normalizedBrandOptions.map(toOption)} onChange={(value) => {
        onField("Brand", value === "Other" ? value : normalizeBrandName(value));
        if (value !== "Other") onField("Custom Brand", "");
        onField("Model", "");
        onField("Custom Model", "");
      }} />
      {brand === "Other" ? <TextField label="Enter Brand Name" value={customBrand} onChange={(value) => onField("Custom Brand", normalizeBrandName(value))} maxLength={80} /> : null}
      <SearchableSelect key={`${selectScope}-${modelLabel}-model`} label={modelLabel} value={details["Model"] || ""} options={normalizedModelOptions.map(toOption)} onChange={(value) => {
        onField("Model", value);
        if (value !== "Other") onField("Custom Model", "");
      }} />
      {details["Model"] === "Other" ? <TextField label="Enter Model" value={details["Custom Model"] || ""} onChange={(value) => onField("Custom Model", value)} placeholder={effectiveBrand ? `Enter ${effectiveBrand} model` : "Enter model"} maxLength={80} /> : null}
    </>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  type,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "number";
  maxLength?: number;
}) {
  const effectiveMaxLength = maxLength ?? (type === "number" ? undefined : 120);
  return (
    <label className="sellField">
      <span className="sellFieldLabel">{label}</span>
      <input className="sellInput" type={type || "text"} inputMode={type === "number" ? "numeric" : undefined} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} maxLength={effectiveMaxLength} />
    </label>
  );
}

function PriceField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <TextField label="Price (ETB)" value={value} onChange={onChange} placeholder="ETB" />;
}

function GbTbStorageRow({
  displayLabel,
  combinedKey,
  details,
  onField,
}: {
  displayLabel: string;
  combinedKey: "Internal Storage" | "Storage";
  details: Record<string, string>;
  onField: (key: string, value: string) => void;
}) {
  const valueKey = `${combinedKey} Value`;
  const unitKey = `${combinedKey} Unit`;
  const parsed = parseStorageString(details[combinedKey] || "");
  const rawValue = details[valueKey] || parsed.value;
  const unitRaw = (details[unitKey] || parsed.unit || "GB").toUpperCase();
  const unit = unitRaw === "TB" ? "TB" : "GB";

  return (
    <div className="sellField sellStorageGbTbRow">
      <span className="sellFieldLabel">{displayLabel}</span>
      <div className="sellStorageGbTbControls">
        <input
          type="number"
          className="sellInput"
          inputMode="decimal"
          value={rawValue}
          onChange={(e) => onField(valueKey, e.target.value)}
          min={0}
          step="any"
        />
        <div className="sellStorageUnitToggles" role="group" aria-label={`${displayLabel} unit`}>
          <button
            type="button"
            className={`sellStorageUnitToggle${unit === "GB" ? " sellStorageUnitToggleActive" : ""}`}
            onClick={() => onField(unitKey, "GB")}
          >
            GB
          </button>
          <button
            type="button"
            className={`sellStorageUnitToggle${unit === "TB" ? " sellStorageUnitToggleActive" : ""}`}
            onClick={() => onField(unitKey, "TB")}
          >
            TB
          </button>
        </div>
      </div>
    </div>
  );
}

function LaptopDesktopGpuSection({
  details,
  onField,
}: {
  details: Record<string, string>;
  onField: (key: string, value: string) => void;
}) {
  const vendor = details["GPU Vendor"] || "";
  return (
    <>
      <RadioGroup
        label="Graphics (GPU)"
        value={vendor}
        options={[...GPU_VENDOR_RADIO_OPTIONS]}
        onChange={(v) => {
          onField("GPU Vendor", v);
          if (v !== "Other") onField("GPU Other Name", "");
        }}
      />
      {vendor === "Other" ? (
        <TextField
          label="GPU name"
          value={details["GPU Other Name"] || ""}
          onChange={(t) => onField("GPU Other Name", t)}
          placeholder="e.g. Apple M3"
        />
      ) : null}
    </>
  );
}

function LaptopDesktopOsSection({
  details,
  onField,
}: {
  details: Record<string, string>;
  onField: (key: string, value: string) => void;
}) {
  const os = details["Operating System"] || "";
  const osOptions =
    os && !LAPTOP_DESKTOP_OS_OPTIONS.includes(os)
      ? [...LAPTOP_DESKTOP_OS_OPTIONS.filter((o) => o !== "Other"), os, "Other"]
      : LAPTOP_DESKTOP_OS_OPTIONS;
  return (
    <>
      <SearchableSelect
        label="Operating System"
        value={os}
        placeholder="Search or select OS"
        options={osOptions.map(toOption)}
        onChange={(v) => {
          onField("Operating System", v);
          if (v !== "Other") onField("Computer OS Other", "");
        }}
      />
      {os === "Other" ? (
        <TextField
          label="Specify operating system"
          value={details["Computer OS Other"] || ""}
          onChange={(t) => onField("Computer OS Other", t)}
          placeholder="e.g. Linux distro"
        />
      ) : null}
    </>
  );
}

function getPricingTypeSelectValue(details: Record<string, string>): string {
  const pt = details["pricing_type"];
  if (pt === "Negotiable" || pt === "Fixed") return pt;
  if (details["Price Type"] === "Negotiable") return "Negotiable";
  if (details["Negotiable?"] === "Yes") return "Negotiable";
  if (details["Price Type"] === "Fixed Price") return "Fixed";
  return "Fixed";
}

function PricingTypeField({ details, onField }: { details: Record<string, string>; onField: (key: string, value: string) => void }) {
  return (
    <SearchableSelect
      label="Pricing type"
      value={getPricingTypeSelectValue(details)}
      options={["Fixed", "Negotiable"].map(toOption)}
      onChange={(value) => {
        onField("pricing_type", value);
        onField("Price Type", "");
        onField("Negotiable?", "");
      }}
    />
  );
}

function BatteryHealthPercentField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <label className="sellField">
      <span className="sellFieldLabel">Battery Health (%)</span>
      <input
        type="number"
        className="sellInput"
        min={0}
        max={100}
        inputMode="numeric"
        value={value}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "") {
            onChange("");
            return;
          }
          const n = Number(raw);
          if (Number.isNaN(n)) return;
          onChange(String(Math.min(100, Math.max(0, Math.round(n)))));
        }}
        placeholder="0–100"
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  suffix?: string;
}) {
  return <TextField label={label} value={value} onChange={onChange} placeholder={suffix} type="number" />;
}

function TextAreaField({ label, value, onChange, maxLength }: { label: string; value: string; onChange: (value: string) => void; maxLength?: number }) {
  const effectiveMaxLength = maxLength ?? 850;
  return (
    <label className="sellField sellFieldFull">
      <span className="sellFieldLabel">{label}</span>
      <textarea className="sellTextarea" rows={4} value={value} onChange={(e) => onChange(e.target.value)} maxLength={effectiveMaxLength} />
      <span className="sellFieldHint">{value.length}/{effectiveMaxLength}</span>
    </label>
  );
}

function MultiCheckboxDropdownField({
  label,
  values,
  options,
  onChange,
  placeholder,
}: {
  label: string;
  values: string[];
  options: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [renderDropdown, setRenderDropdown] = useState(false);
  const [closing, setClosing] = useState(false);
  const ref = React.useRef<HTMLDivElement | null>(null);
  const closeTimerRef = React.useRef<number | null>(null);

  function closeDropdown() {
    setOpen(false);
    setClosing(true);
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(() => {
      setRenderDropdown(false);
      setClosing(false);
      closeTimerRef.current = null;
    }, 140);
  }

  useEffect(() => {
    function handleOutside(event: MouseEvent | PointerEvent | TouchEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        closeDropdown();
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") closeDropdown();
    }

    document.addEventListener("pointerdown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
      document.removeEventListener("keydown", handleEscape);
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    };
  }, [open, renderDropdown]);

  const summary = values.length > 0 ? values.join(", ") : (placeholder || `Select ${label}`);

  return (
    <div className="sellFieldWrapper">
      <div className="sellField" ref={ref}>
        <button
          type="button"
          className={`sellSelect sellSelectModern ${open ? "sellSelectActive" : ""}`}
          onClick={() => {
            if (open) {
              closeDropdown();
              return;
            }
            setRenderDropdown(true);
            setClosing(false);
            setOpen(true);
          }}
          aria-expanded={open}
          aria-haspopup="listbox"
        >
          <div className="sellSelectCopy">
            <span className="sellFieldLabel">{label}</span>
            <span className={values.length > 0 ? "sellValue" : "sellPlaceholder"}>{summary}</span>
          </div>
          <span className={`sellChevron ${open ? "isOpen" : ""}`}>v</span>
        </button>

        {renderDropdown ? (
          <div className={`sellDropdown sellDropdownModern ${closing ? "isClosing" : ""}`} role="listbox" aria-label={label}>
            <div className="sellChecklist">
              {options.map((option) => {
                const checked = values.includes(option);
                return (
                  <label key={option} className={`sellChecklistItem ${checked ? "isSelected" : ""}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onChange(checked ? values.filter((item) => item !== option) : [...values, option])}
                    />
                    <span>{option}</span>
                  </label>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function MultiSelectField({
  label,
  values,
  options,
  onChange,
}: {
  label: string;
  values: string[];
  options: string[];
  onChange: (values: string[]) => void;
}) {
  return (
    <div className="sellField">
      <span className="sellFieldLabel">{label}</span>
      <div className="sellChoiceRow">
        {options.map((option) => {
          const active = values.includes(option);
          return (
            <button
              key={option}
              type="button"
              className={`sellChip ${active ? "sellChipActive" : ""}`}
              onClick={() => onChange(active ? values.filter((item) => item !== option) : [...values, option])}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RadioGroup({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <div className="sellField">
      <span className="sellFieldLabel">{label}</span>
      <div className="sellChoiceRow">
        {options.map((option) => (
          <label key={option} className={`sellChip ${value === option ? "sellChipActive" : ""}`}>
            <input type="radio" name={label} checked={value === option} onChange={() => onChange(option)} />
            <span>{option}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function ChoicePills({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <div className="sellField">
      <span className="sellFieldLabel">{label}</span>
      <div className="sellChoiceRow">
        {options.map((option) => (
          <button key={option} type="button" className={`sellChip ${value === option ? "sellChipActive" : ""}`} onClick={() => onChange(option)}>
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function ColorSelect({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="sellField">
      <span className="sellFieldLabel">{label}</span>
      <div className="sellColorGrid">
        {COLORS.map((color) => (
          <button key={color} type="button" className={`sellColorOption ${value === color ? "sellColorOptionActive" : ""}`} onClick={() => onChange(color)}>
            <span className={`sellColorDot sellColorDot${color.replace(/\s+/g, "")}`} />
            <span>{color}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function SeatStepper({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <div className="sellField">
      <span className="sellFieldLabel">Seats</span>
      <StepperControl value={value} onChange={onChange} min={1} />
    </div>
  );
}

function BedroomStepper({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <div className="sellField">
      <span className="sellFieldLabel">Bedrooms</span>
      <StepperControl value={value} onChange={onChange} min={1} />
    </div>
  );
}

function CountStepper({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <div className="sellField">
      <span className="sellFieldLabel">{label}</span>
      <StepperControl value={value} onChange={onChange} min={1} />
    </div>
  );
}

function StepperControl({ value, onChange, min }: { value: number; onChange: (value: number) => void; min: number }) {
  const atMin = value <= min;
  return (
    <div className="sellStepper">
      <button
        type="button"
        className="sellStepperBtn"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={atMin}
        aria-label="Decrease count"
      >
        -
      </button>
      <div className="sellStepperValue">{value}</div>
      <button type="button" className="sellStepperBtn" onClick={() => onChange(value + 1)} aria-label="Increase count">
        +
      </button>
    </div>
  );
}

function ResidentialRealEstateFields({
  subcategory,
  details,
  onField,
  onPrice,
  onDescription,
  onCondition,
}: {
  subcategory: string;
  details: Record<string, string>;
  onField: (key: string, value: string) => void;
  onPrice: (value: string) => void;
  onDescription: (value: string) => void;
  onCondition: (value: string) => void;
}) {
  const propertyTypes = splitList(details["Property Type"]);
  const isApartmentSelected = propertyTypes.includes("Apartment");
  const bedroomCount = Math.max(1, Number(details["Bedrooms"] || "1") || 1);
  const bathroomCount = Math.max(1, Number((details["Bathrooms"] || "1").replace("+", "")) || 1);
  const toiletCount = Math.max(1, Number((details["Toilets"] || "1").replace("+", "")) || 1);
  const subcategoryListingType =
    subcategory === "Apartment or House for Sale"
      ? "For Sale"
      : subcategory === "Apartment or House for Rent"
        ? "For Rent"
        : "";
  const listingType = subcategoryListingType || details["Listing Type"] || "";
  const shouldShowListingType = !subcategoryListingType;

  return (
    <>
      <TextField label="Property Address" value={details["Property Address"] || ""} onChange={(value) => onField("Property Address", value)} maxLength={60} />
      <TextField label="Estate Name" value={details["Estate Name"] || ""} onChange={(value) => onField("Estate Name", value)} maxLength={60} />
      <TextField label="Property Size (sq meter)" value={details["Property Size"] || ""} onChange={(value) => onField("Property Size", value)} type="number" />
      <MultiCheckboxDropdownField
        label="Property Type"
        values={propertyTypes}
        options={REAL_ESTATE_PROPERTY_TYPES}
        onChange={(values) => onField("Property Type", values.join(", "))}
      />
      {isApartmentSelected ? (
        <>
          <SearchableSelect label="Condition" value={details["Condition"] || ""} options={REAL_ESTATE_CONDITION_OPTIONS.map(toOption)} onChange={onCondition} />
          <SearchableSelect label="Furnishing" value={details["Furnishing"] || ""} options={REAL_ESTATE_FURNISHING_OPTIONS.map(toOption)} onChange={(value) => onField("Furnishing", value)} />
          <BedroomStepper value={bedroomCount} onChange={(value) => onField("Bedrooms", String(value))} />
          <CountStepper label="Bathrooms" value={bathroomCount} onChange={(value) => onField("Bathrooms", String(value))} />
          <CountStepper label="Toilets" value={toiletCount} onChange={(value) => onField("Toilets", String(value))} />
          <MultiCheckboxDropdownField
            label="Facilities"
            values={splitList(details["Facilities"])}
            options={REAL_ESTATE_FACILITY_OPTIONS}
            onChange={(values) => onField("Facilities", values.join(", "))}
            placeholder="Select facilities"
          />
        </>
      ) : null}
      {shouldShowListingType ? <SearchableSelect label="Listing Type" value={listingType} options={REAL_ESTATE_LISTING_TYPE_OPTIONS.map(toOption)} onChange={(value) => onField("Listing Type", value)} /> : null}
      <SearchableSelect label="Listed By" value={details["Listed By"] || ""} options={REAL_ESTATE_LISTED_BY_OPTIONS.map(toOption)} onChange={(value) => onField("Listed By", value)} />
      <RadioGroup label="Service Charge" value={details["Service Charge"] || "No"} options={["Yes", "No"]} onChange={(value) => onField("Service Charge", value)} />
      {listingType === "For Rent" ? (
        <SearchableSelect label="Minimum Rental Period" value={details["Minimum Rental Period"] || ""} options={REAL_ESTATE_MIN_RENTAL_PERIOD_OPTIONS.map(toOption)} onChange={(value) => onField("Minimum Rental Period", value)} />
      ) : null}
      <PriceField value={details["Price (ETB)"] || ""} onChange={onPrice} />
      <TextAreaField label="Description" value={details["Description"] || ""} onChange={onDescription} maxLength={850} />
    </>
  );
}

function fashionTypeOptions(subcategory: string) {
  if (subcategory === "Shoes & Footwear") return ["Sneakers", "Sandals", "Boots", "Formal Shoes"];
  if (subcategory === "Accessories") return ["Bags", "Belts", "Watches", "Jewelry"];
  return ["T-Shirt", "Shirt", "Jeans", "Dress", "Jacket"];
}

function getModelSuggestions(brand?: string, customBrand?: string, modelSuggestions?: Record<string, string[]>) {
  const key = normalizeBrandName(brand === "Other" ? customBrand || "" : brand || "");
  return modelSuggestions?.[key] || MODEL_SUGGESTIONS[key] || [];
}

function readStoredDraft(): Draft | null {
  try {
    const raw = window.localStorage.getItem("sellDraft");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return normalizeSellDraftForStorage(parsed as Partial<StorableSellDraft>);
  } catch {
    return null;
  }
}

function splitList(value?: string) {
  return (value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getModelPlaceholder(brand?: string, customBrand?: string, modelSuggestions?: Record<string, string[]>) {
  const models = getModelSuggestions(brand, customBrand, modelSuggestions).slice(0, 2);
  return models.length ? `e.g. ${models.join(", ")}` : undefined;
}

function serviceTypeOptions(subcategory: string) {
  if (subcategory === "Repair & Maintenance") return ["Phone Repair", "Laptop Repair", "Appliance Repair", "Car Repair"];
  if (subcategory === "Construction") return ["Building", "Renovation", "Plumbing", "Electrical"];
  if (subcategory === "Cleaning Services") return ["Home Cleaning", "Office Cleaning", "Deep Cleaning", "Laundry"];
  if (subcategory === "Moving & Delivery Services") return ["Same Day Delivery", "Scheduled Delivery", "Courier", "Moving"];
  if (subcategory === "Beauty Services") return ["Hair Styling", "Makeup", "Nail Care", "Spa"];
  if (subcategory === "IT & Tech Services") return ["Web Development", "Networking", "Software Support", "Tech Setup"];
  if (subcategory === "Event Services") return ["Photography", "DJ", "Decoration", "MC"];
  return ["Business", "Legal", "Finance", "Strategy"];
}

function toOption(value: string): Option {
  return { value, label: value };
}

function foodTypeOptions(subcategory: string) {
  if (subcategory === "Farm Machinery") return ["Tractor", "Harvester", "Irrigation", "Sprayer"];
  if (subcategory === "Livestock") return ["Cattle", "Goats", "Sheep", "Poultry"];
  if (subcategory === "Seeds & Fertilizers") return ["Seeds", "Organic Fertilizer", "Chemical Fertilizer"];
  if (subcategory === "Agricultural Tools") return ["Hand Tools", "Water Pump", "Storage Equipment", "Safety Gear"];
  return ["General Farm Supply", "Mixed Inventory", "Other"];
}
