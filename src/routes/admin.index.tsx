import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DashboardPage } from "@/components/admin/OrderManagement";
export const Route = createFileRoute("/admin/")({ component: Page });
function Page() {
  return (
    <AdminLayout>
      <DashboardPage />
    </AdminLayout>
  );
}
