import { createFileRoute } from "@tanstack/react-router";
import { CheckoutWizard } from "@/components/shop/CheckoutWizard";

export const Route = createFileRoute("/_store/checkout")({
  head: () => ({ meta: [{ title: "Mabote Fresh | Checkout" }, { name: "description", content: "Choose your delivery details and payment option." }] }),
  component: CheckoutWizard,
});
