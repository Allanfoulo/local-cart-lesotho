export interface PricedOrderLine {
  unitPrice: number;
  quantity: number;
  soldByWeight: boolean;
  availableStock: number;
}

export function roundLslAmount(amount: number): number {
  if (!Number.isFinite(amount) || amount < 0)
    throw new Error("Amount must be a finite, non-negative number.");
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export function validateOrderQuantity(
  quantity: number,
  soldByWeight: boolean,
  availableStock: number,
): void {
  if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 100)
    throw new Error("Quantity must be greater than zero and at most 100.");
  if (!soldByWeight && !Number.isInteger(quantity))
    throw new Error("This product must be ordered in whole units.");
  if (quantity > availableStock) throw new Error("There is not enough stock for this quantity.");
}

export function priceOrderLine(line: PricedOrderLine): number {
  validateOrderQuantity(line.quantity, line.soldByWeight, line.availableStock);
  if (!Number.isFinite(line.unitPrice) || line.unitPrice <= 0)
    throw new Error("Product price must be greater than zero.");
  return roundLslAmount(line.unitPrice * line.quantity);
}

export function calculateOrderTotal(
  subtotal: number,
  deliveryFee: number,
  minimumOrder: number,
): number {
  if (!Number.isFinite(deliveryFee) || deliveryFee < 0)
    throw new Error("Delivery fee must be a finite, non-negative amount.");
  if (!Number.isFinite(minimumOrder) || minimumOrder < 0)
    throw new Error("Minimum order must be a finite, non-negative amount.");
  if (!Number.isFinite(subtotal) || subtotal < 0)
    throw new Error("Subtotal must be a finite, non-negative amount.");
  if (subtotal < minimumOrder) throw new Error(`The minimum order is M${minimumOrder.toFixed(2)}.`);
  return roundLslAmount(subtotal + deliveryFee);
}
