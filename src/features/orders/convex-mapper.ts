import type { Doc } from "../../../convex/_generated/dataModel";
import type { Customer, Order, OrderStatus, Payment } from "@/lib/types";

export function mapConvexOrder(order: Doc<"orders">, timeline: Doc<"orderEvents">[] = []): Order {
  return {
    id: String(order._id),
    checkoutId: order.checkoutId,
    storeId: String(order.storeId),
    storeName: order.storeName,
    number: order.orderNumber,
    customer: {
      customerId: String(order.customerId),
      name: order.customer.name,
      phone: order.customer.phone,
      ...(order.customer.email ? { email: order.customer.email } : {}),
    },
    items: order.items.map((item) => ({
      id: String(item.productId),
      productId: String(item.productId),
      storeId: String(order.storeId),
      storeName: order.storeName,
      name: item.name,
      unit: item.unit,
      unitPrice: item.unitPrice,
      emoji: item.emoji,
      quantity: item.quantity,
      soldByWeight: item.soldByWeight,
      lineTotal: item.lineTotal,
    })),
    address: {
      area: order.destination.area,
      address: order.destination.address,
      ...(order.destination.landmark ? { landmark: order.destination.landmark } : {}),
      ...(order.destination.instructions ? { instructions: order.destination.instructions } : {}),
      ...(order.destination.latitude === undefined ? {} : { lat: order.destination.latitude }),
      ...(order.destination.longitude === undefined ? {} : { lng: order.destination.longitude }),
    },
    payment: {
      method: order.payment.method,
      status: order.payment.status,
      ...(order.payment.exactAmount === undefined ? {} : { exactAmount: order.payment.exactAmount }),
    },
    subtotal: order.subtotal,
    deliveryFee: order.deliveryFee,
    discount: order.discount ?? 0,
    total: order.total,
    status: order.status,
    createdAt: new Date(order.createdAt).toISOString(),
    estimatedDelivery: new Date(order.estimatedDeliveryAt).toISOString(),
    ...(order.driverName ? { driver: order.driverName } : {}),
    ...(order.driverUserId ? { driverUserId: String(order.driverUserId) } : {}),
    ...(order.assignedStaffName ? { assignedStaff: order.assignedStaffName } : {}),
    ...(order.assignedStaffUserId ? { assignedStaffUserId: String(order.assignedStaffUserId) } : {}),
    timeline: timeline.map((event) => ({ status: event.status, at: new Date(event.occurredAt).toISOString() })),
  };
}

export function mapAssignedDelivery(order: {
  _id: string;
  storeId: string;
  storeName: string;
  orderNumber: string;
  driverUserId: string;
  driverName: string;
  customer: { name: string; phone: string };
  destination: { area: string; address: string; landmark?: string; instructions?: string };
  payment: Pick<Payment, "method" | "status">;
  total: number;
  status: OrderStatus;
  createdAt: number;
  estimatedDeliveryAt: number;
}): Order {
  return {
    id: String(order._id),
    storeId: String(order.storeId),
    storeName: order.storeName,
    number: order.orderNumber,
    customer: { name: order.customer.name, phone: order.customer.phone },
    items: [],
    address: {
      area: order.destination.area,
      address: order.destination.address,
      ...(order.destination.landmark ? { landmark: order.destination.landmark } : {}),
      ...(order.destination.instructions ? { instructions: order.destination.instructions } : {}),
    },
    payment: order.payment,
    subtotal: order.total,
    deliveryFee: 0,
    discount: 0,
    total: order.total,
    status: order.status,
    createdAt: new Date(order.createdAt).toISOString(),
    estimatedDelivery: new Date(order.estimatedDeliveryAt).toISOString(),
    driver: order.driverName,
    driverUserId: String(order.driverUserId),
    timeline: [],
  };
}

export function mapConvexCustomer(customer: Doc<"customers">): Customer {
  return {
    id: String(customer._id),
    name: customer.name,
    phone: customer.phone,
    ...(customer.email ? { email: customer.email } : {}),
    orders: customer.orderCount,
    lifetimeSpend: customer.lifetimeSpend,
    lastOrder: new Date(customer.lastOrderAt).toISOString(),
  };
}
