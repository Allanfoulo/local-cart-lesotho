import { createFileRoute } from "@tanstack/react-router";
import { OperationsLayout } from "@/components/operations/OperationsLayout";
import { PickingPage } from "@/components/operations/OperationsPages";
export const Route = createFileRoute("/operations/picking")({ component: Page });
function Page() {
  return (
    <OperationsLayout>
      <PickingPage />
    </OperationsLayout>
  );
}
