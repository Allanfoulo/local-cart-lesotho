import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { SettingsPage } from "@/components/admin/CatalogueManagement";
export const Route = createFileRoute("/admin/settings")({ component: Page });
function Page() {
  return (
    <AdminLayout>
      <SettingsPage />
    </AdminLayout>
  );
}
