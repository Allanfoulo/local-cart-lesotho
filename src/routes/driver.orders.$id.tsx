import { createFileRoute } from "@tanstack/react-router";
import { DriverLayout } from "@/components/driver/DriverLayout";
import { DriverOrderPage } from "@/components/driver/DriverPages";

export const Route = createFileRoute("/driver/orders/$id")({ component: Page });

function Page() {
  return (
    <DriverLayout>
      <DriverOrderPage />
    </DriverLayout>
  );
}
