import { createFileRoute } from "@tanstack/react-router";
import { PublicAuthPage } from "@/components/auth/PublicAuthPage";

export const Route = createFileRoute("/staff/accept-invite")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search["token"] === "string" ? search["token"] : "",
  }),
  head: () => ({ meta: [{ title: "REETAPELE | Accept store invitation" }, { name: "description", content: "Accept your invitation to join a REETAPELE store team." }] }),
  component: () => {
    const { token } = Route.useSearch();
    return <PublicAuthPage inviteToken={token || undefined} />;
  },
});
