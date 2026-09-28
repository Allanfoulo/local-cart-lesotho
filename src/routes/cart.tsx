import { createFileRoute } from "@tanstack/react-router";
import { StoreLayout } from "@/components/shop/StoreLayout";
import { CartPage } from "@/components/shop/CheckoutPages";
export const Route = createFileRoute("/cart")({ component: Page });
function Page() {
  return (
    <StoreLayout>
      <CartPage />
    </StoreLayout>
  );
}
