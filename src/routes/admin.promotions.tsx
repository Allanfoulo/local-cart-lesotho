import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { PromotionsPage } from "@/components/admin/CatalogueManagement";
export const Route = createFileRoute("/admin/promotions")({ component: Page });
function Page() {
  return (
    <AdminLayout>
      <PromotionsPage />
    </AdminLayout>
  );
}
