/**
 * Single integration boundary for all application data.
 *
 * Today everything lives in memory (seeded) and is persisted to localStorage.
 * To move to Convex later, replace the bodies of the actions below with
 * mutations and the selectors with queries — component code does not change.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  seedCategories,
  seedCustomers,
  seedNotificationPreferences,
  seedOrders,
  seedProducts,
  seedPromotions,
  seedShop,
} from "./seed";
import type {
  CartItem,
  Category,
  Customer,
  DeliveryAddress,
  NotificationPreference,
  Order,
  OrderStatus,
  Payment,
  Product,
  Promotion,
  Shop,
} from "./types";

const STORAGE_KEY = "mabote-fresh-state-v1";

interface AppState {
  shop: Shop;
  categories: Category[];
  products: Product[];
  orders: Order[];
  customers: Customer[];
  promotions: Promotion[];
  notificationPreferences: NotificationPreference[];
  cart: CartItem[];
  deliveryArea: string;
  savedAddresses: DeliveryAddress[];
  favourites: string[];
  account: { name: string; phone: string; email?: string; signedIn: boolean };
}

const initialState: AppState = {
  shop: seedShop,
  categories: seedCategories,
  products: seedProducts,
  orders: seedOrders,
  customers: seedCustomers,
  promotions: seedPromotions,
  notificationPreferences: seedNotificationPreferences,
  cart: [],
  deliveryArea: seedShop.defaultDeliveryArea,
  savedAddresses: [
    {
      id: "addr_1",
      label: "Home",
      area: "Ha-Mabote, Maseru",
      address: "1234 Ha-Mabote",
      landmark: "Opposite Mabote Primary School",
      instructions: "Blue gate, second house after the shop.",
    },
  ],
  favourites: ["prd_1", "prd_24"],
  account: { name: "Thabo Molefi", phone: "+266 5888 1234", email: "thabo@gmail.com", signedIn: true },
};

interface AppStoreValue extends AppState {
  // cart
  addToCart: (product: Product, quantity?: number) => void;
  setCartQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  cartCount: number;
  cartSubtotal: number;
  // storefront
  setDeliveryArea: (area: string) => void;
  toggleFavourite: (productId: string) => void;
  // orders
  placeOrder: (input: {
    customer: { name: string; phone: string; email?: string };
    address: DeliveryAddress;
    payment: Payment;
    discount?: number;
  }) => Order;
  updateOrderStatus: (orderId: string, status: OrderStatus, note?: string) => void;
  assignDriver: (orderId: string, driver: string) => void;
  reorder: (orderId: string) => { added: number; unavailable: string[]; priceChanged: string[] };
  // admin
  upsertProduct: (product: Product) => void;
  removeProduct: (productId: string) => void;
  setStock: (productId: string, stock: number, lowStockThreshold?: number) => void;
  upsertCategory: (category: Category) => void;
  upsertPromotion: (promotion: Promotion) => void;
  updateShop: (patch: Partial<Shop>) => void;
  toggleNotification: (id: string) => void;
  saveAddress: (address: DeliveryAddress) => void;
  removeAddress: (id: string) => void;
}

const AppStoreContext = createContext<AppStoreValue | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(initialState);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setState((prev) => ({ ...prev, ...(JSON.parse(raw) as Partial<AppState>) }));
    } catch {
      /* ignore corrupt storage */
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage full or unavailable */
    }
  }, [state]);

  const patch = useCallback((updater: (prev: AppState) => AppState) => setState(updater), []);

  const value = useMemo<AppStoreValue>(() => {
    const cartCount = state.cart.length;
    const cartSubtotal = Number(
      state.cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0).toFixed(2),
    );

    return {
      ...state,
      cartCount,
      cartSubtotal,

      addToCart: (product, quantity = product.soldByWeight ? 1 : 1) =>
        patch((prev) => {
          const existing = prev.cart.find((i) => i.productId === product.id);
          if (existing) {
            return {
              ...prev,
              cart: prev.cart.map((i) =>
                i.productId === product.id
                  ? { ...i, quantity: Number((i.quantity + quantity).toFixed(2)) }
                  : i,
              ),
            };
          }
          const item: CartItem = {
            id: `ci_${product.id}`,
            productId: product.id,
            name: product.name,
            unit: product.unit,
            unitPrice: product.promoPrice ?? product.price,
            emoji: product.emoji,
            quantity,
            soldByWeight: product.soldByWeight,
          };
          return { ...prev, cart: [...prev.cart, item] };
        }),

      setCartQuantity: (productId, quantity) =>
        patch((prev) => ({
          ...prev,
          cart:
            quantity <= 0
              ? prev.cart.filter((i) => i.productId !== productId)
              : prev.cart.map((i) =>
                  i.productId === productId
                    ? { ...i, quantity: Number(quantity.toFixed(2)) }
                    : i,
                ),
        })),

      removeFromCart: (productId) =>
        patch((prev) => ({ ...prev, cart: prev.cart.filter((i) => i.productId !== productId) })),

      clearCart: () => patch((prev) => ({ ...prev, cart: [] })),

      setDeliveryArea: (area) => patch((prev) => ({ ...prev, deliveryArea: area })),

      toggleFavourite: (productId) =>
        patch((prev) => ({
          ...prev,
          favourites: prev.favourites.includes(productId)
            ? prev.favourites.filter((id) => id !== productId)
            : [...prev.favourites, productId],
        })),

      placeOrder: ({ customer, address, payment, discount = 0 }) => {
        const subtotal = cartSubtotal;
        const deliveryFee = state.shop.deliveryFee;
        const total = Number((subtotal + deliveryFee - discount).toFixed(2));
        const highest = state.orders.reduce((max, o) => {
          const num = Number(o.number.replace(/\D/g, ""));
          return num > max ? num : max;
        }, 1042);
        const number = `#ORD-${highest + 1}`;
        const now = new Date();
        const order: Order = {
          id: number.toLowerCase().replace("#", ""),
          number,
          customer,
          items: state.cart.map((item) => ({
            ...item,
            lineTotal: Number((item.unitPrice * item.quantity).toFixed(2)),
          })),
          address,
          payment: {
            ...payment,
            changeRequired:
              payment.cashGiven != null
                ? Number((payment.cashGiven - total).toFixed(2))
                : undefined,
          },
          subtotal,
          deliveryFee,
          discount,
          total,
          status: "received",
          createdAt: now.toISOString(),
          estimatedDelivery: new Date(now.getTime() + 2 * 3600000).toISOString(),
          timeline: [
            { status: "created", at: now.toISOString() },
            { status: "received", at: now.toISOString() },
          ],
        };
        patch((prev) => ({ ...prev, orders: [order, ...prev.orders], cart: [] }));
        return order;
      },

      updateOrderStatus: (orderId, status, note) =>
        patch((prev) => ({
          ...prev,
          orders: prev.orders.map((o) =>
            o.id === orderId
              ? {
                  ...o,
                  status,
                  payment:
                    status === "delivered" ? { ...o.payment, status: "paid" } : o.payment,
                  timeline: [...o.timeline, { status, at: new Date().toISOString(), note }],
                }
              : o,
          ),
        })),

      assignDriver: (orderId, driver) =>
        patch((prev) => ({
          ...prev,
          orders: prev.orders.map((o) =>
            o.id === orderId
              ? {
                  ...o,
                  driver,
                  timeline: [
                    ...o.timeline,
                    { status: "note", at: new Date().toISOString(), note: `Driver assigned: ${driver}` },
                  ],
                }
              : o,
          ),
        })),

      reorder: (orderId) => {
        const order = state.orders.find((o) => o.id === orderId);
        const result = { added: 0, unavailable: [] as string[], priceChanged: [] as string[] };
        if (!order) return result;
        const nextCart = [...state.cart];
        for (const item of order.items) {
          const product = state.products.find((prd) => prd.id === item.productId);
          if (!product || !product.available || product.stock <= 0) {
            result.unavailable.push(item.name);
            continue;
          }
          const currentPrice = product.promoPrice ?? product.price;
          if (currentPrice !== item.unitPrice) result.priceChanged.push(item.name);
          const existing = nextCart.find((i) => i.productId === product.id);
          if (existing) {
            existing.quantity = Number((existing.quantity + item.quantity).toFixed(2));
          } else {
            nextCart.push({
              id: `ci_${product.id}`,
              productId: product.id,
              name: product.name,
              unit: product.unit,
              unitPrice: currentPrice,
              emoji: product.emoji,
              quantity: item.quantity,
              soldByWeight: product.soldByWeight,
            });
          }
          result.added += 1;
        }
        patch((prev) => ({ ...prev, cart: nextCart }));
        return result;
      },

      upsertProduct: (product) =>
        patch((prev) => ({
          ...prev,
          products: prev.products.some((prd) => prd.id === product.id)
            ? prev.products.map((prd) => (prd.id === product.id ? product : prd))
            : [product, ...prev.products],
        })),

      removeProduct: (productId) =>
        patch((prev) => ({ ...prev, products: prev.products.filter((p) => p.id !== productId) })),

      setStock: (productId, stock, lowStockThreshold) =>
        patch((prev) => ({
          ...prev,
          products: prev.products.map((p) =>
            p.id === productId
              ? {
                  ...p,
                  stock,
                  lowStockThreshold: lowStockThreshold ?? p.lowStockThreshold,
                  available: stock > 0 ? p.available : false,
                }
              : p,
          ),
        })),

      upsertCategory: (category) =>
        patch((prev) => ({
          ...prev,
          categories: prev.categories.some((c) => c.id === category.id)
            ? prev.categories.map((c) => (c.id === category.id ? category : c))
            : [...prev.categories, category],
        })),

      upsertPromotion: (promotion) =>
        patch((prev) => ({
          ...prev,
          promotions: prev.promotions.some((pr) => pr.id === promotion.id)
            ? prev.promotions.map((pr) => (pr.id === promotion.id ? promotion : pr))
            : [promotion, ...prev.promotions],
        })),

      updateShop: (shopPatch) =>
        patch((prev) => ({ ...prev, shop: { ...prev.shop, ...shopPatch } })),

      toggleNotification: (id) =>
        patch((prev) => ({
          ...prev,
          notificationPreferences: prev.notificationPreferences.map((np) =>
            np.id === id ? { ...np, enabled: !np.enabled } : np,
          ),
        })),

      saveAddress: (address) =>
        patch((prev) => ({
          ...prev,
          savedAddresses: [
            ...prev.savedAddresses,
            { ...address, id: address.id ?? `addr_${prev.savedAddresses.length + 1}` },
          ],
        })),

      removeAddress: (id) =>
        patch((prev) => ({
          ...prev,
          savedAddresses: prev.savedAddresses.filter((a) => a.id !== id),
        })),
    };
  }, [state, patch]);

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function useAppStore() {
  const ctx = useContext(AppStoreContext);
  if (!ctx) throw new Error("useAppStore must be used inside AppStoreProvider");
  return ctx;
}

/* ---------- selectors (pure, easy to swap for Convex queries) ---------- */

export function stockStatus(product: Product) {
  if (!product.available || product.stock <= 0) return "out_of_stock" as const;
  if (product.stock <= product.lowStockThreshold) return "low_stock" as const;
  return "in_stock" as const;
}

export function effectivePrice(product: Product) {
  return product.promoPrice ?? product.price;
}

export function filterProducts(
  products: Product[],
  options: {
    search?: string;
    categoryId?: string;
    maxPrice?: number;
    inStockOnly?: boolean;
    sort?: "popular" | "price_asc" | "price_desc" | "newest";
  },
) {
  const { search = "", categoryId, maxPrice, inStockOnly, sort = "popular" } = options;
  const term = search.trim().toLowerCase();
  let result = products.filter((p) => {
    if (term && !p.name.toLowerCase().includes(term)) return false;
    if (categoryId && p.categoryId !== categoryId) return false;
    if (maxPrice != null && effectivePrice(p) > maxPrice) return false;
    if (inStockOnly && stockStatus(p) === "out_of_stock") return false;
    return true;
  });
  result = [...result].sort((a, b) => {
    switch (sort) {
      case "price_asc":
        return effectivePrice(a) - effectivePrice(b);
      case "price_desc":
        return effectivePrice(b) - effectivePrice(a);
      case "newest":
        return b.createdAt.localeCompare(a.createdAt);
      default:
        return b.popularity - a.popularity;
    }
  });
  return result;
}

export const ORDER_STATUS_FLOW: OrderStatus[] = [
  "received",
  "confirmed",
  "preparing",
  "ready",
  "out_for_delivery",
  "delivered",
];

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  received: "Order Received",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready: "Ready for Delivery",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const PAYMENT_LABEL = {
  mobile_money: "Mobile Money",
  cash_on_delivery: "Cash on Delivery",
  card: "Card",
} as const;

export const MOBILE_MONEY_PROVIDERS = ["EcoCash", "M-Pesa", "Other mobile money"];
