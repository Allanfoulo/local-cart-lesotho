import { createFileRoute } from "@tanstack/react-router";
import { StoreLayout } from "@/components/shop/StoreLayout";
import { TrackingPage } from "@/components/shop/AccountPages";
export const Route = createFileRoute("/orders/$id")({ component: Page });
function Page() {
  const { id } = Route.useParams();
  return (
    <StoreLayout>
      <TrackingPage id={id} />
    </StoreLayout>
  );
}
