import { test, expect } from "@playwright/test";
import {
  cartDiscount,
  productPrice,
  validateCheckout,
  validateQuantity,
  canTransition,
  money,
} from "../src/lib/commerce";
import { seedProducts, seedShop } from "../src/lib/seed";
import type { CartItem, Promotion } from "../src/lib/types";
const tomato = seedProducts.find((p) => p.name === "Tomatoes")!;
const item: CartItem = {
  id: "test",
  productId: tomato.id,
  name: tomato.name,
  unit: "kg",
  quantity: 1.5,
  unitPrice: 12,
  emoji: "",
  soldByWeight: true,
};
const offer: Promotion = {
  id: "offer",
  name: "Offer",
  type: "percentage",
  value: 10,
  active: true,
  startDate: "2020-01-01",
  endDate: "2099-01-01",
};
test("commerce: weights, cash change and rounding", () => {
  expect(money(12 * 1.5)).toBe(18);
  expect(money(0.1 + 0.2)).toBe(0.3);
  const result = validateCheckout(
    [item],
    seedProducts,
    { ...seedShop, minimumOrder: 0 },
    { method: "cash_on_delivery", status: "pending", cashGiven: 50 },
    1.8,
  );
  expect(result).toEqual({ subtotal: 18, total: 36.2 });
  expect(money(50 - result.total)).toBe(13.8);
});
test("commerce: reject invalid quantities, unavailable stock, missing items and minimum basket", () => {
  for (const value of [-1, 0, NaN, Infinity, 51])
    expect(() => validateQuantity(tomato, value)).toThrow();
  expect(() => validateQuantity({ ...tomato, soldByWeight: false }, 1.5)).toThrow();
  expect(() => validateQuantity({ ...tomato, available: false }, 1)).toThrow();
  expect(() =>
    validateCheckout([], seedProducts, seedShop, {
      method: "cash_on_delivery",
      status: "pending",
      exactAmount: true,
    }),
  ).toThrow("empty");
  expect(() =>
    validateCheckout([item], [], seedShop, {
      method: "cash_on_delivery",
      status: "pending",
      exactAmount: true,
    }),
  ).toThrow("no longer");
  expect(() =>
    validateCheckout([item], seedProducts, seedShop, {
      method: "cash_on_delivery",
      status: "pending",
      exactAmount: true,
    }),
  ).toThrow("minimum");
});
test("commerce: insufficient cash and disabled methods cannot place an order", () => {
  const shop = { ...seedShop, minimumOrder: 0 };
  expect(() =>
    validateCheckout([item], seedProducts, shop, {
      method: "cash_on_delivery",
      status: "pending",
      cashGiven: 10,
    }),
  ).toThrow("Cash");
  expect(() =>
    validateCheckout([item], seedProducts, shop, { method: "card", status: "pending" }),
  ).toThrow("available payment");
  expect(() =>
    validateCheckout([item], seedProducts, shop, { method: "mobile_money", status: "pending" }),
  ).toThrow("provider");
  expect(() =>
    validateCheckout(
      [item],
      seedProducts,
      { ...shop, paymentOptions: { ...shop.paymentOptions, cashOnDelivery: false } },
      { method: "cash_on_delivery", status: "pending", exactAmount: true },
    ),
  ).toThrow();
});
test("commerce: active dates, coupon minimums, category scope and best offer", () => {
  expect(cartDiscount([item], seedProducts, [{ ...offer, categoryId: "cat_produce" }])).toBe(1.8);
  expect(cartDiscount([item], seedProducts, [{ ...offer, categoryId: "cat_drinks" }])).toBe(0);
  expect(cartDiscount([item], seedProducts, [{ ...offer, active: false }])).toBe(0);
  expect(cartDiscount([item], seedProducts, [{ ...offer, endDate: "2021-01-01" }])).toBe(0);
  expect(
    cartDiscount(
      [item],
      seedProducts,
      [{ ...offer, type: "coupon", code: "SAVE", minimumSpend: 20 }],
      "save",
    ),
  ).toBe(0);
  expect(cartDiscount([item], seedProducts, [offer, { ...offer, type: "fixed", value: 5 }])).toBe(
    5,
  );
  expect(cartDiscount([item], seedProducts, [{ ...offer, type: "fixed", value: 100 }])).toBe(18);
  expect(
    cartDiscount([item], seedProducts, [{ ...offer, type: "coupon", code: "SAVE" }], "save"),
  ).toBe(1.8);
});
test("commerce: special prices and one-way fulfilment", () => {
  expect(
    productPrice(tomato, [{ ...offer, type: "product_price", productId: tomato.id, value: 9 }]),
  ).toBe(9);
  expect(canTransition("received", "confirmed")).toBe(true);
  expect(canTransition("received", "delivered")).toBe(false);
  expect(canTransition("preparing", "cancelled")).toBe(true);
  expect(canTransition("cancelled", "cancelled")).toBe(false);
  expect(canTransition("delivered", "preparing")).toBe(false);
});
