import type { CartItem, Product, Promotion, Shop, Payment, OrderStatus } from "./types";

export const money = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
export const activePromotion = (p: Promotion, now = Date.now()) =>
  p.active && new Date(p.startDate).getTime() <= now && new Date(p.endDate).getTime() >= now;
export function productPrice(product: Product, promotions: Promotion[] = []) {
  const prices = [product.promoPrice ?? product.price];
  for (const p of promotions.filter(activePromotionSafe)) {
    if (p.type === "product_price" && p.productId === product.id) prices.push(p.value);
  }
  return money(Math.max(0, Math.min(...prices)));
}
const activePromotionSafe = (p: Promotion) => activePromotion(p);
export function cartDiscount(
  cart: CartItem[],
  products: Product[],
  promotions: Promotion[],
  code = "",
) {
  const subtotal = money(cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0));
  // The best qualifying order offer applies; product special prices are already included.
  return money(
    Math.min(
      subtotal,
      Math.max(
        0,
        ...promotions.filter(activePromotionSafe).map((p) => {
          if (subtotal < (p.minimumSpend ?? 0) || p.type === "product_price") return 0;
          if (p.type === "coupon" && (!code || p.code?.toUpperCase() !== code.trim().toUpperCase()))
            return 0;
          const eligible = cart.reduce(
            (s, i) =>
              s +
              (!p.categoryId ||
              products.find((pr) => pr.id === i.productId)?.categoryId === p.categoryId
                ? i.quantity * i.unitPrice
                : 0),
            0,
          );
          return p.type === "fixed" ? Math.min(eligible, p.value) : (eligible * p.value) / 100;
        }),
      ),
    ),
  );
}
export function validateQuantity(product: Product, quantity: number) {
  if (
    !Number.isFinite(quantity) ||
    quantity <= 0 ||
    (!product.soldByWeight && !Number.isInteger(quantity))
  )
    throw new Error("Choose a valid quantity.");
  if (!product.available || quantity > product.stock)
    throw new Error(
      `${product.name}: only ${product.available ? product.stock : 0} ${product.unit} available.`,
    );
}
export function validateCheckout(
  cart: CartItem[],
  products: Product[],
  shop: Shop,
  payment: Payment,
  discount = 0,
) {
  if (!cart.length) throw new Error("Your basket is empty.");
  for (const item of cart) {
    const product = products.find((p) => p.id === item.productId);
    if (!product) throw new Error(`${item.name} is no longer available.`);
    validateQuantity(product, item.quantity);
  }
  const subtotal = money(cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0));
  if (subtotal < shop.minimumOrder)
    throw new Error(`The minimum order is M${shop.minimumOrder.toFixed(2)} before delivery.`);
  const total = money(subtotal + shop.deliveryFee - discount);
  if (
    payment.method === "card" ||
    (payment.method === "cash_on_delivery" && !shop.paymentOptions.cashOnDelivery) ||
    (payment.method === "mobile_money" && !shop.paymentOptions.mobileMoney)
  )
    throw new Error("Choose an available payment method.");
  if (payment.method === "mobile_money" && !payment.provider)
    throw new Error("Choose your mobile-money provider.");
  if (
    payment.method === "cash_on_delivery" &&
    !payment.exactAmount &&
    (!Number.isFinite(payment.cashGiven) || (payment.cashGiven ?? 0) < total)
  )
    throw new Error("Cash must cover the order total.");
  return { subtotal, total };
}
export const FLOW: OrderStatus[] = [
  "received",
  "confirmed",
  "preparing",
  "ready",
  "out_for_delivery",
  "delivered",
];
export function canTransition(from: OrderStatus, to: OrderStatus) {
  return (
    from !== "cancelled" &&
    from !== "delivered" &&
    (to === "cancelled" || FLOW[FLOW.indexOf(from) + 1] === to)
  );
}
