import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminOrdersPage } from "@/components/admin/OrderManagement";
export const Route = createFileRoute("/admin/orders/")({ component: Page });
function Page() {
  return (
    <AdminLayout>
      <AdminOrdersPage />
    </AdminLayout>
  );
}
