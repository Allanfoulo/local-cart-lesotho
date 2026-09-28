import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import {
  seedShop,
  seedCategories,
  seedProducts,
  seedOrders,
  seedCustomers,
  seedPromotions,
  seedNotificationPreferences,
} from "./seed";
import type {
  CartItem,
  Category,
  DeliveryAddress,
  Order,
  OrderStatus,
  Payment,
  Product,
  Promotion,
  Shop,
} from "./types";
import {
  canTransition,
  cartDiscount,
  money,
  productPrice,
  validateCheckout,
  validateQuantity,
} from "./commerce";

const KEY = "mabote-fresh-state-v2";
const initialState = {
  shop: seedShop,
  categories: seedCategories,
  products: seedProducts,
  orders: seedOrders,
  customers: seedCustomers,
  promotions: seedPromotions,
  notificationPreferences: seedNotificationPreferences,
  cart: [] as CartItem[],
  deliveryArea: seedShop.defaultDeliveryArea,
  savedAddresses: [] as DeliveryAddress[],
  favourites: [] as string[],
  ownOrderIds: [] as string[],
  coupon: "",
  account: { name: "", phone: "", email: "", signedIn: false },
};
type State = typeof initialState;
function useStoreValue() {
  const [state, setState] = useState<State>(initialState);
  const [ready, setReady] = useState(false);
  const ref = useRef(state);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (
          Array.isArray(parsed.products) &&
          Array.isArray(parsed.orders) &&
          Array.isArray(parsed.cart)
        )
          ref.current = { ...initialState, ...parsed };
      }
    } catch {
      /* start safely with demo data */
    }
    setState(ref.current);
    setReady(true);
    const sync = (event: StorageEvent) => {
      if (event.key === KEY && event.newValue) {
        try {
          const next = JSON.parse(event.newValue);
          if (
            Array.isArray(next.products) &&
            Array.isArray(next.orders) &&
            Array.isArray(next.cart)
          ) {
            ref.current = { ...initialState, ...next };
            setState(ref.current);
          }
        } catch {
          /* ignore invalid data */
        }
      }
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  const change = (fn: (s: State) => State) => {
    const next = fn(ref.current);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      throw new Error("Your browser could not save changes. Free some storage and try again.");
    }
    ref.current = next;
    setState(next);
  };
  const itemFor = (p: Product, quantity: number, s: State): CartItem => ({
    id: `ci_${p.id}`,
    productId: p.id,
    name: p.name,
    unit: p.unit,
    unitPrice: productPrice(p, s.promotions),
    emoji: p.emoji,
    quantity,
    soldByWeight: p.soldByWeight,
  });
  const cart = state.cart.map((i) => {
    const p = state.products.find((p) => p.id === i.productId);
    return p ? itemFor(p, i.quantity, state) : i;
  });
  const cartSubtotal = money(cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0));
  const discount = cartDiscount(cart, state.products, state.promotions, state.coupon);
  const addToCart = (product: Product, quantity = 1) =>
    change((s) => {
      const p = s.products.find((p) => p.id === product.id);
      if (!p) throw new Error("This product is no longer available.");
      const qty = money((s.cart.find((i) => i.productId === p.id)?.quantity ?? 0) + quantity);
      validateQuantity(p, qty);
      return { ...s, cart: [...s.cart.filter((i) => i.productId !== p.id), itemFor(p, qty, s)] };
    });
  return {
    ...state,
    cart,
    ready,
    cartCount: cart.length,
    cartSubtotal,
    discount,
    total: money(cartSubtotal + state.shop.deliveryFee - discount),
    addToCart,
    setCartQuantity: (id: string, quantity: number) =>
      change((s) => {
        if (quantity === 0) return { ...s, cart: s.cart.filter((i) => i.productId !== id) };
        const p = s.products.find((p) => p.id === id);
        if (!p) throw new Error("Product unavailable.");
        validateQuantity(p, quantity);
        return {
          ...s,
          cart: s.cart.map((i) => (i.productId === id ? itemFor(p, quantity, s) : i)),
        };
      }),
    removeFromCart: (id: string) =>
      change((s) => ({ ...s, cart: s.cart.filter((i) => i.productId !== id) })),
    clearCart: () => change((s) => ({ ...s, cart: [], coupon: "" })),
    setCoupon: (coupon: string) => change((s) => ({ ...s, coupon })),
    setDeliveryArea: (deliveryArea: string) => change((s) => ({ ...s, deliveryArea })),
    toggleFavourite: (id: string) =>
      change((s) => ({
        ...s,
        favourites: s.favourites.includes(id)
          ? s.favourites.filter((i) => i !== id)
          : [...s.favourites, id],
      })),
    updateAccount: (patch: Partial<State["account"]>) =>
      change((s) => ({ ...s, account: { ...s.account, ...patch } })),
    placeOrder: (input: {
      customer: Order["customer"];
      address: DeliveryAddress;
      payment: Payment;
    }) => {
      const s = ref.current;
      if (
        !input.customer.name.trim() ||
        !/^(?:\+266)?[256]\d{7}$/.test(input.customer.phone.replace(/[\s-]/g, ""))
      )
        throw new Error("Enter a name and valid Lesotho phone number.");
      if (!input.address.address.trim() || !s.shop.deliveryAreas.includes(input.address.area))
        throw new Error("Enter an address in a supported delivery area.");
      const currentCart = s.cart.map((i) => {
        const p = s.products.find((p) => p.id === i.productId);
        return p ? itemFor(p, i.quantity, s) : i;
      });
      const reduction = cartDiscount(currentCart, s.products, s.promotions, s.coupon);
      const { subtotal, total } = validateCheckout(
        currentCart,
        s.products,
        s.shop,
        input.payment,
        reduction,
      );
      const now = new Date().toISOString();
      const sequence =
        Math.max(1042, ...s.orders.map((o) => Number(o.number.replace(/\D/g, "")))) + 1;
      const order: Order = {
        id: `ord-${sequence}`,
        number: `#ORD-${sequence}`,
        ...input,
        payment: {
          ...input.payment,
          status: "pending",
          changeRequired:
            input.payment.method === "cash_on_delivery" && !input.payment.exactAmount
              ? money(input.payment.cashGiven! - total)
              : 0,
        },
        items: currentCart.map((i) => ({ ...i, lineTotal: money(i.unitPrice * i.quantity) })),
        subtotal,
        total,
        discount: reduction,
        deliveryFee: s.shop.deliveryFee,
        status: "received",
        createdAt: now,
        estimatedDelivery: new Date(Date.now() + 7200000).toISOString(),
        timeline: [{ status: "received", at: now }],
      };
      change((prev) => ({
        ...prev,
        orders: [order, ...prev.orders],
        ownOrderIds: [order.id, ...prev.ownOrderIds],
        cart: [],
        coupon: "",
        products: prev.products.map((p) => ({
          ...p,
          stock: money(p.stock - (currentCart.find((i) => i.productId === p.id)?.quantity ?? 0)),
        })),
        customers: prev.customers.some((c) => c.phone === input.customer.phone)
          ? prev.customers.map((c) =>
              c.phone === input.customer.phone
                ? {
                    ...c,
                    orders: c.orders + 1,
                    lifetimeSpend: money(c.lifetimeSpend + total),
                    lastOrder: now,
                  }
                : c,
            )
          : [
              ...prev.customers,
              {
                ...input.customer,
                id: crypto.randomUUID(),
                orders: 1,
                lifetimeSpend: total,
                lastOrder: now,
              },
            ],
      }));
      return order;
    },
    updateOrderStatus: (id: string, status: OrderStatus, note?: string) =>
      change((s) => {
        const order = s.orders.find((o) => o.id === id);
        if (!order || !canTransition(order.status, status))
          throw new Error("This order cannot move to that status.");
        if (status === "out_for_delivery" && !order.driver)
          throw new Error("Assign a driver before dispatch.");
        return {
          ...s,
          orders: s.orders.map((o) =>
            o.id === id
              ? {
                  ...o,
                  status,
                  timeline: [
                    ...o.timeline,
                    { status, at: new Date().toISOString(), ...(note ? { note } : {}) },
                  ],
                }
              : o,
          ),
          products:
            status === "cancelled"
              ? s.products.map((p) => ({
                  ...p,
                  stock: money(
                    p.stock + (order.items.find((i) => i.productId === p.id)?.quantity ?? 0),
                  ),
                }))
              : s.products,
        };
      }),
    markPaid: (id: string) =>
      change((s) => ({
        ...s,
        orders: s.orders.map((o) =>
          o.id === id && o.status !== "cancelled"
            ? {
                ...o,
                payment: { ...o.payment, status: "paid" },
                timeline: [
                  ...o.timeline,
                  {
                    status: "note",
                    at: new Date().toISOString(),
                    note: "Payment received and recorded by staff.",
                  },
                ],
              }
            : o,
        ),
      })),
    assignDriver: (id: string, driver: string) =>
      change((s) => ({
        ...s,
        orders: s.orders.map((o) =>
          o.id === id
            ? {
                ...o,
                driver: driver.trim(),
                timeline: [
                  ...o.timeline,
                  {
                    status: "note",
                    at: new Date().toISOString(),
                    note: `Driver assigned: ${driver.trim()}`,
                  },
                ],
              }
            : o,
        ),
      })),
    reorder: (id: string) => {
      const result = { added: 0, unavailable: [] as string[], priceChanged: [] as string[] };
      change((s) => {
        const order = s.orders.find((o) => o.id === id);
        if (!order) return s;
        const next = s.cart.map((i) => ({ ...i }));
        for (const item of order.items) {
          const p = s.products.find((p) => p.id === item.productId);
          if (!p || !p.available || p.stock <= 0) {
            result.unavailable.push(item.name);
            continue;
          }
          const existing = next.find((i) => i.productId === p.id);
          const wanted = (existing?.quantity ?? 0) + item.quantity;
          const quantity = Math.min(p.stock, wanted);
          if (quantity < wanted) result.unavailable.push(`${p.name} (limited stock)`);
          if (productPrice(p, s.promotions) !== item.unitPrice) result.priceChanged.push(p.name);
          if (existing) Object.assign(existing, itemFor(p, quantity, s));
          else next.push(itemFor(p, quantity, s));
          result.added++;
        }
        return { ...s, cart: next };
      });
      return result;
    },
    upsertProduct: (p: Product) =>
      change((s) => ({
        ...s,
        products: s.products.some((i) => i.id === p.id)
          ? s.products.map((i) => (i.id === p.id ? p : i))
          : [...s.products, p],
      })),
    removeProduct: (id: string) =>
      change((s) => ({ ...s, products: s.products.filter((p) => p.id !== id) })),
    setStock: (id: string, stock: number, threshold?: number) => {
      if (!Number.isFinite(stock) || stock < 0) throw new Error("Enter a valid stock quantity.");
      change((s) => ({
        ...s,
        products: s.products.map((p) =>
          p.id === id ? { ...p, stock, lowStockThreshold: threshold ?? p.lowStockThreshold } : p,
        ),
      }));
    },
    upsertCategory: (category: Category) =>
      change((s) => ({
        ...s,
        categories: s.categories.some((c) => c.id === category.id)
          ? s.categories.map((c) => (c.id === category.id ? category : c))
          : [...s.categories, category],
      })),
    upsertPromotion: (promotion: Promotion) =>
      change((s) => ({
        ...s,
        promotions: s.promotions.some((p) => p.id === promotion.id)
          ? s.promotions.map((p) => (p.id === promotion.id ? promotion : p))
          : [...s.promotions, promotion],
      })),
    updateShop: (patch: Partial<Shop>) => change((s) => ({ ...s, shop: { ...s.shop, ...patch } })),
    toggleNotification: (id: string) =>
      change((s) => ({
        ...s,
        notificationPreferences: s.notificationPreferences.map((p) =>
          p.id === id ? { ...p, enabled: !p.enabled } : p,
        ),
      })),
    saveAddress: (address: DeliveryAddress) =>
      change((s) => ({
        ...s,
        savedAddresses: [
          ...s.savedAddresses.filter((a) => !address.id || a.id !== address.id),
          { ...address, id: address.id ?? crypto.randomUUID() },
        ],
      })),
    removeAddress: (id: string) =>
      change((s) => ({ ...s, savedAddresses: s.savedAddresses.filter((a) => a.id !== id) })),
  };
}
const Context = createContext<ReturnType<typeof useStoreValue> | null>(null);
export function AppStoreProvider({ children }: { children: ReactNode }) {
  const value = useStoreValue();
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useAppStore() {
  const value = useContext(Context);
  if (!value) throw new Error("Missing store provider");
  return value;
}
export const stockStatus = (p: Product) =>
  !p.available || p.stock <= 0
    ? "out_of_stock"
    : p.stock <= p.lowStockThreshold
      ? "low_stock"
      : "in_stock";
export const effectivePrice = (p: Product) => p.promoPrice ?? p.price;
export const ORDER_STATUS_FLOW: OrderStatus[] = [
  "received",
  "confirmed",
  "preparing",
  "ready",
  "out_for_delivery",
  "delivered",
];
export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  received: "Order received",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready: "Ready for delivery",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};
export const PAYMENT_LABEL = {
  mobile_money: "Mobile money",
  cash_on_delivery: "Cash on delivery",
  card: "Card",
};
export const MOBILE_MONEY_PROVIDERS = ["EcoCash", "M-Pesa"];
