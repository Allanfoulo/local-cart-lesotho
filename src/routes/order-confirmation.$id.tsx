import { createFileRoute } from "@tanstack/react-router";
import { StoreLayout } from "@/components/shop/StoreLayout";
import { ConfirmationPage } from "@/components/shop/AccountPages";
export const Route = createFileRoute("/order-confirmation/$id")({ component: Page });
function Page() {
  const { id } = Route.useParams();
  return (
    <StoreLayout>
      <ConfirmationPage id={id} />
    </StoreLayout>
  );
}
