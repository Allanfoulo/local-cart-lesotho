import { createFileRoute } from "@tanstack/react-router";
import { StoreLayout } from "@/components/shop/StoreLayout";
import { CheckoutPage } from "@/components/shop/CheckoutPages";
export const Route = createFileRoute("/checkout")({ component: Page });
function Page() {
  return (
    <StoreLayout>
      <CheckoutPage />
    </StoreLayout>
  );
}
