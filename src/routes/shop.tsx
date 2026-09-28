import { createFileRoute } from "@tanstack/react-router";
import { StoreLayout } from "@/components/shop/StoreLayout";
import { CataloguePage } from "@/components/shop/ShoppingPages";
export const Route = createFileRoute("/shop")({
  component: Page,
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search["q"] === "string" ? search["q"] : "",
  }),
});
function Page() {
  return (
    <StoreLayout>
      <CataloguePage />
    </StoreLayout>
  );
}
