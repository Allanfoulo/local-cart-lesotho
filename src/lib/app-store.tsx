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
  DeliveryLandmark,
  NotificationPreference,
  Order,
  OrderStatus,
  Payment,
  Product,
  Promotion,
  Shop,
} from "./types";

const STORAGE_KEY = "reetapele-state-v1";
const LEGACY_STORAGE_KEY = ["mabote", "fresh", "state", "v1"].join("-");

function renameSavedBrand(value: unknown): unknown {
  if (typeof value === "string") {
    return value.replace(/mabote([\s_-]+)fresh/gi, (match) =>
      /\s/.test(match) ? "REETAPELE" : "reetapele",
    );
  }
  if (Array.isArray(value)) return value.map(renameSavedBrand);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, renameSavedBrand(nestedValue)]),
    );
  }
  return value;
}

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
  deliveryLandmarks: DeliveryLandmark[];
  deliveryRouteSequence: Record<string, string[]>;
  favourites: string[];
  account: { customerId: string; name: string; phone: string; email?: string; signedIn: boolean };
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
  deliveryLandmarks: [],
  deliveryRouteSequence: {},
  favourites: ["prd_1", "prd_24"],
  account: { customerId: seedCustomers[0]!.id, name: "Thabo Molefi", phone: "+266 5888 1234", email: "thabo@gmail.com", signedIn: true },
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
  setOrderPaymentStatus: (orderId: string, status: Payment["status"]) => void;
  assignDriver: (orderId: string, driver: string) => void;
  setDeliveryRouteSequence: (driver: string, orderIds: string[]) => void;
  reorder: (orderId: string) => { added: number; unavailable: string[]; priceChanged: string[] };
  // admin
  upsertProduct: (product: Product) => void;
  removeProduct: (productId: string) => void;
  setStock: (productId: string, stock: number, lowStockThreshold?: number) => void;
  upsertCategory: (category: Category) => void;
  upsertPromotion: (promotion: Promotion) => void;
  updateShop: (patch: Partial<Shop>) => void;
  toggleNotification: (id: string) => void;
  updateAccount: (account: { name: string; phone: string; email?: string }) => void;
  saveAddress: (address: DeliveryAddress) => void;
  removeAddress: (id: string) => void;
  saveDeliveryLandmark: (landmark: DeliveryLandmark) => void;
  removeDeliveryLandmark: (id: string) => void;
}

const AppStoreContext = createContext<AppStoreValue | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(initialState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const currentRaw = window.localStorage.getItem(STORAGE_KEY);
      const legacyRaw = currentRaw === null ? window.localStorage.getItem(LEGACY_STORAGE_KEY) : null;
      const raw = currentRaw ?? legacyRaw;
      if (raw) {
        const saved = renameSavedBrand(JSON.parse(raw)) as Partial<AppState>;
        if (legacyRaw !== null) {
          try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
            window.localStorage.removeItem(LEGACY_STORAGE_KEY);
          } catch {
            /* Keep loading the saved state if storage is temporarily unavailable. */
          }
        }
        setState((prev) => {
          const customers = saved.customers ?? prev.customers;
          const account = {
            ...prev.account,
            ...saved.account,
            customerId:
              saved.account?.customerId ??
              customers.find((customer) => customer.phone === saved.account?.phone)?.id ??
              prev.account.customerId,
          };
          const orders = (saved.orders ?? prev.orders).map((order) => ({
            ...order,
            customer: {
              ...order.customer,
              customerId:
                order.customer.customerId ??
                customers.find((customer) => customer.phone === order.customer.phone)?.id,
            },
          }));
          return {
            ...prev,
            ...saved,
            account,
            customers,
            orders,
            deliveryLandmarks: saved.deliveryLandmarks ?? prev.deliveryLandmarks,
          };
        });
      }
    } catch {
      /* ignore corrupt storage */
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage full or unavailable */
    }
  }, [state, hydrated]);

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
          customer: { ...customer, customerId: state.account.customerId },
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
        patch((prev) => ({
          ...prev,
          orders: [order, ...prev.orders],
          cart: [],
          customers: prev.customers.map((savedCustomer) =>
            savedCustomer.id === prev.account.customerId
              ? {
                  ...savedCustomer,
                  name: order.customer.name,
                  phone: order.customer.phone,
                  email: order.customer.email,
                  orders: savedCustomer.orders + 1,
                  lifetimeSpend: Number((savedCustomer.lifetimeSpend + order.total).toFixed(2)),
                  lastOrder: order.createdAt,
                }
              : savedCustomer,
          ),
        }));
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
                  timeline: [...o.timeline, { status, at: new Date().toISOString(), note }],
                }
              : o,
          ),
        })),

      setOrderPaymentStatus: (orderId, status) =>
        patch((prev) => ({
          ...prev,
          orders: prev.orders.map((order) =>
            order.id === orderId
              ? {
                  ...order,
                  payment: { ...order.payment, status },
                  timeline: [
                    ...order.timeline,
                    {
                      status: "note",
                      at: new Date().toISOString(),
                      note: `Payment marked ${status} by staff.`,
                    },
                  ],
                }
              : order,
          ),
        })),

      assignDriver: (orderId, driver) =>
        patch((prev) => ({
          ...prev,
          orders: prev.orders.map((o) =>
            o.id === orderId
              ? {
                  ...o,
                  driver: driver || undefined,
                  timeline: [
                    ...o.timeline,
                    { status: "note", at: new Date().toISOString(), note: driver ? `Driver assigned: ${driver}` : "Driver assignment cleared." },
                  ],
                }
              : o,
          ),
        })),

      setDeliveryRouteSequence: (driver, orderIds) =>
        patch((prev) => ({
          ...prev,
          deliveryRouteSequence: {
            ...prev.deliveryRouteSequence,
            [driver]: orderIds,
          },
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

      updateAccount: (account) =>
        patch((prev) => ({
          ...prev,
          account: { ...prev.account, ...account },
          customers: prev.customers.map((customer) =>
            customer.id === prev.account.customerId ? { ...customer, ...account } : customer,
          ),
        })),

      saveAddress: (address) =>
        patch((prev) => ({
          ...prev,
          savedAddresses: prev.savedAddresses.some((saved) => saved.id === address.id)
            ? prev.savedAddresses.map((saved) => saved.id === address.id ? address : saved)
            : [...prev.savedAddresses, { ...address, id: address.id ?? crypto.randomUUID() }],
        })),

      removeAddress: (id) =>
        patch((prev) => ({
          ...prev,
          savedAddresses: prev.savedAddresses.filter((a) => a.id !== id),
        })),

      saveDeliveryLandmark: (landmark) =>
        patch((prev) => ({
          ...prev,
          deliveryLandmarks: prev.deliveryLandmarks.some((item) => item.id === landmark.id)
            ? prev.deliveryLandmarks.map((item) => (item.id === landmark.id ? landmark : item))
            : [...prev.deliveryLandmarks, landmark],
        })),

      removeDeliveryLandmark: (id) =>
        patch((prev) => ({
          ...prev,
          deliveryLandmarks: prev.deliveryLandmarks.filter((item) => item.id !== id),
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
