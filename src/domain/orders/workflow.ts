import type { OrderStatus } from "../../lib/types";

export type OrderWorkflowRole =
  | "store_owner"
  | "store_manager"
  | "order_staff"
  | "dispatcher"
  | "driver";

const transitions: Record<OrderWorkflowRole, Partial<Record<OrderStatus, readonly OrderStatus[]>>> = {
  store_owner: {
    received: ["confirmed", "rejected", "cancelled"],
    confirmed: ["preparing", "cancelled"],
    preparing: ["ready", "cancelled"],
    ready: ["out_for_delivery", "cancelled"],
  },
  store_manager: {
    received: ["confirmed", "rejected", "cancelled"],
    confirmed: ["preparing", "cancelled"],
    preparing: ["ready", "cancelled"],
    ready: ["out_for_delivery", "cancelled"],
  },
  order_staff: {
    received: ["confirmed"],
    confirmed: ["preparing"],
    preparing: ["ready"],
  },
  dispatcher: { ready: ["out_for_delivery"] },
  driver: {
    ready: ["out_for_delivery"],
    out_for_delivery: ["delivered"],
  },
};

export function canTransitionOrder(
  role: OrderWorkflowRole,
  current: OrderStatus,
  next: OrderStatus,
) {
  return transitions[role][current]?.includes(next) ?? false;
}

export function nextOrderStatus(role: OrderWorkflowRole, current: OrderStatus): OrderStatus {
  return transitions[role][current]?.find((status) =>
    ["confirmed", "preparing", "ready", "out_for_delivery", "delivered"].includes(status),
  ) ?? current;
}

export function canAssignPreparation(role: OrderWorkflowRole) {
  return role === "store_owner" || role === "store_manager";
}
