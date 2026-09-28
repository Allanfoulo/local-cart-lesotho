import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { CustomersPage } from "@/components/admin/OrderManagement";
export const Route = createFileRoute("/admin/customers")({ component: Page });
function Page() {
  return (
    <AdminLayout>
      <CustomersPage />
    </AdminLayout>
  );
}
