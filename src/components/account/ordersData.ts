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
  sku?: string;
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
