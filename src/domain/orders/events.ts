export interface OrderPlacedV1 {
  eventType: "OrderPlaced";
  version: 1;
  orderId: string;
  orderNumber: string;
  status: "received";
  total: number;
  occurredAt: number;
}
