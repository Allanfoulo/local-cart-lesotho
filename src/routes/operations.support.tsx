import { createFileRoute } from "@tanstack/react-router";
import { OperationsLayout } from "@/components/operations/OperationsLayout";
import { SupportPage } from "@/components/operations/OperationsPages";
export const Route = createFileRoute("/operations/support")({ component: Page });
function Page() {
  return (
    <OperationsLayout>
      <SupportPage />
    </OperationsLayout>
  );
}
