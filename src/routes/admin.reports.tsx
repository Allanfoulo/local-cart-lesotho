import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ReportsPage } from "@/components/admin/OrderManagement";
export const Route = createFileRoute("/admin/reports")({ component: Page });
function Page() {
  return (
    <AdminLayout>
      <ReportsPage />
    </AdminLayout>
  );
}
