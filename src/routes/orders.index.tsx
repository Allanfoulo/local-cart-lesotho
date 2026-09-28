import { createFileRoute } from "@tanstack/react-router";
import { StoreLayout } from "@/components/shop/StoreLayout";
import { OrdersPage } from "@/components/shop/AccountPages";
export const Route = createFileRoute("/orders/")({ component: Page });
function Page() {
  return (
    <StoreLayout>
      <OrdersPage />
    </StoreLayout>
  );
}
