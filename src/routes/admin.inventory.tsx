import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { InventoryPage } from "@/components/admin/CatalogueManagement";
export const Route = createFileRoute("/admin/inventory")({ component: Page });
function Page() {
  return (
    <AdminLayout>
      <InventoryPage />
    </AdminLayout>
  );
}
