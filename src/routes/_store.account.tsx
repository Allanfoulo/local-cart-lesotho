import { createFileRoute } from "@tanstack/react-router";
import { CustomerAccount } from "@/components/shop/CustomerAccount";

export const Route = createFileRoute("/_store/account")({
  head: () => ({ meta: [{ title: "Mabote Fresh | Your account" }, { name: "description", content: "Manage your Mabote Fresh details and saved groceries." }] }),
  component: () => <CustomerAccount />,
});
