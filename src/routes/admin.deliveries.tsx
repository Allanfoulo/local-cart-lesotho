import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DeliveriesPage } from "@/components/admin/OrderManagement";
export const Route = createFileRoute("/admin/deliveries")({ component: Page });
function Page() {
  return (
    <AdminLayout>
      <DeliveriesPage />
    </AdminLayout>
  );
}
