import { createFileRoute } from "@tanstack/react-router";
import { PublicAuthPage } from "@/components/auth/PublicAuthPage";

export const Route = createFileRoute("/sign-in")({
  head: () => ({ meta: [{ title: "REETAPELE | Sign in" }, { name: "description", content: "Sign in or create your REETAPELE customer account." }] }),
  component: () => <PublicAuthPage />,
});
