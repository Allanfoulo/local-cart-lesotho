import { createFileRoute } from "@tanstack/react-router";
import { DriverDashboard } from "@/components/driver/DriverDashboard";

export const Route = createFileRoute("/driver")({
  head: () => ({
    meta: [
      { title: "REETAPELE | Driver deliveries" },
      { name: "description", content: "Review and update assigned delivery stops." },
    ],
  }),
  component: DriverDashboard,
});
