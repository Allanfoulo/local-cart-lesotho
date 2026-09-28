import { createFileRoute } from "@tanstack/react-router";
import { OperationsLayout } from "@/components/operations/OperationsLayout";
import { InventoryOperationsPage } from "@/components/operations/OperationsPages";
export const Route = createFileRoute("/operations/inventory")({ component: Page });
function Page() {
  return (
    <OperationsLayout>
      <InventoryOperationsPage />
    </OperationsLayout>
  );
}
