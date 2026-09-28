import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ProductEditor } from "@/components/admin/CatalogueManagement";
export const Route = createFileRoute("/admin/products/new")({ component: Page });
function Page() {
  return (
    <AdminLayout>
      <ProductEditor />
    </AdminLayout>
  );
}
