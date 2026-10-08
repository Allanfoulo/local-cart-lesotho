import { useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { DispatchOrdersQueue } from "@/components/admin/orders/DispatchOrdersQueue";
import { DispatchBoard } from "@/components/admin/orders/DispatchBoard";

export const Route = createFileRoute("/staff/dispatch")({
  head: () => ({
    meta: [
      { title: "REETAPELE | Dispatch" },
      { name: "description", content: "Organize assigned delivery stops for the dispatch team." },
    ],
  }),
  component: DispatchWorkspace,
});

function DispatchWorkspace() {
  const [section, setSection] = useState<"orders" | "stops">("orders");
  return (
    <main className="min-h-screen bg-background px-3 py-4 sm:px-5 sm:py-7">
      <div className="mx-auto max-w-5xl">
        <Link
          to="/demo-login"
          className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-lg pr-3 text-sm font-medium text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="size-4" />
          Demo views
        </Link>
        <header className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            REETAPELE · Dispatch
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            Plan the next stops
          </h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Prepare orders, assign drivers, and arrange delivery stops from your phone.
          </p>
        </header>
        <nav className="mb-5 grid grid-cols-2 gap-2" aria-label="Dispatch sections">
          {(["orders", "stops"] as const).map((key) => (
            <button
              key={key}
              type="button"
              aria-current={section === key ? "page" : undefined}
              onClick={() => setSection(key)}
              className={`min-h-12 rounded-xl px-3 text-sm font-semibold ${section === key ? "bg-primary text-primary-foreground" : "border bg-card text-muted-foreground hover:text-foreground"}`}
            >
              {key === "orders" ? "Orders to prepare" : "Driver stops"}
            </button>
          ))}
        </nav>
        {section === "orders" ? <DispatchOrdersQueue /> : <DispatchBoard />}
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Demo dispatch view · Changes are saved in this browser.
        </p>
      </div>
    </main>
  );
}
