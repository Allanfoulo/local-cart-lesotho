import { createFileRoute } from "@tanstack/react-router";
import { DriverLayout } from "@/components/driver/DriverLayout";
import { DriverDashboardPage } from "@/components/driver/DriverPages";

export const Route = createFileRoute("/driver/")({ component: Page });

function Page() {
  return (
    <DriverLayout>
      <DriverDashboardPage />
    </DriverLayout>
  );
}
