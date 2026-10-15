/**
 * Single integration boundary for all application data.
 *
 * Convex is the operational source of truth. Only the cart and delivery-area
 * display preference are persisted locally.
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
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

import {
  seedCategories,
  seedNotificationPreferences,
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

const STORAGE_KEY = "reetapele-shopper-v2";
const PREVIOUS_STORAGE_KEYS = ["reetapele-state-v1", ["mabote", "fresh", "state", "v1"].join("-")];

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
  stores: Shop[];
  managementStores: Shop[];
  managementCategories: Category[];
  managementProducts: Product[];
  managementPromotions: Promotion[];
  managementStoreId: string;
  categories: Category[];
  products: Product[];
  orders: Order[];
  customers: Customer[];
  drivers: Array<{ id: string; name: string; storeIds: string[] }>;
  preparationStaff: Array<{ id: string; name: string; storeIds: string[] }>;
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
  stores: [seedShop],
  managementStores: [seedShop],
  managementCategories: seedCategories,
  managementProducts: seedProducts,
  managementPromotions: seedPromotions,
  managementStoreId: seedShop.id,
  categories: seedCategories,
  products: seedProducts,
  orders: [],
  customers: [],
  drivers: [],
  preparationStaff: [],
  promotions: seedPromotions,
  notificationPreferences: seedNotificationPreferences,
  cart: [],
  deliveryArea: seedShop.defaultDeliveryArea,
  savedAddresses: [],
  deliveryLandmarks: [],
  deliveryRouteSequence: {},
  favourites: [],
  account: { customerId: "", name: "", phone: "", email: undefined, signedIn: false },
};

interface AppStoreValue extends AppState {
  managementStore: Shop;
  setManagementStore: (storeId: string) => void;
  createPlatformStore: (args: {
    name: string;
    slug: string;
    tagline: string;
    phone: string;
    whatsapp: string;
    address: string;
    openingHours: string;
    deliveryArea: string;
  }) => Promise<Id<"stores">>;
  setPlatformStoreEnabled: (storeId: Id<"stores">, enabled: boolean) => Promise<null>;
  // cart
  addToCart: (product: Product, quantity?: number) => void;
  setCartQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  cartCount: number;
  cartSubtotal: number;
  replaceMarketplaceCatalog: (catalog: {
    stores: Shop[];
    categories: Category[];
    products: Product[];
    promotions?: Promotion[];
  }) => void;
  replaceManagementWorkspace: (catalog: {
    stores: Shop[];
    categories: Category[];
    products: Product[];
    promotions: Promotion[];
  }) => void;
  replaceStaffWorkspace: (workspace: { orders: Order[]; customers: Customer[]; drivers: AppState["drivers"]; preparationStaff?: AppState["preparationStaff"]; deliveryRouteSequence?: Record<string, string[]> }) => void;
  replaceDeliveryLandmarks: (places: DeliveryLandmark[]) => void;
  replaceCustomerAccount: (account: { customerId: string; name: string; phone: string; email: string; addresses: DeliveryAddress[]; favourites: string[]; preferences: Array<{ key: string; enabled: boolean }> }) => void;
  recordConvexCheckout: (input: {
    checkoutId: string;
    customer: { name: string; phone: string; email?: string };
    address: DeliveryAddress;
    payment: Payment;
    orders: Array<{
      orderId: string;
      orderNumber: string;
      storeId: string;
      storeName: string;
      subtotal: number;
      discount: number;
      deliveryFee: number;
      total: number;
      createdAt: number;
      estimatedDeliveryAt: number;
      items: Array<{
        productId: string;
        name: string;
        unit: Product["unit"];
        emoji: string;
        unitPrice: number;
        quantity: number;
        lineTotal: number;
        soldByWeight: boolean;
      }>;
    }>;
  }) => Order[];
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
  assignPreparationStaff: (orderId: string, staffUserId: string) => void;
  setDeliveryRouteSequence: (driver: string, orderIds: string[]) => void;
  reorder: (orderId: string) => { added: number; unavailable: string[]; priceChanged: string[] };
  // admin
  upsertProduct: (product: Product) => void;
  removeProduct: (productId: string) => void;
  setStock: (productId: string, stock: number, lowStockThreshold?: number) => void;
  upsertCategory: (category: Category) => void;
  upsertPromotion: (promotion: Promotion) => void;
  toggleNotification: (id: string) => void;
  updateAccount: (account: { name: string; phone: string; email?: string }) => void;
  updateShop: (patch: Partial<Shop>) => Promise<void>;
  saveAddress: (address: DeliveryAddress) => void;
  removeAddress: (id: string) => void;
  saveDeliveryLandmark: (landmark: DeliveryLandmark) => void;
  removeDeliveryLandmark: (id: string) => void;
}

const AppStoreContext = createContext<AppStoreValue | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(initialState);
  const [hydrated, setHydrated] = useState(false);
  const saveProductMutation = useMutation(api.catalog.upsertProduct);
  const deleteProductMutation = useMutation(api.catalog.deleteProduct);
  const saveCategoryMutation = useMutation(api.catalog.upsertCategory);
  const savePromotionMutation = useMutation(api.catalog.upsertPromotion);
  const saveStoreSettingsMutation = useMutation(api.catalog.updateStoreSettings);
  const createPlatformStoreMutation = useMutation(api.stores.create);
  const setPlatformStoreEnabledMutation = useMutation(api.stores.setEnabled);
  const updateOrderStatusMutation = useMutation(api.orders.updateStatus);
  const assignDriverMutation = useMutation(api.orders.assignDriver);
  const assignPreparationStaffMutation = useMutation(api.orders.assignPreparationStaff);
  const paymentStatusMutation = useMutation(api.orders.setPaymentStatus);
  const routeSequenceMutation = useMutation(api.orders.setRouteSequence);
  const toggleFavouriteMutation = useMutation(api.customers.toggleFavourite);
  const setPreferenceMutation = useMutation(api.customers.setPreference);
  const updateProfileMutation = useMutation(api.customers.updateProfile);
  const saveAddressMutation = useMutation(api.customers.saveAddress);
  const removeAddressMutation = useMutation(api.customers.removeAddress);
  const savePlaceMutation = useMutation(api.deliveryPlaces.upsert);
  const removePlaceMutation = useMutation(api.deliveryPlaces.remove);

  const reportFailure = useCallback((reason: unknown) => {
    toast.error(reason instanceof Error ? reason.message : "Could not save the change.");
  }, []);
  const sendProduct = useCallback((product: Product) => {
    const { id, storeId, slug, name, description, categoryId, price, promoPrice, unit, soldByWeight, weightOptions, stock, lowStockThreshold, available, popularity, emoji, variants } = product;
    const productId = id.startsWith("prd_") ? undefined : id as Id<"products">;
    return saveProductMutation({
      ...(productId ? { productId } : {}), storeId: storeId as Id<"stores">, slug, name, description,
      categoryId: categoryId as Id<"categories">, price, ...(promoPrice === undefined ? {} : { promoPrice }),
      unit, soldByWeight, ...(weightOptions === undefined ? {} : { weightOptions }), stock, lowStockThreshold,
      available, popularity, emoji, ...(variants === undefined ? {} : { variants: variants.map(({ label, multiplier }) => ({ label, multiplier })) }),
    });
  }, [saveProductMutation]);

  useEffect(() => {
    try {
      let raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) raw = PREVIOUS_STORAGE_KEYS.map((key) => window.localStorage.getItem(key)).find(Boolean) ?? null;
      if (raw) {
        const saved = renameSavedBrand(JSON.parse(raw)) as Partial<AppState>;
        setState((prev) => ({
          ...prev,
          cart: Array.isArray(saved.cart) ? saved.cart : [],
          deliveryArea: typeof saved.deliveryArea === "string" ? saved.deliveryArea : prev.deliveryArea,
        }));
        for (const key of PREVIOUS_STORAGE_KEYS) window.localStorage.removeItem(key);
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
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ cart: state.cart, deliveryArea: state.deliveryArea }));
    } catch {
      /* storage full or unavailable */
    }
  }, [state.cart, state.deliveryArea, hydrated]);

  const patch = useCallback((updater: (prev: AppState) => AppState) => setState(updater), []);
  const replaceMarketplaceCatalog = useCallback(
    (catalog: { stores: Shop[]; categories: Category[]; products: Product[]; promotions?: Promotion[] }) => {
      patch((prev) => {
        const selectedArea = catalog.stores.some((store) =>
          store.deliveryAreas.includes(prev.deliveryArea),
        )
          ? prev.deliveryArea
          : catalog.stores[0]?.defaultDeliveryArea ?? prev.deliveryArea;
        const productsBySlug = new Map(catalog.products.map((product) => [product.slug, product]));
        return {
          ...prev,
          shop: catalog.stores[0] ?? prev.shop,
          stores: catalog.stores,
          categories: catalog.categories,
          products: catalog.products,
          ...(catalog.promotions ? { promotions: catalog.promotions } : {}),
          deliveryArea: selectedArea,
          cart: prev.cart.flatMap((item) => {
            const current = catalog.products.find((product) => product.id === item.productId);
            const previous = prev.products.find((product) => product.id === item.productId);
            const product = current ?? (previous ? productsBySlug.get(previous.slug) : undefined);
            return product
              ? [
                  {
                    ...item,
                    id: `ci_${product.id}`,
                    productId: product.id,
                    storeId: product.storeId,
                    storeName: product.storeName,
                    name: product.name,
                    unit: product.unit,
                    unitPrice: product.promoPrice ?? product.price,
                    emoji: product.emoji,
                    soldByWeight: product.soldByWeight,
                  },
                ]
              : [];
          }),
        };
      });
    },
    [patch],
  );
  const replaceManagementWorkspace = useCallback(
    (catalog: { stores: Shop[]; categories: Category[]; products: Product[]; promotions: Promotion[] }) => {
      patch((prev) => ({
        ...prev,
        managementStores: catalog.stores,
        managementCategories: catalog.categories,
        managementProducts: catalog.products,
        managementPromotions: catalog.promotions,
        managementStoreId: catalog.stores.some((store) => store.id === prev.managementStoreId)
          ? prev.managementStoreId
          : catalog.stores[0]?.id ?? prev.managementStoreId,
      }));
    },
    [patch],
  );
  const replaceStaffWorkspace = useCallback(
    (workspace: { orders: Order[]; customers: Customer[]; drivers: AppState["drivers"]; preparationStaff?: AppState["preparationStaff"]; deliveryRouteSequence?: Record<string, string[]> }) => {
      patch((prev) => ({ ...prev, orders: workspace.orders, customers: workspace.customers, drivers: workspace.drivers, preparationStaff: workspace.preparationStaff ?? [], deliveryRouteSequence: workspace.deliveryRouteSequence ?? {} }));
    },
    [patch],
  );
  const replaceDeliveryLandmarks = useCallback((places: DeliveryLandmark[]) => {
    patch((prev) => ({ ...prev, deliveryLandmarks: places }));
  }, [patch]);
  const replaceCustomerAccount = useCallback((account: { customerId: string; name: string; phone: string; email: string; addresses: DeliveryAddress[]; favourites: string[]; preferences: Array<{ key: string; enabled: boolean }> }) => {
    patch((prev) => ({
      ...prev,
      account: { customerId: account.customerId, name: account.name, phone: account.phone, email: account.email, signedIn: true },
      savedAddresses: account.addresses,
      favourites: account.favourites,
      notificationPreferences: prev.notificationPreferences.map((preference) => ({
        ...preference,
        enabled: account.preferences.find((item) => item.key === preference.id)?.enabled ?? preference.enabled,
      })),
    }));
  }, [patch]);

  const value = useMemo<AppStoreValue>(() => {
    const cartCount = state.cart.length;
    const cartSubtotal = Number(
      state.cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0).toFixed(2),
    );
    const managementStore = state.managementStores.find((store) => store.id === state.managementStoreId) ?? state.managementStores[0] ?? state.shop;

    return {
      ...state,
      managementStore,
      setManagementStore: (storeId) => {
        if (state.managementStores.some((store) => store.id === storeId)) {
          patch((prev) => ({ ...prev, managementStoreId: storeId }));
        }
      },
      createPlatformStore: (args) => createPlatformStoreMutation(args),
      setPlatformStoreEnabled: (storeId, enabled) => setPlatformStoreEnabledMutation({ storeId, enabled }),
      cartCount,
      cartSubtotal,

      replaceMarketplaceCatalog,
      replaceManagementWorkspace,
      replaceStaffWorkspace,
      replaceDeliveryLandmarks,
      replaceCustomerAccount,

      recordConvexCheckout: ({ checkoutId, customer, address, payment, orders: receipts }) => {
        const orders: Order[] = receipts.map((receipt, index) => {
          const createdAt = new Date(receipt.createdAt).toISOString();
          return {
            id: receipt.orderId,
            checkoutId,
            storeId: receipt.storeId,
            storeName: receipt.storeName,
            number: receipt.orderNumber,
            customer: { ...customer, customerId: state.account.customerId },
            items: receipt.items.map((item) => ({
              id: `oi_${item.productId}`,
              productId: item.productId,
              storeId: receipt.storeId,
              storeName: receipt.storeName,
              name: item.name,
              unit: item.unit,
              unitPrice: item.unitPrice,
              emoji: item.emoji,
              quantity: item.quantity,
              soldByWeight: item.soldByWeight,
              lineTotal: item.lineTotal,
            })),
            address,
            payment: index === 0 ? payment : { ...payment, changeRequired: undefined },
            subtotal: receipt.subtotal,
            deliveryFee: receipt.deliveryFee,
            discount: receipt.discount,
            total: receipt.total,
            status: "received",
            createdAt,
            estimatedDelivery: new Date(receipt.estimatedDeliveryAt).toISOString(),
            timeline: [
              { status: "created", at: createdAt },
              { status: "received", at: createdAt },
            ],
          };
        });
        patch((prev) => ({
          ...prev,
          orders: [...orders, ...prev.orders],
          cart: [],
          customers: prev.customers.map((savedCustomer) =>
            savedCustomer.id === prev.account.customerId
              ? {
                  ...savedCustomer,
                  ...customer,
                  orders: savedCustomer.orders + orders.length,
                  lifetimeSpend: Number(
                    (savedCustomer.lifetimeSpend + orders.reduce((sum, order) => sum + order.total, 0)).toFixed(2),
                  ),
                  lastOrder: orders[0]?.createdAt ?? savedCustomer.lastOrder,
                }
              : savedCustomer,
          ),
        }));
        return orders;
      },

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
            storeId: product.storeId,
            storeName: product.storeName,
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

      toggleFavourite: (productId) => {
        if (!state.account.signedIn) {
          toast.error("Sign in to save products to your favourites.");
          return;
        }
        void toggleFavouriteMutation({ productId: productId as Id<"products"> }).catch(reportFailure);
      },

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
          storeId: state.cart[0]?.storeId ?? state.shop.id,
          storeName: state.cart[0]?.storeName ?? state.shop.name,
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

      updateOrderStatus: (orderId, status) => {
        void updateOrderStatusMutation({ orderId: orderId as Id<"orders">, status }).catch(reportFailure);
      },

      setOrderPaymentStatus: (orderId, status) => {
        void paymentStatusMutation({ orderId: orderId as Id<"orders">, status }).catch(reportFailure);
      },

      assignDriver: (orderId, driver) => {
        const selected = state.drivers.find((item) => item.id === driver || item.name === driver);
        void assignDriverMutation({ orderId: orderId as Id<"orders">, driverUserId: selected ? selected.id as Id<"users"> : null }).catch(reportFailure);
      },

      assignPreparationStaff: (orderId, staffUserId) => {
        void assignPreparationStaffMutation({ orderId: orderId as Id<"orders">, staffUserId: (staffUserId || null) as Id<"users"> | null }).catch(reportFailure);
      },

      setDeliveryRouteSequence: (driver, orderIds) => {
        const selected = state.drivers.find((item) => item.id === driver || item.name === driver);
        const storeId = state.orders.find((order) => orderIds.includes(order.id))?.storeId ?? selected?.storeIds[0];
        if (!selected || !storeId) return;
        void routeSequenceMutation({ storeId: storeId as Id<"stores">, driverUserId: selected.id as Id<"users">, orderIds: orderIds as Id<"orders">[] }).catch(reportFailure);
      },

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
              storeId: product.storeId,
              storeName: product.storeName,
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

      upsertProduct: (product) => { void sendProduct(product).catch(reportFailure); },

      removeProduct: (productId) => { void deleteProductMutation({ productId: productId as Id<"products"> }).catch(reportFailure); },

      setStock: (productId, stock, lowStockThreshold) => {
        const product = state.managementProducts.find((item) => item.id === productId);
        if (!product) return;
        void sendProduct({ ...product, stock, lowStockThreshold: lowStockThreshold ?? product.lowStockThreshold, available: stock > 0 && product.available }).catch(reportFailure);
      },

      upsertCategory: (category) => {
        const categoryId = category.id.startsWith("cat_") ? undefined : category.id as Id<"categories">;
        const storeId = category.storeId ?? managementStore.id;
        void saveCategoryMutation({ ...(categoryId ? { categoryId } : {}), storeId: storeId as Id<"stores">, slug: category.slug, name: category.name, emoji: category.emoji, accent: category.accent, enabled: category.enabled, sortOrder: category.order }).catch(reportFailure);
      },

      upsertPromotion: (promotion) => {
        const promotionId = promotion.id.startsWith("promo_") ? undefined : promotion.id as Id<"promotions">;
        void savePromotionMutation({ ...(promotionId ? { promotionId } : {}), storeId: (promotion.storeId ?? managementStore.id) as Id<"stores">, name: promotion.name, type: promotion.type, value: promotion.value, ...(promotion.code ? { code: promotion.code } : {}), startDate: promotion.startDate, endDate: promotion.endDate, active: promotion.active }).catch(reportFailure);
      },

      updateShop: (shopPatch) => {
        const shop = { ...managementStore, ...shopPatch };
        return saveStoreSettingsMutation({
          storeId: shop.id as Id<"stores">,
          name: shop.name,
          tagline: shop.tagline,
          phone: shop.phone,
          whatsapp: shop.whatsapp,
          address: shop.address,
          openingHours: shop.openingHours,
          deliveryFee: shop.deliveryFee,
          minimumOrder: shop.minimumOrder,
          deliveryAreas: shop.deliveryAreas,
          defaultDeliveryArea: shop.defaultDeliveryArea,
          mobileMoneyEnabled: shop.paymentOptions.mobileMoney,
          cashOnDeliveryEnabled: shop.paymentOptions.cashOnDelivery,
          cardEnabled: false,
        }).then(() => undefined);
      },

      toggleNotification: (id) => {
        const preference = state.notificationPreferences.find((item) => item.id === id);
        if (preference) void setPreferenceMutation({ key: id, enabled: !preference.enabled }).catch(reportFailure);
      },

      updateAccount: (account) => {
        void updateProfileMutation({ name: account.name, phone: account.phone }).catch(reportFailure);
      },

      saveAddress: (address) => {
        const addressId = address.id && state.savedAddresses.some((saved) => saved.id === address.id) ? address.id as Id<"customerAddresses"> : undefined;
        void saveAddressMutation({ ...(addressId ? { addressId } : {}), label: address.label ?? "Address", area: address.area, address: address.address, ...(address.landmark ? { landmark: address.landmark } : {}), ...(address.instructions ? { instructions: address.instructions } : {}), ...(address.lat === undefined || address.lng === undefined ? {} : { latitude: address.lat, longitude: address.lng }) }).catch(reportFailure);
      },

      removeAddress: (id) => { void removeAddressMutation({ addressId: id as Id<"customerAddresses"> }).catch(reportFailure); },

      saveDeliveryLandmark: (landmark) => {
        const placeId = state.deliveryLandmarks.some((place) => place.id === landmark.id)
          ? landmark.id as Id<"deliveryLandmarks">
          : undefined;
        void savePlaceMutation({ ...(placeId ? { placeId } : {}), storeId: (landmark.storeId ?? managementStore.id) as Id<"stores">, name: landmark.name, aliases: landmark.aliases, area: landmark.area, latitude: landmark.lat, longitude: landmark.lng, verified: true }).catch(reportFailure);
      },

      removeDeliveryLandmark: (id) => { void removePlaceMutation({ placeId: id as Id<"deliveryLandmarks"> }).catch(reportFailure); },
    };
  }, [state, patch, replaceMarketplaceCatalog, replaceManagementWorkspace, replaceStaffWorkspace, replaceDeliveryLandmarks, replaceCustomerAccount, sendProduct, deleteProductMutation, saveCategoryMutation, savePromotionMutation, saveStoreSettingsMutation, createPlatformStoreMutation, setPlatformStoreEnabledMutation, updateOrderStatusMutation, assignDriverMutation, assignPreparationStaffMutation, paymentStatusMutation, routeSequenceMutation, toggleFavouriteMutation, setPreferenceMutation, updateProfileMutation, saveAddressMutation, removeAddressMutation, savePlaceMutation, removePlaceMutation, reportFailure]);

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function useAppStore() {
  const ctx = useContext(AppStoreContext);
  if (!ctx) throw new Error("useAppStore must be used inside AppStoreProvider");
  return ctx;
}

export function groupCartByStore(cart: CartItem[], stores: Shop[]) {
  return stores
    .map((store) => {
      const items = cart.filter((item) => item.storeId === store.id);
      const subtotal = Number(
        items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0).toFixed(2),
      );
      return { store, items, subtotal, total: Number((subtotal + store.deliveryFee).toFixed(2)) };
    })
    .filter((group) => group.items.length > 0);
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
    categoryId?: string | string[];
    maxPrice?: number;
    inStockOnly?: boolean;
    sort?: "popular" | "price_asc" | "price_desc" | "newest";
  },
) {
  const { search = "", categoryId, maxPrice, inStockOnly, sort = "popular" } = options;
  const term = search.trim().toLowerCase();
  let result = products.filter((p) => {
    if (term && !p.name.toLowerCase().includes(term)) return false;
    if (categoryId && (Array.isArray(categoryId) ? !categoryId.includes(p.categoryId) : p.categoryId !== categoryId)) return false;
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
  rejected: "Declined by Store",
  cancelled: "Cancelled",
};

export const PAYMENT_LABEL = {
  mobile_money: "Mobile Money",
  cash_on_delivery: "Cash on Delivery",
  card: "Card",
} as const;

export const MOBILE_MONEY_PROVIDERS = ["EcoCash", "M-Pesa", "Other mobile money"];
