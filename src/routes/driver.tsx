import { createFileRoute } from "@tanstack/react-router";
import { DriverDashboard } from "@/components/driver/DriverDashboard";
import { RequireMembership } from "@/components/auth/RequireMembership";

export const Route = createFileRoute("/driver")({
  head: () => ({
    meta: [
      { title: "REETAPELE | Driver deliveries" },
      { name: "description", content: "Review and update assigned delivery stops." },
    ],
  }),
  component: () => <RequireMembership roles={["driver"]}><DriverDashboard /></RequireMembership>,
});
