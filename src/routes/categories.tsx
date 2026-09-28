import { createFileRoute } from "@tanstack/react-router";
import { StoreLayout } from "@/components/shop/StoreLayout";
import { CategoriesPage } from "@/components/shop/ShoppingPages";
export const Route = createFileRoute("/categories")({ component: Page });
function Page() {
  return (
    <StoreLayout>
      <CategoriesPage />
    </StoreLayout>
  );
}
