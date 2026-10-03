import { createFileRoute } from "@tanstack/react-router";
import { StaffWorkspace } from "@/components/admin/StaffWorkspace";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Mabote Fresh | Staff workspace" },
      {
        name: "description",
        content:
          "Manage local store orders, customers, reports, stock, promotions, and delivery places.",
      },
    ],
  }),
  component: StaffWorkspace,
});
