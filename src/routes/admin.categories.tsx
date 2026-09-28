import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { CategoriesAdminPage } from "@/components/admin/CatalogueManagement";
export const Route = createFileRoute("/admin/categories")({ component: Page });
function Page() {
  return (
    <AdminLayout>
      <CategoriesAdminPage />
    </AdminLayout>
  );
}
