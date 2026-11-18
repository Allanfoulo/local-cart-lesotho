import { createFileRoute } from "@tanstack/react-router";
import { PublicAuthPage } from "@/components/auth/PublicAuthPage";

export const Route = createFileRoute("/sign-in")({
  validateSearch: (search: Record<string, unknown>) => ({
    returnTo: typeof search["returnTo"] === "string" ? search["returnTo"] : undefined,
    createAccount: search["createAccount"] === true,
  }),
  head: () => ({
    meta: [
      { title: "REETAPELE | Sign in" },
      { name: "description", content: "Sign in or create your REETAPELE customer account." },
    ],
  }),
  component: SignInPage,
});

function SignInPage() {
  const { returnTo, createAccount } = Route.useSearch();
  return <PublicAuthPage returnTo={returnTo} createAccount={createAccount} />;
}
