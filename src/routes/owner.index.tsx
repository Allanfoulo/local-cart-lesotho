import { createFileRoute } from "@tanstack/react-router";
import { OperationsLayout } from "@/components/operations/OperationsLayout";
import { OwnerPage } from "@/components/operations/OperationsPages";
export const Route = createFileRoute("/owner/")({ component: Page });
function Page() {
  return (
    <OperationsLayout>
      <OwnerPage />
    </OperationsLayout>
  );
}
