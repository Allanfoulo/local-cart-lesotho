import type {
  Category,
  Customer,
  NotificationPreference,
  Order,
  Product,
  Promotion,
  Shop,
} from "./types";

export const seedShop: Shop = {
  id: "shop_mabote_fresh",
  name: "Mabote Fresh",
  tagline: "Your Local Grocer • Maseru",
  phone: "+266 5888 1234",
  whatsapp: "+266 5888 1234",
  address: "Ha-Mabote, Maseru, Lesotho",
  openingHours: "Mon – Sat: 07:00 – 20:00 • Sun: 08:00 – 17:00",
  deliveryAreas: [
    "Ha-Mabote, Maseru",
    "Khubetsoana, Maseru",
    "Sekamaneng, Maseru",
    "Maseru West",
    "Lithabaneng, Maseru",
    "Ha-Tsolo, Maseru",
  ],
  defaultDeliveryArea: "Ha-Mabote, Maseru",
  deliveryFee: 20,
  minimumOrder: 50,
  currency: "LSL",
  currencySymbol: "M",
  paymentOptions: { mobileMoney: true, cashOnDelivery: true, card: false },
};

export const seedCategories: Category[] = [
  { id: "cat_produce", slug: "fresh-produce", name: "Fresh Produce", emoji: "🥬", accent: "leaf", enabled: true, order: 1 },
  { id: "cat_groceries", slug: "groceries", name: "Groceries", emoji: "🛒", accent: "wheat", enabled: true, order: 2 },
  { id: "cat_drinks", slug: "drinks", name: "Drinks", emoji: "🥤", accent: "sky", enabled: true, order: 3 },
  { id: "cat_snacks", slug: "snacks", name: "Snacks", emoji: "🍿", accent: "sun", enabled: true, order: 4 },
  { id: "cat_household", slug: "household", name: "Household", emoji: "🧻", accent: "clay", enabled: true, order: 5 },
  { id: "cat_personal", slug: "personal-care", name: "Personal Care", emoji: "🧼", accent: "rose", enabled: true, order: 6 },
  { id: "cat_bakery", slug: "bread-bakery", name: "Bread & Bakery", emoji: "🍞", accent: "wheat", enabled: true, order: 7 },
  { id: "cat_specials", slug: "specials", name: "Specials", emoji: "🏷️", accent: "leaf", enabled: true, order: 8 },
];

let n = 0;
const daysAgo = (d: number) => new Date(Date.now() - d * 86400000).toISOString();

function p(
  name: string,
  categoryId: string,
  price: number,
  unit: Product["unit"],
  emoji: string,
  extra: Partial<Product> = {},
): Product {
  n += 1;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return {
    id: `prd_${n}`,
    slug,
    name,
    description: `${name} from Mabote Fresh. Locally sourced where possible and checked by our team before it reaches your door.`,
    categoryId,
    price,
    unit,
    soldByWeight: unit === "kg",
    weightOptions: unit === "kg" ? [0.5, 1, 1.5, 2] : undefined,
    stock: 40,
    lowStockThreshold: 10,
    available: true,
    popularity: 50 - n,
    createdAt: daysAgo(n),
    emoji,
    ...extra,
  };
}

export const seedProducts: Product[] = [
  // Fresh produce
  p("Tomatoes", "cat_produce", 12, "kg", "🍅", {
    description:
      "Fresh, locally sourced tomatoes. Great for cooking, salads and everyday meals.",
    popularity: 100,
    stock: 50,
  }),
  p("Potatoes", "cat_produce", 18, "kg", "🥔", { popularity: 96, stock: 80 }),
  p("Onions", "cat_produce", 14, "kg", "🧅", { popularity: 88, stock: 60 }),
  p("Carrots", "cat_produce", 16, "kg", "🥕", { popularity: 74, stock: 35 }),
  p("Green Peppers", "cat_produce", 5, "each", "🫑", { popularity: 70, stock: 45 }),
  p("Cabbage", "cat_produce", 15, "each", "🥬", { popularity: 68, stock: 28 }),
  p("Spinach Bunch", "cat_produce", 10, "each", "🥬", { popularity: 62, stock: 22 }),
  p("Butternut", "cat_produce", 20, "kg", "🎃", { popularity: 48, stock: 18 }),
  p("Bananas", "cat_produce", 22, "kg", "🍌", { popularity: 80, stock: 30 }),
  p("Apples", "cat_produce", 26, "kg", "🍎", { popularity: 76, stock: 26 }),
  p("Oranges", "cat_produce", 24, "kg", "🍊", { popularity: 60, stock: 24 }),

  // Groceries
  p("Maize Meal 10kg", "cat_groceries", 95, "each", "🌾", { popularity: 98, stock: 40 }),
  p("Cooking Oil 2L", "cat_groceries", 55, "each", "🫗", {
    popularity: 92,
    stock: 8,
    promoPrice: 49,
  }),
  p("Rice 2kg", "cat_groceries", 48, "pack", "🍚", { popularity: 84, stock: 30 }),
  p("Sugar 2.5kg", "cat_groceries", 52, "pack", "🧂", { popularity: 82, stock: 25 }),
  p("Salt 1kg", "cat_groceries", 12, "pack", "🧂", { popularity: 50, stock: 40 }),
  p("Eggs 30 Pack", "cat_groceries", 85, "pack", "🥚", { popularity: 90, stock: 20 }),
  p("2L Milk", "cat_groceries", 32, "litre", "🥛", { popularity: 94, stock: 15 }),
  p("Beans 1kg", "cat_groceries", 34, "pack", "🫘", { popularity: 58, stock: 22 }),
  p("Peanut Butter 400g", "cat_groceries", 38, "each", "🥜", { popularity: 54, stock: 19 }),
  p("Tea Bags 100s", "cat_groceries", 42, "pack", "🍵", { popularity: 66, stock: 27 }),
  p("Coffee 250g", "cat_groceries", 58, "each", "☕", { popularity: 46, stock: 14 }),
  p("Macaroni 500g", "cat_groceries", 18, "pack", "🍝", { popularity: 52, stock: 33 }),

  // Bakery
  p("Brown Bread", "cat_bakery", 15, "each", "🍞", { popularity: 99, stock: 34 }),
  p("White Bread", "cat_bakery", 16, "each", "🍞", { popularity: 93, stock: 30 }),
  p("Fat Cakes 6 Pack", "cat_bakery", 18, "pack", "🥯", { popularity: 72, stock: 16 }),
  p("Scones 4 Pack", "cat_bakery", 22, "pack", "🧁", { popularity: 44, stock: 12 }),

  // Drinks
  p("Soft Drink 2L", "cat_drinks", 22, "litre", "🥤", { popularity: 91, stock: 44 }),
  p("Soft Drink Crate", "cat_drinks", 75, "crate", "🧃", {
    popularity: 64,
    stock: 9,
    promoPrice: 69,
  }),
  p("Still Water 5L", "cat_drinks", 28, "each", "💧", { popularity: 56, stock: 30 }),
  p("Fruit Juice 1L", "cat_drinks", 26, "litre", "🧃", { popularity: 60, stock: 26 }),
  p("Maheu 500ml", "cat_drinks", 12, "each", "🥛", { popularity: 78, stock: 48 }),

  // Snacks
  p("Potato Chips 125g", "cat_snacks", 14, "pack", "🥔", { popularity: 75, stock: 55 }),
  p("Biscuits Assorted", "cat_snacks", 20, "pack", "🍪", { popularity: 68, stock: 38 }),
  p("Sweets Jar", "cat_snacks", 30, "each", "🍬", { popularity: 40, stock: 18 }),
  p("Popcorn 200g", "cat_snacks", 16, "pack", "🍿", { popularity: 42, stock: 24 }),

  // Household
  p("2-Ply Tissue", "cat_household", 8, "each", "🧻", { popularity: 97, stock: 70 }),
  p("Tissue 9 Pack", "cat_household", 65, "pack", "🧻", { popularity: 70, stock: 18 }),
  p("Washing Powder 2kg", "cat_household", 60, "pack", "🧴", {
    popularity: 74,
    stock: 6,
    promoPrice: 52,
  }),
  p("Dishwashing Liquid 750ml", "cat_household", 32, "each", "🧽", { popularity: 58, stock: 21 }),
  p("Bleach 750ml", "cat_household", 24, "each", "🧪", { popularity: 44, stock: 20 }),
  p("Matches 10 Pack", "cat_household", 10, "pack", "🔥", { popularity: 36, stock: 40 }),
  p("Candles 6 Pack", "cat_household", 26, "pack", "🕯️", { popularity: 34, stock: 0, available: false }),

  // Personal care
  p("Bath Soap 175g", "cat_personal", 14, "each", "🧼", { popularity: 66, stock: 42 }),
  p("Toothpaste 100ml", "cat_personal", 28, "each", "🪥", { popularity: 62, stock: 25 }),
  p("Roll-On Deodorant", "cat_personal", 34, "each", "💨", { popularity: 48, stock: 17 }),
  p("Petroleum Jelly 250ml", "cat_personal", 30, "each", "🫙", { popularity: 52, stock: 9 }),
  p("Sanitary Pads 10s", "cat_personal", 26, "pack", "🩹", { popularity: 55, stock: 30 }),
];

export const seedCustomers: Customer[] = [
  { id: "cus_1", name: "Thabo Molefi", phone: "+266 5888 1234", email: "thabo@gmail.com", orders: 12, lifetimeSpend: 1240, lastOrder: daysAgo(1) },
  { id: "cus_2", name: "'Mareo Letsie", phone: "+266 5777 4321", orders: 8, lifetimeSpend: 860, lastOrder: daysAgo(3) },
  { id: "cus_3", name: "Neo Ramathe", phone: "+266 5666 7890", orders: 5, lifetimeSpend: 420, lastOrder: daysAgo(6) },
  { id: "cus_4", name: "Pulane Mokoena", phone: "+266 5898 1111", orders: 3, lifetimeSpend: 310, lastOrder: daysAgo(9) },
];

export const seedPromotions: Promotion[] = [
  { id: "promo_1", name: "10% off all vegetables", type: "percentage", value: 10, startDate: daysAgo(20), endDate: daysAgo(-10), active: true },
  { id: "promo_2", name: "M20 off orders over M300", type: "fixed", value: 20, startDate: daysAgo(15), endDate: daysAgo(-5), active: true },
  { id: "promo_3", name: "Cooking Oil 2L special price", type: "product_price", value: 49, startDate: daysAgo(8), endDate: daysAgo(-14), active: true },
  { id: "promo_4", name: "EASTER10 coupon", type: "coupon", value: 10, code: "EASTER10", startDate: daysAgo(-3), endDate: daysAgo(-30), active: false },
];

export const seedNotificationPreferences: NotificationPreference[] = [
  { id: "np_order", label: "Order updates", description: "SMS when your order status changes", enabled: true },
  { id: "np_specials", label: "Weekly specials", description: "Hear about deals every Thursday", enabled: true },
  { id: "np_restock", label: "Back in stock", description: "Tell me when a favourite returns", enabled: false },
];

function orderItem(product: Product, quantity: number) {
  const unitPrice = product.promoPrice ?? product.price;
  return {
    id: `oi_${product.id}_${quantity}`,
    productId: product.id,
    name: product.name,
    unit: product.unit,
    unitPrice,
    emoji: product.emoji,
    quantity,
    soldByWeight: product.soldByWeight,
    lineTotal: Number((unitPrice * quantity).toFixed(2)),
  };
}

function buildOrder(
  number: string,
  customer: Customer,
  items: Array<[string, number]>,
  status: Order["status"],
  hoursAgo: number,
  payment: Order["payment"],
  area: string,
): Order {
  const orderItems = items.map(([name, qty]) => {
    const product = seedProducts.find((sp) => sp.name === name)!;
    return orderItem(product, qty);
  });
  const subtotal = Number(orderItems.reduce((s, i) => s + i.lineTotal, 0).toFixed(2));
  const createdAt = new Date(Date.now() - hoursAgo * 3600000).toISOString();
  const total = Number((subtotal + seedShop.deliveryFee).toFixed(2));
  return {
    id: number.toLowerCase(),
    number,
    customer: { name: customer.name, phone: customer.phone, email: customer.email },
    items: orderItems,
    address: {
      area,
      address: `1234 ${area.split(",")[0]}`,
      landmark: "Opposite Mabote Primary School",
      instructions: "Blue gate, second house after the shop.",
    },
    payment: {
      ...payment,
      changeRequired:
        payment.cashGiven != null ? Number((payment.cashGiven - total).toFixed(2)) : undefined,
    },
    subtotal,
    deliveryFee: seedShop.deliveryFee,
    discount: 0,
    total,
    status,
    createdAt,
    estimatedDelivery: new Date(Date.now() - hoursAgo * 3600000 + 7200000).toISOString(),
    driver: status === "out_for_delivery" ? "Moshe Thabane" : undefined,
    timeline: [{ status: "created", at: createdAt }, { status, at: createdAt }],
  };
}

export const seedOrders: Order[] = [
  buildOrder(
    "#ORD-1042",
    seedCustomers[0]!,
    [["Tomatoes", 1.5], ["Brown Bread", 1], ["2L Milk", 1]],
    "preparing",
    2,
    { method: "cash_on_delivery", status: "pending", cashGiven: 100 },
    "Ha-Mabote, Maseru",
  ),
  buildOrder(
    "#ORD-1041",
    seedCustomers[1]!,
    [["Maize Meal 10kg", 1], ["Cooking Oil 2L", 1]],
    "confirmed",
    5,
    { method: "mobile_money", provider: "EcoCash", status: "paid" },
    "Khubetsoana, Maseru",
  ),
  buildOrder(
    "#ORD-1040",
    seedCustomers[2]!,
    [["Eggs 30 Pack", 1], ["Potatoes", 2], ["2-Ply Tissue", 4]],
    "ready",
    9,
    { method: "cash_on_delivery", status: "pending", exactAmount: true },
    "Sekamaneng, Maseru",
  ),
  buildOrder(
    "#ORD-1039",
    seedCustomers[3]!,
    [["Soft Drink Crate", 1], ["Potato Chips 125g", 3]],
    "out_for_delivery",
    12,
    { method: "mobile_money", provider: "M-Pesa", status: "paid" },
    "Maseru West",
  ),
  buildOrder(
    "#ORD-1038",
    seedCustomers[0]!,
    [["Brown Bread", 2], ["Bananas", 1], ["Washing Powder 2kg", 1]],
    "delivered",
    30,
    { method: "cash_on_delivery", status: "paid", cashGiven: 150 },
    "Ha-Mabote, Maseru",
  ),
  buildOrder(
    "#ORD-1037",
    seedCustomers[1]!,
    [["Rice 2kg", 1], ["Sugar 2.5kg", 1], ["Tea Bags 100s", 1]],
    "delivered",
    54,
    { method: "mobile_money", provider: "EcoCash", status: "paid" },
    "Khubetsoana, Maseru",
  ),
];
