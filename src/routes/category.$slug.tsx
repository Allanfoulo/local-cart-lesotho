import { createFileRoute } from "@tanstack/react-router";
import { StoreLayout } from "@/components/shop/StoreLayout";
import { CataloguePage } from "@/components/shop/ShoppingPages";
export const Route = createFileRoute("/category/$slug")({ component: Page });
function Page() {
  const { slug } = Route.useParams();
  return (
    <StoreLayout>
      <CataloguePage slug={slug} />
    </StoreLayout>
  );
}
