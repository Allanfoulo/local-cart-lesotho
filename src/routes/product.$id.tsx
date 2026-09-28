import { createFileRoute } from "@tanstack/react-router";
import { StoreLayout } from "@/components/shop/StoreLayout";
import { ProductPage } from "@/components/shop/ShoppingPages";
export const Route = createFileRoute("/product/$id")({ component: Page });
function Page() {
  const { id } = Route.useParams();
  return (
    <StoreLayout>
      <ProductPage id={id} />
    </StoreLayout>
  );
}
