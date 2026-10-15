import { Package, Truck, CheckCircle2, RotateCcw, LucideIcon } from "lucide-react";

export type OrderStatus = "Processing" | "Shipped" | "Delivered" | "Cancelled" | "Returned";

export const orderStatusStyle: Record<OrderStatus, string> = {
  Processing: "bg-ink text-white",
  Shipped: "bg-ink text-white",
  Delivered: "bg-ink text-white",
  Cancelled: "bg-ink text-white",
  Returned: "bg-ink text-white",
};


export type OrderItem = {
  name: string;
  brand?: string;
  variant: string;
  qty: number;
  price: number;
  image: string;
};

export type Order = {
  id: string;
  date: string;
  status: OrderStatus;
  total: number;
  itemsCount: number;
  eta?: string;
  tracking?: string;
  items: OrderItem[];
};

export const orderStats: { id: string; label: string; value: string; Icon: LucideIcon; cta: string }[] = [
  { id: "total", label: "Total Orders", value: "24", Icon: Package, cta: "View all" },
  { id: "transit", label: "In Transit", value: "2", Icon: Truck, cta: "Track" },
  { id: "delivered", label: "Delivered", value: "20", Icon: CheckCircle2, cta: "History" },
  { id: "returns", label: "Returns", value: "1", Icon: RotateCcw, cta: "Manage" },
];

export const orderTabs: { id: "all" | OrderStatus; label: string }[] = [
  { id: "all", label: "All" },
  { id: "Processing", label: "Processing" },
  { id: "Shipped", label: "Shipped" },
  { id: "Delivered", label: "Delivered" },
  { id: "Returned", label: "Returned" },
];

export const orders: Order[] = [
  {
    id: "ASL-ORD-10248",
    date: "Jul 15, 2026",
    status: "Shipped",
    total: 285000,
    itemsCount: 2,
    eta: "Jul 22, 2026",
    tracking: "DHL-8827364521",
    items: [
      { name: "Nike Air Force 1 '07", brand: "Nike", variant: "White · UK 9", qty: 1, price: 145000, image: "https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&w=200&q=80" },
      { name: "Essentials Hoodie", brand: "Fear of God", variant: "Stone · Medium", qty: 1, price: 140000, image: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=200&q=80" },
    ],
  },
  {
    id: "ASL-ORD-10234",
    date: "Jul 08, 2026",
    status: "Processing",
    total: 92000,
    itemsCount: 1,
    eta: "Jul 25, 2026",
    items: [
      { name: "Creed Aventus EDP 100ml", brand: "Creed", variant: "Fragrance", qty: 1, price: 92000, image: "https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=200&q=80" },
    ],
  },
  {
    id: "ASL-ORD-10201",
    date: "Jun 24, 2026",
    status: "Delivered",
    total: 415000,
    itemsCount: 1,
    tracking: "DHL-7712384421",
    items: [
      { name: "Louis Vuitton Belt", brand: "Louis Vuitton", variant: "Reversible · 90cm", qty: 1, price: 415000, image: "https://images.unsplash.com/photo-1624222247344-550fb60583dc?auto=format&fit=crop&w=200&q=80" },
    ],
  },
  {
    id: "ASL-ORD-10188",
    date: "Jun 12, 2026",
    status: "Delivered",
    total: 68000,
    itemsCount: 2,
    items: [
      { name: "Amiri Slides", brand: "Amiri", variant: "Black · UK 10", qty: 1, price: 48000, image: "https://images.unsplash.com/photo-1603487742131-4160ec999306?auto=format&fit=crop&w=200&q=80" },
      { name: "G-Shock DW-5600", brand: "G-Shock", variant: "Classic Black", qty: 1, price: 20000, image: "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&w=200&q=80" },
    ],
  },
  {
    id: "ASL-ORD-10142",
    date: "May 30, 2026",
    status: "Returned",
    total: 55000,
    itemsCount: 1,
    items: [
      { name: "Gentle Monster Sunglasses", brand: "Gentle Monster", variant: "Lilit 01 · Black", qty: 1, price: 55000, image: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=200&q=80" },
    ],
  },
  {
    id: "ASL-ORD-10136",
    date: "May 28, 2026",
    status: "Delivered",
    total: 175000,
    itemsCount: 1,
    tracking: "DHL-7719001122",
    items: [
      { name: "Fear of God Essentials Hoodie", brand: "Fear of God", variant: "Dark Oatmeal · Large", qty: 1, price: 175000, image: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=200&q=80" },
    ],
  },
  {
    id: "ASL-ORD-10121",
    date: "May 20, 2026",
    status: "Shipped",
    total: 320000,
    itemsCount: 2,
    eta: "Jun 02, 2026",
    tracking: "DHL-8820013344",
    items: [
      { name: "Nike Air Force 1 '07", brand: "Nike", variant: "White · UK 10", qty: 1, price: 145000, image: "https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&w=200&q=80" },
      { name: "MA Logo Cap", brand: "MA", variant: "Black · One Size", qty: 1, price: 175000, image: "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=200&q=80" },
    ],
  },
  {
    id: "ASL-ORD-10108",
    date: "May 12, 2026",
    status: "Processing",
    total: 450000,
    itemsCount: 1,
    eta: "Jun 05, 2026",
    items: [
      { name: "Rolex Datejust 41", brand: "Rolex", variant: "Blue Dial · Oyster", qty: 1, price: 450000, image: "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&w=200&q=80" },
    ],
  },
  {
    id: "ASL-ORD-10095",
    date: "Apr 28, 2026",
    status: "Delivered",
    total: 210000,
    itemsCount: 2,
    tracking: "DHL-7722110099",
    items: [
      { name: "Amiri Slides", brand: "Amiri", variant: "Black · UK 9", qty: 1, price: 48000, image: "https://images.unsplash.com/photo-1603487742131-4160ec999306?auto=format&fit=crop&w=200&q=80" },
      { name: "Creed Aventus EDP 100ml", brand: "Creed", variant: "Fragrance", qty: 2, price: 92000, image: "https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=200&q=80" },
    ],
  },
  {
    id: "ASL-ORD-10084",
    date: "Apr 20, 2026",
    status: "Cancelled",
    total: 120000,
    itemsCount: 1,
    items: [
      { name: "G-Shock DW-5600", brand: "G-Shock", variant: "Classic Black", qty: 1, price: 120000, image: "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&w=200&q=80" },
    ],
  },
  {
    id: "ASL-ORD-10072",
    date: "Apr 14, 2026",
    status: "Delivered",
    total: 680000,
    itemsCount: 1,
    tracking: "DHL-7733221144",
    items: [
      { name: "Louis Vuitton Belt", brand: "Louis Vuitton", variant: "Reversible · 95cm", qty: 1, price: 680000, image: "https://images.unsplash.com/photo-1624222247344-550fb60583dc?auto=format&fit=crop&w=200&q=80" },
    ],
  },
  {
    id: "ASL-ORD-10061",
    date: "Apr 05, 2026",
    status: "Delivered",
    total: 135000,
    itemsCount: 2,
    tracking: "DHL-7744332255",
    items: [
      { name: "Nike Air Force 1 '07", brand: "Nike", variant: "White · UK 8", qty: 1, price: 145000, image: "https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&w=200&q=80" },
    ],
  },
  {
    id: "ASL-ORD-10055",
    date: "Mar 29, 2026",
    status: "Returned",
    total: 98000,
    itemsCount: 1,
    items: [
      { name: "Gentle Monster Sunglasses", brand: "Gentle Monster", variant: "Lilit 01 · Black", qty: 1, price: 98000, image: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=200&q=80" },
    ],
  },
  {
    id: "ASL-ORD-10043",
    date: "Mar 18, 2026",
    status: "Shipped",
    total: 260000,
    itemsCount: 1,
    eta: "Apr 01, 2026",
    tracking: "DHL-7755443366",
    items: [
      { name: "Fear of God Essentials Hoodie", brand: "Fear of God", variant: "Black · Medium", qty: 1, price: 260000, image: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=200&q=80" },
    ],
  },
  {
    id: "ASL-ORD-10038",
    date: "Mar 10, 2026",
    status: "Delivered",
    total: 540000,
    itemsCount: 2,
    tracking: "DHL-7766554477",
    items: [
      { name: "Louis Vuitton Belt", brand: "Louis Vuitton", variant: "Reversible · 90cm", qty: 1, price: 415000, image: "https://images.unsplash.com/photo-1624222247344-550fb60583dc?auto=format&fit=crop&w=200&q=80" },
      { name: "Creed Aventus EDP 100ml", brand: "Creed", variant: "Fragrance", qty: 1, price: 125000, image: "https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=200&q=80" },
    ],
  },
  {
    id: "ASL-ORD-10029",
    date: "Feb 22, 2026",
    status: "Delivered",
    total: 820000,
    itemsCount: 1,
    tracking: "DHL-7777665588",
    items: [
      { name: "Rolex Datejust 41", brand: "Rolex", variant: "Silver Dial · Jubilee", qty: 1, price: 820000, image: "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&w=200&q=80" },
    ],
  },
  {
    id: "ASL-ORD-10017",
    date: "Feb 14, 2026",
    status: "Processing",
    total: 110000,
    itemsCount: 1,
    eta: "Mar 01, 2026",
    items: [
      { name: "Amiri Slides", brand: "Amiri", variant: "White · UK 11", qty: 1, price: 110000, image: "https://images.unsplash.com/photo-1603487742131-4160ec999306?auto=format&fit=crop&w=200&q=80" },
    ],
  },
  {
    id: "ASL-ORD-10009",
    date: "Feb 05, 2026",
    status: "Delivered",
    total: 295000,
    itemsCount: 2,
    tracking: "DHL-7788776699",
    items: [
      { name: "Nike Air Force 1 '07", brand: "Nike", variant: "White · UK 9", qty: 1, price: 145000, image: "https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&w=200&q=80" },
      { name: "MA Logo Cap", brand: "MA", variant: "Black · One Size", qty: 1, price: 150000, image: "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&w=200&q=80" },
    ],
  },
];

export const formatNaira = (n: number) => `₦${n.toLocaleString()}`;
