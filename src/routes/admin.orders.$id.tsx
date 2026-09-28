import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminOrderPage } from "@/components/admin/OrderManagement";
export const Route = createFileRoute("/admin/orders/$id")({ component: Page });
function Page() {
  const { id } = Route.useParams();
  return (
    <AdminLayout>
      <AdminOrderPage id={id} />
    </AdminLayout>
  );
}
