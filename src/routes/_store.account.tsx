import { createFileRoute } from "@tanstack/react-router";
import { CustomerAccount } from "@/components/shop/CustomerAccount";

export const Route = createFileRoute("/_store/account")({
  head: () => ({ meta: [{ title: "REETAPELE | Your account" }, { name: "description", content: "Manage your REETAPELE details and saved groceries." }] }),
  component: () => <CustomerAccount />,
});
