import { createFileRoute } from "@tanstack/react-router";
import { OperationsLayout } from "@/components/operations/OperationsLayout";
import { DispatchPage } from "@/components/operations/OperationsPages";
export const Route = createFileRoute("/operations/dispatch")({ component: Page });
function Page() {
  return (
    <OperationsLayout>
      <DispatchPage />
    </OperationsLayout>
  );
}
