// Domain models for the Mabote Fresh storefront.
// These are intentionally backend-agnostic so they can be swapped for
// Convex documents later (each entity has a stable string `id`).

export type PricingUnit = "each" | "pack" | "kg" | "gram" | "litre" | "crate";

export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

export interface Shop {
  id: string;
  name: string;
  tagline: string;
  phone: string;
  whatsapp: string;
  address: string;
  openingHours: string;
  deliveryAreas: string[];
  defaultDeliveryArea: string;
  deliveryFee: number;
  minimumOrder: number;
  currency: "LSL";
  currencySymbol: "M";
  paymentOptions: { mobileMoney: boolean; cashOnDelivery: boolean; card: boolean };
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  emoji: string;
  accent: string; // tailwind-safe token class suffix used for soft tiles
  enabled: boolean;
  order: number;
}

export interface ProductVariant {
  id: string;
  label: string; // e.g. "1 kg", "6 pack"
  multiplier: number; // multiplied by base price
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  description: string;
  categoryId: string;
  price: number;
  promoPrice?: number;
  unit: PricingUnit;
  /** weight-based products let the customer choose kg amounts */
  soldByWeight: boolean;
  weightOptions?: number[];
  stock: number;
  lowStockThreshold: number;
  available: boolean;
  popularity: number;
  createdAt: string;
  emoji: string;
  variants?: ProductVariant[];
}

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  unit: PricingUnit;
  unitPrice: number;
  emoji: string;
  /** units for quantity products, kilograms for weight products */
  quantity: number;
  soldByWeight: boolean;
}

export interface DeliveryAddress {
  id?: string;
  label?: string;
  area: string;
  address: string;
  landmark?: string;
  instructions?: string;
  landmarkId?: string;
  lat?: number;
  lng?: number;
}

/** A locally verified, staff-curated place name that can help identify a delivery destination. */
export interface DeliveryLandmark {
  id: string;
  name: string;
  aliases: string[];
  area: string;
  lat: number;
  lng: number;
}

export type PaymentMethod = "mobile_money" | "cash_on_delivery" | "card";

export interface Payment {
  method: PaymentMethod;
  provider?: string;
  status: "pending" | "paid" | "unpaid";
  cashGiven?: number;
  changeRequired?: number;
  exactAmount?: boolean;
}

export type OrderStatus =
  | "received"
  | "confirmed"
  | "preparing"
  | "ready"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export interface OrderEvent {
  status: OrderStatus | "created" | "note";
  at: string;
  note?: string;
}

export interface OrderItem extends CartItem {
  lineTotal: number;
}

export interface Order {
  id: string;
  number: string;
  customer: { customerId?: string; name: string; phone: string; email?: string };
  items: OrderItem[];
  address: DeliveryAddress;
  payment: Payment;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  status: OrderStatus;
  createdAt: string;
  estimatedDelivery: string;
  driver?: string;
  timeline: OrderEvent[];
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  orders: number;
  lifetimeSpend: number;
  lastOrder: string;
}

export interface Promotion {
  id: string;
  name: string;
  type: "percentage" | "fixed" | "product_price" | "coupon";
  value: number;
  code?: string;
  startDate: string;
  endDate: string;
  active: boolean;
}

export interface NotificationPreference {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
}
