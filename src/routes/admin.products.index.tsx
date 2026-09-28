import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ProductsPage } from "@/components/admin/CatalogueManagement";
export const Route = createFileRoute("/admin/products/")({ component: Page });
function Page() {
  return (
    <AdminLayout>
      <ProductsPage />
    </AdminLayout>
  );
}
