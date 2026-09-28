import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ProductEditor } from "@/components/admin/CatalogueManagement";
export const Route = createFileRoute("/admin/products/$id")({ component: Page });
function Page() {
  const { id } = Route.useParams();
  return (
    <AdminLayout>
      <ProductEditor id={id} />
    </AdminLayout>
  );
}
