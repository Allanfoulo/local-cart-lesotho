import { createFileRoute } from "@tanstack/react-router";
import { StoreLayout } from "@/components/shop/StoreLayout";
import { AccountPage } from "@/components/shop/AccountPages";
export const Route = createFileRoute("/account")({ component: Page });
function Page() {
  return (
    <StoreLayout>
      <AccountPage />
    </StoreLayout>
  );
}
