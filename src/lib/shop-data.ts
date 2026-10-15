import { getApiRating, getApiSizeAvailability, isApiOutOfStock } from "@/lib/api/product-mapper";
import pDailyPaperTee from "@/assets/p-daily-paper-tee.png";
import pNikeHoodieGreen from "@/assets/p-nike-hoodie-green.png";
import pAapeJacket from "@/assets/p-aape-jacket.png";
import pRepresentDenim from "@/assets/p-represent-denim.png";
import pEssentialsShorts from "@/assets/p-essentials-shorts.png";
import pNikeDunk from "@/assets/p-nike-dunk.png";
import pRepresentHoodie from "@/assets/p-represent-hoodie.png";
import pAmiriCap from "@/assets/p-amiri-cap.png";
import pTee from "@/assets/p-tee.png";
import pTee2 from "@/assets/p-tee2.png";
import pHoodie from "@/assets/p-hoodie.png";
import pSneaker from "@/assets/p-sneaker.png";
import pSneakerBlack from "@/assets/p-sneaker-black.png";
import pRunnerGrey from "@/assets/p-runner-grey.png";
import pLoafer from "@/assets/p-loafer.png";
import pCap from "@/assets/p-cap.png";
import pSlides from "@/assets/p-slides.png";
import pWatch from "@/assets/p-watch.png";
import pWatch2 from "@/assets/p-watch2.png";
import pFragrance from "@/assets/p-fragrance.png";

export type ColorOption = {
  name: string;
  hex: string;
};

export type Product = {
  id: string;
  brand: string;
  name: string;
  price: number;
  image: string;
  category: string;
  subcategory?: string;
  sizes: string[];
  colors: ColorOption[];
  availability: "In Stock" | "Pre Order" | "Limited Pieces" | "Restocked";
  isConcierge?: boolean;
  originalPrice?: number;
  description?: string;
  features?: string[];
  styleCode?: string;
  gallery?: string[];
  sizeLabels?: Record<string, string>;
  modelFit?: string;
};

const STANDARD_SIZE_NAMES: Record<string, string> = {
  XXS: "XXSmall", XS: "XSmall", S: "Small", M: "Medium",
  L: "Large", XL: "XLarge", XXL: "XXLarge", XXXL: "XXXLarge",
};

export const DESIGNER_CLOTHING_SIZE_LABELS: Record<string, string> = {
  XXS: "XXS (42)",
  XS: "XS (44)",
  S: "S (46)",
  M: "M (48)",
  L: "L (50)",
  XL: "XL (52)",
  XXL: "XXL (54)",
  XXXL: "XXXL (56)",
};

export function getProductSizeLabel(product: Product, size: string, customLabels?: Record<string, string>) {
  const custom = customLabels?.[size]?.trim();
  if (custom) return custom;
  const productLabel = product.sizeLabels?.[size]?.trim();
  if (productLabel) return productLabel;
  const standardName = STANDARD_SIZE_NAMES[size];
  return product.category === "clothing" && standardName ? standardName : size;
}

export function formatCartSize(size: string) {
  return STANDARD_SIZE_NAMES[size] ?? size;
}

export const formatNaira = (n: number) =>
  "₦" + new Intl.NumberFormat("en-NG").format(n);

export const categories = [
  { id: "clothing", name: "Clothing", itemCount: 342 },
  { id: "footwear", name: "Footwear", itemCount: 186 },
  { id: "accessories", name: "Accessories", itemCount: 94 },
  { id: "fragrances", name: "Fragrances", itemCount: 47 },
  { id: "sale", name: "Sale", itemCount: 24 },
];

export const subCategories: Record<string, string[]> = {
  clothing: [
    "All clothing",
    "T-shirts",
    "Tops",
    "Shirts",
    "Polo Shirts",
    "Hoodies & Sweatshirts",
    "Jackets & Jumpers",
    "Jorts/shorts",
    "Jeans & Trousers",
    "Underwear",
    "Swim Shorts",
  ],
  footwear: ["All footwear", "Sneakers & Trainers", "Shoes", "Sandals", "Flip Flops & Sliders"],
  accessories: ["All accessories", "Sunglasses", "Hats & Caps", "Bags", "Socks, Wallets & Belts", "Gloves & Scarves", "Watches"],
  fragrances: ["All fragrances", "Perfumes", "Body Mists", "Deodorants", "Gift Sets"],
  sale: ["Clothing", "Footwear", "Accessories", "Fragrances"],
};

export const sizes = ["XS", "S", "M", "L", "XL", "XXL"];

export const colorOptions: ColorOption[] = [
  { name: "Black", hex: "#0a0a0a" },
  { name: "White", hex: "#ffffff" },
  { name: "Grey", hex: "#808080" },
  { name: "Navy", hex: "#1a3a5f" },
  { name: "Green", hex: "#2d5a3d" },
  { name: "Brown", hex: "#8b6f5e" },
  { name: "Beige", hex: "#edebdf" },
  { name: "Red", hex: "#c44569" },
  { name: "Multicolor", hex: "linear" },
];

export const priceRanges = [
  { id: "under-100k", label: "Under ₦100,000", min: 0, max: 100000 },
  { id: "100k-250k", label: "₦100,000 - ₦250,000", min: 100000, max: 250000 },
  { id: "250k-500k", label: "₦250,000 - ₦500,000", min: 250000, max: 500000 },
  { id: "above-500k", label: "₦500,000 and above", min: 500000, max: Infinity },
];

export const availabilityOptions = [
  "In Stock",
  "Pre Order",
  "Limited Pieces",
  "Restocked",
] as const;

export const brands = [
  "AAPE",
  "AMIRI",
  "AXEL ARIGATO",
  "CASIO",
  "COMMON PROJECTS",
  "CREED",
  "DAILY PAPER",
  "DIOR",
  "ESSENTIALS",
  "G-SHOCK",
  "GUCCI",
  "NEW ERA",
  "NIKE",
  "REPRESENT",
  "TOM FORD",
];


export const sortOptions = [
  { id: "newest", label: "Newest Arrivals" },
  { id: "price-low", label: "Price: Low to High" },
  { id: "price-high", label: "Price: High to Low" },
  { id: "name-az", label: "Name: A-Z" },
];

export const shopProducts: Product[] = [
  {
    id: "c1",
    brand: "DAILY PAPER",
    name: "Alias T-Shirt - Black",
    price: 55000,
    image: pDailyPaperTee,
    category: "clothing",
    subcategory: "T-shirts",
    sizes: ["S", "M", "L", "XL"],
    colors: [{ name: "Black", hex: "#0a0a0a" }],
    availability: "In Stock",
  },
  {
    id: "c2",
    brand: "NIKE",
    name: "Club Fleece Hoodie - Green",
    price: 120000,
    image: pNikeHoodieGreen,
    category: "clothing",
    subcategory: "Hoodies & Sweatshirts",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: [
      { name: "Green", hex: "#2d5a3d" },
      { name: "Black", hex: "#0a0a0a" },
      { name: "Grey", hex: "#808080" },
    ],
    availability: "In Stock",
  },
  {
    id: "c3",
    brand: "AAPE",
    name: "Varsity Jacket - Cream",
    price: 180000,
    image: pAapeJacket,
    category: "clothing",
    subcategory: "Jackets & Jumpers",
    sizes: ["S", "M", "L", "XL"],
    colors: [{ name: "Beige", hex: "#edebdf" }],
    availability: "Limited Pieces",
  },
  {
    id: "c4",
    brand: "REPRESENT",
    name: "R3 Denim - Light Blue",
    price: 150000,
    image: pRepresentDenim,
    category: "clothing",
    subcategory: "Jeans & Trousers",
    sizes: ["30", "32", "34", "36"],
    sizeLabels: { "30": "S (30)", "32": "M (32)", "34": "L (34)", "36": "XL (36)" },
    modelFit: "Model is 6'1\" and wears size 32 for a regular fit.",
    colors: [{ name: "Blue", hex: "#7aa3c8" }],
    availability: "In Stock",
  },
  {
    id: "c5",
    brand: "ESSENTIALS",
    name: "Fleece Shorts - Black",
    price: 85000,
    image: pEssentialsShorts,
    category: "clothing",
    subcategory: "Jorts/shorts",
    sizes: ["S", "M", "L", "XL"],
    colors: [
      { name: "Black", hex: "#0a0a0a" },
      { name: "Grey", hex: "#808080" },
    ],
    availability: "Restocked",
  },
  {
    id: "f1",
    brand: "NIKE",
    name: "Dunk Low Retro - Black White",
    price: 160000,
    image: pNikeDunk,
    category: "footwear",
    subcategory: "Sneakers & Trainers",
    sizes: ["40", "41", "42", "43", "44", "45"],
    colors: [{ name: "Multicolor", hex: "linear" }],
    availability: "In Stock",
  },
  {
    id: "c6",
    brand: "REPRESENT",
    name: "Owners Club Hoodie - Black",
    price: 185000,
    image: pRepresentHoodie,
    category: "clothing",
    subcategory: "Hoodies & Sweatshirts",
    sizes: ["S", "M", "L", "XL"],
    colors: [{ name: "Black", hex: "#0a0a0a" }],
    availability: "In Stock",
  },
  {
    id: "a1",
    brand: "AMIRI",
    name: "MA Logo Cap - Black",
    price: 90000,
    image: pAmiriCap,
    category: "accessories",
    subcategory: "Hats & Caps",
    sizes: ["One Size"],
    colors: [{ name: "Black", hex: "#0a0a0a" }],
    availability: "In Stock",
  },
  // Extended duplicates for richer grids
  {
    id: "c7",
    brand: "DAILY PAPER",
    name: "Represent Owners Club Tee",
    price: 65000,
    image: pTee,
    category: "clothing",
    subcategory: "T-shirts",
    sizes: ["S", "M", "L", "XL"],
    colors: [
      { name: "Black", hex: "#0a0a0a" },
      { name: "White", hex: "#ffffff" },
    ],
    availability: "In Stock",
  },
  {
    id: "c8",
    brand: "DAILY PAPER",
    name: "Daily Paper Hoodie",
    price: 65000,
    image: pHoodie,
    category: "clothing",
    subcategory: "Hoodies & Sweatshirts",
    sizes: ["S", "M", "L", "XL"],
    colors: [{ name: "Beige", hex: "#edebdf" }],
    availability: "Pre Order",
  },
  {
    id: "f2",
    brand: "NIKE",
    name: "Air Force 1 '07",
    price: 115000,
    image: pSneaker,
    category: "footwear",
    subcategory: "Sneakers & Trainers",
    sizes: ["40", "41", "42", "43", "44"],
    colors: [
      { name: "White", hex: "#ffffff" },
      { name: "Black", hex: "#0a0a0a" },
    ],
    availability: "Restocked",
  },
  {
    id: "f3",
    brand: "AMIRI",
    name: "MA Pool Slides",
    price: 165000,
    image: pSlides,
    category: "footwear",
    subcategory: "Flip Flops & Sliders",
    sizes: ["40", "41", "42", "43"],
    colors: [{ name: "Black", hex: "#0a0a0a" }],
    availability: "In Stock",
    isConcierge: true,
  },
  {
    id: "a2",
    brand: "NEW ERA",
    name: "9Forty Cap",
    price: 28000,
    image: pCap,
    category: "accessories",
    subcategory: "Hats & Caps",
    sizes: ["One Size"],
    colors: [
      { name: "Black", hex: "#0a0a0a" },
      { name: "Navy", hex: "#1a3a5f" },
    ],
    availability: "In Stock",
  },
  {
    id: "a3",
    brand: "G-SHOCK",
    name: "GM-2100-1AER - Metal Covered Series",
    price: 235000,
    image: pWatch,
    category: "accessories",
    subcategory: "Watches",
    sizes: ["One Size"],
    colors: [{ name: "Black / Silver", hex: "#0a0a0a" }],
    availability: "Restocked",
    isConcierge: true,
  },
  {
    id: "a4",
    brand: "CASIO",
    name: "GBD-200-9ER",
    price: 150000,
    image: pWatch2,
    category: "accessories",
    subcategory: "Watches",
    sizes: ["One Size"],
    colors: [
      { name: "Black", hex: "#0a0a0a" },
      { name: "Yellow", hex: "#e8b84a" },
    ],
    availability: "Limited Pieces",
  },
  {
    id: "fr1",
    brand: "CREED",
    name: "Aventus Eau de Parfum",
    price: 450000,
    image: pFragrance,
    category: "fragrances",
    subcategory: "Perfumes",
    sizes: ["50ml", "100ml"],
    colors: [{ name: "Clear", hex: "#edebdf" }],
    availability: "In Stock",
    isConcierge: true,
  },
  // Extended product catalog
  {
    id: "c9",
    brand: "DAILY PAPER",
    name: "Alias T-Shirt - White",
    price: 85000,
    image: pTee2,
    category: "clothing",
    subcategory: "T-shirts",
    sizes: ["S", "M", "L", "XL"],
    colors: [
      { name: "White", hex: "#ffffff" },
      { name: "Black", hex: "#0a0a0a" },
    ],
    availability: "In Stock",
  },
  {
    id: "c10",
    brand: "NIKE",
    name: "Club Fleece Hoodie - Grey",
    price: 110000,
    image: pHoodie,
    category: "clothing",
    subcategory: "Hoodies & Sweatshirts",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: [
      { name: "Grey", hex: "#808080" },
      { name: "Black", hex: "#0a0a0a" },
    ],
    availability: "In Stock",
  },
  {
    id: "c11",
    brand: "ESSENTIALS",
    name: "Fleece Shorts - Grey",
    price: 55000,
    image: pEssentialsShorts,
    category: "clothing",
    subcategory: "Jorts/shorts",
    sizes: ["S", "M", "L", "XL"],
    colors: [
      { name: "Grey", hex: "#808080" },
      { name: "Black", hex: "#0a0a0a" },
    ],
    availability: "In Stock",
  },
  {
    id: "c12",
    brand: "REPRESENT",
    name: "R3 Denim - Dark Blue",
    price: 145000,
    image: pRepresentDenim,
    category: "clothing",
    subcategory: "Jeans & Trousers",
    sizes: ["30", "32", "34", "36"],
    colors: [{ name: "Blue", hex: "#3b5a7a" }],
    availability: "In Stock",
  },
  {
    id: "c13",
    brand: "AAPE",
    name: "Varsity Jacket - Black",
    price: 175000,
    image: pAapeJacket,
    category: "clothing",
    subcategory: "Jackets & Jumpers",
    sizes: ["S", "M", "L", "XL"],
    colors: [{ name: "Black", hex: "#0a0a0a" }],
    availability: "Limited Pieces",
  },
  {
    id: "f4",
    brand: "NIKE",
    name: "Air Force 1 '07 - Black",
    price: 120000,
    image: pSneaker,
    category: "footwear",
    subcategory: "Sneakers & Trainers",
    sizes: ["40", "41", "42", "43", "44"],
    colors: [
      { name: "Black", hex: "#0a0a0a" },
      { name: "White", hex: "#ffffff" },
    ],
    availability: "In Stock",
  },
  {
    id: "f5",
    brand: "NIKE",
    name: "Dunk Low Retro - White Grey",
    price: 155000,
    image: pNikeDunk,
    category: "footwear",
    subcategory: "Sneakers & Trainers",
    sizes: ["40", "41", "42", "43", "44", "45"],
    colors: [{ name: "Multicolor", hex: "linear" }],
    availability: "Restocked",
  },
  {
    id: "f6",
    brand: "AMIRI",
    name: "MA Pool Slides - White",
    price: 155000,
    image: pSlides,
    category: "footwear",
    subcategory: "Flip Flops & Sliders",
    sizes: ["40", "41", "42", "43"],
    colors: [
      { name: "White", hex: "#ffffff" },
      { name: "Black", hex: "#0a0a0a" },
    ],
    availability: "In Stock",
  },
  {
    id: "f7",
    brand: "NIKE",
    name: "Air Force 1 '07 - White",
    price: 115000,
    image: pSneaker,
    category: "footwear",
    subcategory: "Sneakers & Trainers",
    sizes: ["40", "41", "42", "43", "44"],
    colors: [{ name: "White", hex: "#ffffff" }],
    availability: "Pre Order",
  },
  {
    id: "f8",
    brand: "COMMON PROJECTS",
    name: "Achilles Low - Black",
    price: 285000,
    image: pSneakerBlack,
    category: "footwear",
    subcategory: "Sneakers & Trainers",
    sizes: ["40", "41", "42", "43", "44"],
    colors: [{ name: "Black", hex: "#0a0a0a" }],
    availability: "In Stock",
  },
  {
    id: "f9",
    brand: "AXEL ARIGATO",
    name: "Genesis Runner - Grey",
    price: 195000,
    image: pRunnerGrey,
    category: "footwear",
    subcategory: "Sneakers & Trainers",
    sizes: ["40", "41", "42", "43", "44"],
    colors: [
      { name: "Grey", hex: "#808080" },
      { name: "White", hex: "#ffffff" },
    ],
    availability: "In Stock",
  },
  {
    id: "f10",
    brand: "GUCCI",
    name: "Brixton Leather Loafer - Black",
    price: 450000,
    image: pLoafer,
    category: "footwear",
    subcategory: "Shoes",
    sizes: ["40", "41", "42", "43", "44"],
    colors: [{ name: "Black", hex: "#0a0a0a" }],
    availability: "Limited Pieces",
  },
  {
    id: "f11",
    brand: "NIKE",
    name: "Dunk Low Retro - Panda",
    price: 170000,
    image: pNikeDunk,
    category: "footwear",
    subcategory: "Sneakers & Trainers",
    sizes: ["40", "41", "42", "43", "44", "45"],
    colors: [{ name: "Multicolor", hex: "linear" }],
    availability: "Restocked",
  },
  {
    id: "f12",
    brand: "AMIRI",
    name: "MA Pool Slides - Bone",
    price: 150000,
    image: pSlides,
    category: "footwear",
    subcategory: "Flip Flops & Sliders",
    sizes: ["40", "41", "42", "43"],
    colors: [
      { name: "Beige", hex: "#edebdf" },
      { name: "Black", hex: "#0a0a0a" },
    ],
    availability: "In Stock",
  },
  {
    id: "a5",
    brand: "NEW ERA",
    name: "9Forty Cap - Navy",
    price: 26000,
    image: pCap,
    category: "accessories",
    subcategory: "Hats & Caps",
    sizes: ["One Size"],
    colors: [
      { name: "Navy", hex: "#1a3a5f" },
      { name: "Black", hex: "#0a0a0a" },
    ],
    availability: "In Stock",
  },
  {
    id: "a6",
    brand: "G-SHOCK",
    name: "GM-2100-1AER Silver",
    price: 210000,
    image: pWatch,
    category: "accessories",
    subcategory: "Watches",
    sizes: ["One Size"],
    colors: [{ name: "Silver", hex: "#c0c0c0" }],
    availability: "In Stock",
  },
  {
    id: "a7",
    brand: "CASIO",
    name: "GBD-200-9ER Orange",
    price: 155000,
    image: pWatch2,
    category: "accessories",
    subcategory: "Watches",
    sizes: ["One Size"],
    colors: [
      { name: "Yellow", hex: "#e8b84a" },
      { name: "Black", hex: "#0a0a0a" },
    ],
    availability: "Limited Pieces",
  },
  {
    id: "a9",
    brand: "G-SHOCK",
    name: "GA-2100-1A1 'CasiOak' Black",
    price: 195000,
    image: pWatch,
    category: "accessories",
    subcategory: "Watches",
    sizes: ["One Size"],
    colors: [{ name: "Black", hex: "#0a0a0a" }],
    availability: "In Stock",
  },
  {
    id: "a8",
    brand: "AMIRI",
    name: "MA Logo Cap - White",
    price: 90000,
    image: pAmiriCap,
    category: "accessories",
    subcategory: "Hats & Caps",
    sizes: ["One Size"],
    colors: [{ name: "White", hex: "#ffffff" }],
    availability: "In Stock",
  },
  {
    id: "fr2",
    brand: "CREED",
    name: "Aventus EDP - 100ml",
    price: 480000,
    image: pFragrance,
    category: "fragrances",
    subcategory: "Perfumes",
    sizes: ["100ml"],
    colors: [{ name: "Clear", hex: "#edebdf" }],
    availability: "In Stock",
  },
  {
    id: "fr3",
    brand: "TOM FORD",
    name: "Oud Wood Eau de Parfum",
    price: 520000,
    image: pFragrance,
    category: "fragrances",
    subcategory: "Perfumes",
    sizes: ["50ml", "100ml"],
    colors: [{ name: "Clear", hex: "#edebdf" }],
    availability: "In Stock",
  },
  {
    id: "fr4",
    brand: "DIOR",
    name: "Sauvage Eau de Parfum",
    price: 380000,
    image: pFragrance,
    category: "fragrances",
    subcategory: "Perfumes",
    sizes: ["60ml", "100ml"],
    colors: [{ name: "Clear", hex: "#edebdf" }],
    availability: "In Stock",
  },
  {
    id: "fr5",
    brand: "DIOR",
    name: "Bleu de Chanel Eau de Parfum 100ml",
    price: 210000,
    image: pFragrance,
    category: "fragrances",
    subcategory: "Perfumes",
    sizes: ["100ml"],
    colors: [{ name: "Clear", hex: "#edebdf" }],
    availability: "In Stock",
  },
  {
    id: "fr6",
    brand: "TOM FORD",
    name: "Oud Wood Eau de Parfum 100ml",
    price: 330000,
    image: pFragrance,
    category: "fragrances",
    subcategory: "Perfumes",
    sizes: ["100ml"],
    colors: [{ name: "Clear", hex: "#edebdf" }],
    availability: "In Stock",
  },
  {
    id: "fr7",
    brand: "YSL",
    name: "Yves Saint Laurent Y Eau de Parfum 100ml",
    price: 185000,
    image: pFragrance,
    category: "fragrances",
    subcategory: "Perfumes",
    sizes: ["100ml"],
    colors: [{ name: "Clear", hex: "#edebdf" }],
    availability: "In Stock",
  },
  {
    id: "fr8",
    brand: "MAISON FRANCIS KURKDJIAN",
    name: "Baccarat Rouge 540 70ml",
    price: 385000,
    image: pFragrance,
    category: "fragrances",
    subcategory: "Perfumes",
    sizes: ["70ml"],
    colors: [{ name: "Clear", hex: "#edebdf" }],
    availability: "Limited Pieces",
  },
  {
    id: "fr9",
    brand: "CREED",
    name: "Silver Mountain Water 100ml",
    price: 390000,
    image: pFragrance,
    category: "fragrances",
    subcategory: "Perfumes",
    sizes: ["100ml"],
    colors: [{ name: "Clear", hex: "#edebdf" }],
    availability: "In Stock",
  },
  {
    id: "fr10",
    brand: "PACO RABANNE",
    name: "1 Million Eau de Toilette 100ml",
    price: 128000,
    image: pFragrance,
    category: "fragrances",
    subcategory: "Perfumes",
    sizes: ["100ml"],
    colors: [{ name: "Clear", hex: "#edebdf" }],
    availability: "In Stock",
  },
  {
    id: "fr11",
    brand: "JO MALONE LONDON",
    name: "Wood Sage & Sea Salt 100ml",
    price: 145000,
    image: pFragrance,
    category: "fragrances",
    subcategory: "Perfumes",
    sizes: ["100ml"],
    colors: [{ name: "Clear", hex: "#edebdf" }],
    availability: "In Stock",
  },
  {
    id: "fr12",
    brand: "VERSACE",
    name: "Eros Eau de Parfum 100ml",
    price: 112000,
    image: pFragrance,
    category: "fragrances",
    subcategory: "Perfumes",
    sizes: ["100ml"],
    colors: [{ name: "Clear", hex: "#edebdf" }],
    availability: "In Stock",
  },
  {
    id: "fr13",
    brand: "CHANEL",
    name: "Coco Mademoiselle EDP 100ml",
    price: 245000,
    image: pFragrance,
    category: "fragrances",
    subcategory: "Perfumes",
    sizes: ["100ml"],
    colors: [{ name: "Clear", hex: "#edebdf" }],
    availability: "In Stock",
  },
  {
    id: "fr14",
    brand: "TOM FORD",
    name: "Tobacco Vanille Travel Spray Set",
    price: 195000,
    image: pFragrance,
    category: "fragrances",
    subcategory: "Body Mists",
    sizes: ["4x10ml"],
    colors: [{ name: "Clear", hex: "#edebdf" }],
    availability: "In Stock",
  },
  {
    id: "fr15",
    brand: "CREED",
    name: "Aventus Discovery Set",
    price: 165000,
    image: pFragrance,
    category: "fragrances",
    subcategory: "Body Mists",
    sizes: ["3x10ml"],
    colors: [{ name: "Clear", hex: "#edebdf" }],
    availability: "In Stock",
  },
];

import pBsAf1 from "@/assets/p-bs-af1-panda.png";
import pBsCargo from "@/assets/p-bs-cargo-pants.png";
import pBsDior from "@/assets/p-bs-dior-sauvage.png";
import pBsAslCap from "@/assets/p-bs-asl-cap.png";
import pBsSunglasses from "@/assets/p-bs-sunglasses.png";
import pBsTee from "@/assets/p-bs-oversized-tee.png";
import pBsHoodie from "@/assets/p-bs-core-hoodie.png";
import pBsSliders from "@/assets/p-bs-sliders.png";

export const bestSellerProducts: Product[] = [
  { id: "bs1", brand: "ASL ORIGINALS", name: "Core Logo Hoodie", price: 28000, image: pBsHoodie, category: "clothing", subcategory: "Hoodies & Sweatshirts", sizes: ["S","M","L","XL"], colors: [{ name: "Black", hex: "#0a0a0a" }], availability: "In Stock" },
  { id: "bs2", brand: "ASL ORIGINALS", name: "Oversized T-Shirt", price: 15000, image: pBsTee, category: "clothing", subcategory: "T-shirts", sizes: ["S","M","L","XL"], colors: [{ name: "Black", hex: "#0a0a0a" }], availability: "In Stock" },
  { id: "bs3", brand: "Nike", name: "Air Force 1 '07 Black / White", price: 160000, image: pBsAf1, category: "footwear", subcategory: "Sneakers & Trainers", sizes: ["40","41","42","43","44"], colors: [{ name: "Black", hex: "#0a0a0a" },{ name: "White", hex: "#ffffff" }], availability: "In Stock" },
  { id: "bs4", brand: "ASL ORIGINALS", name: "Cargo Pants", price: 24000, image: pBsCargo, category: "clothing", subcategory: "Jeans & Trousers", sizes: ["S","M","L","XL"], colors: [{ name: "Black", hex: "#0a0a0a" }], availability: "In Stock" },
  { id: "bs5", brand: "ASL ORIGINALS", name: "ASL Logo Cap", price: 8500, image: pBsAslCap, category: "accessories", subcategory: "Hats & Caps", sizes: ["One Size"], colors: [{ name: "Black", hex: "#0a0a0a" }], availability: "In Stock" },
  { id: "bs6", brand: "ASL ORIGINALS", name: "Rectangular Sunglasses", price: 12000, image: pBsSunglasses, category: "accessories", subcategory: "Sunglasses", sizes: ["One Size"], colors: [{ name: "Black", hex: "#0a0a0a" }], availability: "In Stock" },
  { id: "bs7", brand: "Dior", name: "Sauvage Eau de Parfum 100ml", price: 145000, image: pBsDior, category: "fragrances", subcategory: "Perfumes", sizes: ["100ml"], colors: [{ name: "Navy", hex: "#1a3a5f" }], availability: "In Stock" },
  { id: "bs8", brand: "ASL ORIGINALS", name: "ASL Sliders", price: 14000, image: pBsSliders, category: "footwear", subcategory: "Flip Flops & Sliders", sizes: ["40","41","42","43","44"], colors: [{ name: "Black", hex: "#0a0a0a" }], availability: "In Stock" },
];

import pTrTee from "@/assets/p-tr-represent-tee.png";
import pTrHoodie from "@/assets/p-tr-fog-hoodie.png";
import pTrCargo from "@/assets/p-tr-cargo-trousers.png";
import pTrDunk from "@/assets/p-tr-dunk-panda.png";
import pTrCap from "@/assets/p-tr-ny-cap.png";
import pTrSun from "@/assets/p-tr-prada-sunglasses.png";
import pTrWatch from "@/assets/p-tr-casio-watch.png";
import pTrBag from "@/assets/p-tr-crossbody-bag.png";

export const trendingProducts: Product[] = [
  { id: "tr1", brand: "REPRESENT", name: "Ownership Washed Tee", price: 28000, image: pTrTee, category: "clothing", subcategory: "T-shirts", sizes: ["S","M","L","XL"], colors: [{ name: "Black", hex: "#0a0a0a" }], availability: "In Stock" },
  { id: "tr2", brand: "FEAR OF GOD ESSENTIALS", name: "Core Hoodie", price: 45000, image: pTrHoodie, category: "clothing", subcategory: "Hoodies & Sweatshirts", sizes: ["S","M","L","XL"], colors: [{ name: "Grey", hex: "#c9c9c9" }], availability: "In Stock" },
  { id: "tr3", brand: "CARGO TROUSERS", name: "Relaxed Fit Cargo Pants", price: 32000, image: pTrCargo, category: "clothing", subcategory: "Jeans & Trousers", sizes: ["S","M","L","XL"], colors: [{ name: "Olive", hex: "#6b7a3a" }], availability: "In Stock" },
  { id: "tr4", brand: "NIKE", name: "Dunk Low 'Panda'", price: 150000, image: pTrDunk, category: "footwear", subcategory: "Sneakers & Trainers", sizes: ["40","41","42","43","44"], colors: [{ name: "Black", hex: "#0a0a0a" },{ name: "White", hex: "#ffffff" }], availability: "In Stock" },
  { id: "tr5", brand: "NEW ERA", name: "NY Yankees 9FORTY Cap", price: 12000, image: pTrCap, category: "accessories", subcategory: "Hats & Caps", sizes: ["One Size"], colors: [{ name: "Black", hex: "#0a0a0a" }], availability: "In Stock" },
  { id: "tr6", brand: "PRADA", name: "Rectangular Sunglasses", price: 38000, image: pTrSun, category: "accessories", subcategory: "Sunglasses", sizes: ["One Size"], colors: [{ name: "Black", hex: "#0a0a0a" }], availability: "In Stock" },
  { id: "tr7", brand: "CASIO", name: "Vintage Digital Watch", price: 26000, image: pTrWatch, category: "accessories", subcategory: "Watches", sizes: ["One Size"], colors: [{ name: "Silver", hex: "#c0c0c0" }], availability: "In Stock" },
  { id: "tr8", brand: "ASL ORIGINALS", name: "Utility Crossbody Bag", price: 10000, image: pTrBag, category: "accessories", subcategory: "Bags", sizes: ["One Size"], colors: [{ name: "Black", hex: "#0a0a0a" }], availability: "In Stock" },
];

export function getProductsByCategory(categoryId: string, sub?: string) {
  let list: Product[];
  if (categoryId === "best-sellers") list = bestSellerProducts;
  else if (categoryId === "trending") list = trendingProducts;
  else if (categoryId === "all" || categoryId === "new") list = shopProducts;
  else if (categoryId === "sale" || categoryId === "sales") list = shopProducts.filter((p) => isOnSale(p));
  else list = shopProducts.filter((p) => p.category === categoryId);
  if (sub) list = list.filter((p) => p.subcategory === sub);
  return list;
}

// Explicit sale-set - only these ids display strike-through pricing site-wide.
const saleDiscountById: Record<string, number> = {
  f11: 25, f12: 30, a5: 20, a6: 35, a8: 20, fr4: 15, fr7: 30, fr10: 25,
  bs3: 20, bs7: 25, tr4: 30, tr6: 15, "1": 20, "2": 25, "3": 15,
};

export function getSaleInfo(product: Product): { originalPrice?: number; discountPct?: number } {
  if (product.originalPrice) {
    const pct = Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
    return { originalPrice: product.originalPrice, discountPct: pct };
  }
  const pct = saleDiscountById[product.id];
  if (!pct) return {};
  const originalPrice = Math.round((product.price / (1 - pct / 100)) / 500) * 500;
  return { originalPrice, discountPct: pct };
}

export function isOnSale(product: Product) {
  return getSaleInfo(product).discountPct !== undefined;
}

// Deterministic per-product rating so cards / detail pages agree.
export function getProductRating(id: string) {
  const fromApi = getApiRating(id);
  if (fromApi) return fromApi;
  const seed = id.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  const rating = Math.round((3.9 + (seed % 11) / 10) * 10) / 10; // 3.9 - 4.9
  const reviews = 24 + (seed * 7) % 480;
  return { rating, reviews };
}

export function getProductGallery(product: Product): string[] {
  if (product.gallery && product.gallery.length) return product.gallery;
  // Build a varied gallery from unique sibling images in the same category
  // (and brand where possible) so each product shows 4 distinct shots
  // instead of duplicating the hero image.
  const seen = new Set<string>([product.image]);
  const gallery: string[] = [product.image];
  const pool = [...shopProducts, ...bestSellerProducts, ...trendingProducts].filter(
    (p) => p.id !== product.id && p.category === product.category,
  );
  // Prefer same-brand siblings first for a more cohesive look.
  const sameBrand = pool.filter((p) => p.brand === product.brand);
  const others = pool.filter((p) => p.brand !== product.brand);
  const seed = product.id
    .split("")
    .reduce((s, c) => s + c.charCodeAt(0), 0);
  const rotate = <T,>(arr: T[]) =>
    arr.length ? [...arr.slice(seed % arr.length), ...arr.slice(0, seed % arr.length)] : arr;
  for (const p of [...rotate(sameBrand), ...rotate(others)]) {
    if (seen.has(p.image)) continue;
    seen.add(p.image);
    gallery.push(p.image);
    if (gallery.length >= 4) break;
  }
  return gallery;
}

export function getProductCopy(product: Product): { description: string; features: string[]; styleCode: string } {
  const styleCode = product.styleCode ?? `ASL-${product.id.toUpperCase()}`;
  if (product.description && product.features) {
    return { description: product.description, features: product.features, styleCode };
  }
  const c = product.category;
  let description: string;
  let features: string[];
  if (c === "footwear") {
    description = `The ${product.brand} ${product.name} pairs an iconic silhouette with modern construction. Premium uppers, cushioned midsole and a durable rubber outsole make it built for the everyday rotation.`;
    features = [
      "Premium leather / textile upper",
      "Cushioned foam midsole for all-day wear",
      "Durable rubber outsole for grip and traction",
      "Padded collar for step-in comfort",
      "Signature branding at heel and tongue",
    ];
  } else if (c === "clothing") {
    description = `The ${product.brand} ${product.name} blends heritage tailoring with everyday comfort. Cut from premium fabric with a refined finish, it layers easily across your rotation.`;
    features = [
      "Premium fabric with soft hand-feel",
      "Tailored, modern fit",
      "Ribbed trims for shape retention",
      "Signature label detailing",
      "Machine wash cold, tumble dry low",
    ];
  } else if (c === "fragrances") {
    description = `${product.name} - an evocative composition by ${product.brand}. A bold, long-lasting scent designed to leave a signature impression from day to night.`;
    features = [
      "Sourced 100% authentic",
      "Rich, long-lasting sillage",
      "Sealed, batch-coded bottle",
      "Ships in original packaging",
      "Ideal for daily or occasion wear",
    ];
  } else {
    description = `The ${product.brand} ${product.name} finishes any look with intent. Crafted from premium materials with attention to every stitch, seam and edge.`;
    features = [
      "Premium materials",
      "Handcrafted detailing",
      "Timeless silhouette",
      "Sourced 100% authentic",
      "Original packaging included",
    ];
  }
  return { description, features, styleCode };
}


import subSunglasses from "@/assets/sub-sunglasses.png";
import subBags from "@/assets/sub-bags.png";
import subSocks from "@/assets/sub-socks.png";
import subGloves from "@/assets/sub-gloves.png";
import subFragMen from "@/assets/sub-frag-men.png";
import subFragWomen from "@/assets/sub-frag-women.png";
import subFragUnisex from "@/assets/sub-frag-unisex.png";
import subFragLuxury from "@/assets/sub-frag-luxury.png";
import subFragBest from "@/assets/sub-frag-best.png";
import subFragNew from "@/assets/sub-frag-new.png";
import subFragTravel from "@/assets/sub-frag-travel.png";

const subcategoryThumbnailOverrides: Record<string, Record<string, string>> = {
  clothing: {
    "All clothing": pHoodie,
    "T-shirts": pDailyPaperTee,
    "Tops": pTee2,
    "Shirts": pTee2,
    "Polo Shirts": pTee,
    "Hoodies & Sweatshirts": pRepresentHoodie,
    "Jackets & Jumpers": pAapeJacket,
    "Jorts/shorts": pEssentialsShorts,
    "Jeans & Trousers": pRepresentDenim,
    "Underwear": pTee,
    "Swim Shorts": pEssentialsShorts,
  },
  accessories: {
    "All accessories": subBags,
    "Sunglasses": subSunglasses,
    "Hats & Caps": pCap,
    "Bags": subBags,
    "Socks, Wallets & Belts": subSocks,
    "Gloves & Scarves": subGloves,
    "Watches": pWatch,
  },
  fragrances: {
    "All fragrances": subFragBest,
    "Perfumes": subFragLuxury,
    "Body Mists": subFragTravel,
    "Deodorants": subFragMen,
    "Gift Sets": subFragNew,
    "Best Sellers": subFragBest,
    "New Arrivals": subFragNew,
  },
};

export function getSubcategoryThumbnail(categoryId: string, subcategory: string) {
  const override = subcategoryThumbnailOverrides[categoryId]?.[subcategory];
  if (override) return override;
  const product = shopProducts.find((p) => p.category === categoryId && p.subcategory === subcategory);
  return product?.image ?? shopProducts.find((p) => p.category === categoryId)?.image;
}



export function getCategoryName(categoryId: string) {
  return categories.find((c) => c.id === categoryId)?.name ?? "All Products";
}

export function getProductById(id: string) {
  return (
    shopProducts.find((p) => p.id === id) ??
    bestSellerProducts.find((p) => p.id === id) ??
    trendingProducts.find((p) => p.id === id)
  );
}

export function getRelatedProducts(product: Product, limit = 4): Product[] {
  const all = getAllProducts();
  const scored = all
    .filter((p) => p.id !== product.id)
    .map((p) => {
      let score = 0;
      if (p.category === product.category) score += 3;
      if (p.subcategory && p.subcategory === product.subcategory) score += 2;
      if (p.brand === product.brand) score += 1;
      return { product: p, score };
    })
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.product);
}

// Concierge / pre-order items: sourced on request rather than stocked.
// Flagged explicitly via `isConcierge`, or implicitly for Pre Order / Limited Pieces availability.
export function isConciergeProduct(product: Product) {
  return (
    product.isConcierge === true ||
    product.availability === "Pre Order" ||
    product.availability === "Limited Pieces"
  );
}

/**
 * Price-on-request pieces in the general store: no public price, sourced
 * and quoted by the concierge team.
 */
const priceOnRequestIds = new Set<string>(["c4", "c13", "f7", "a3", "fr6"]);
export function isPriceOnRequest(product: Product) {
  return product.price <= 0 || priceOnRequestIds.has(product.id);
}




/* -------------------- Shop-depth helpers -------------------- */

const allCatalog = () => [...shopProducts, ...bestSellerProducts, ...trendingProducts];

/** Unique products across every catalog list, keyed by id. */
export function getAllProducts(): Product[] {
  const seen = new Map<string, Product>();
  for (const p of allCatalog()) if (!seen.has(p.id)) seen.set(p.id, p);
  return [...seen.values()];
}

/** Aggregated brands with their live product counts. */
export function getAllBrands(): { name: string; count: number; sample: Product }[] {
  const grouped = new Map<string, Product[]>();
  for (const p of getAllProducts()) {
    const key = p.brand.trim().toUpperCase();
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(p);
  }
  return [...grouped.entries()]
    .map(([name, items]) => ({ name, count: items.length, sample: items[0] }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getProductsByBrand(brand: string): Product[] {
  const key = brand.trim().toUpperCase();
  return getAllProducts().filter((p) => p.brand.trim().toUpperCase() === key);
}

/** Newest arrivals - deterministic pick prioritising trending + shop lists. */
export function getNewArrivals(limit = 12): Product[] {
  const source = [...trendingProducts, ...shopProducts];
  const seen = new Set<string>();
  const out: Product[] = [];
  for (const p of source) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    out.push(p);
    if (out.length >= limit) break;
  }
  return out;
}

/**
 * Deterministic per-size availability. Marks ~1 size sold-out on a slice
 * of products so the UI can show a realistic mixed state. Single-size
 * items always stay available.
 */
export function getSizeAvailability(product: Product): Record<string, boolean> {
  const fromApi = getApiSizeAvailability(product.id);
  if (fromApi) return { ...fromApi };
  const out: Record<string, boolean> = {};
  if ((product.availability as string) === "Out of Stock" || outOfStockIds.has(product.id) || isApiOutOfStock(product.id)) {
    for (const s of product.sizes) out[s] = false;
    return out;
  }
  const seed = product.id.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  const soldOutIdx =
    product.sizes.length > 2 && seed % 4 === 0
      ? new Set<number>([seed % product.sizes.length])
      : new Set<number>();
  product.sizes.forEach((s, i) => (out[s] = !soldOutIdx.has(i)));
  return out;
}


export function isOutOfStock(product: Product) {
  if (isApiOutOfStock(product.id)) return true;
  return (
    (product.availability as string) === "Out of Stock" ||
    Object.values(getSizeAvailability(product)).every((v) => v === false)
  );
}

/** Explicit out-of-stock demo set - surfaced in listings and product pages. */
const outOfStockIds = new Set<string>(["c3", "tr6", "bs6"]);
export function isFlaggedOutOfStock(id: string) {
  return outOfStockIds.has(id);
}
