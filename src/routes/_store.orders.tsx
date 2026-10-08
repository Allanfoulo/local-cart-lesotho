import { createFileRoute } from "@tanstack/react-router";
import { CustomerAccount } from "@/components/shop/CustomerAccount";

export const Route = createFileRoute("/_store/orders")({
  head: () => ({ meta: [{ title: "REETAPELE | Your orders" }, { name: "description", content: "See your order status and order your favourites again." }] }),
  component: () => <CustomerAccount initialSection="orders" />,
});
