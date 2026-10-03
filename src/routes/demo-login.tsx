import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, ClipboardList, Package, ShieldCheck, ShoppingBag, Truck } from "lucide-react";

const roleViews = [
  {
    title: "Manager",
    description: "Store overview, orders, customers, reports, and settings.",
    to: "/admin",
    icon: ShieldCheck,
    tone: "bg-emerald-100 text-emerald-900",
  },
  {
    title: "Orders and dispatch",
    description: "Assign deliveries and organize the team’s manual stop order.",
    to: "/staff/dispatch",
    icon: ClipboardList,
    tone: "bg-amber-100 text-amber-900",
  },
  {
    title: "Stock and promotions",
    description: "Update products, inventory, categories, and offers.",
    to: "/staff/catalogue",
    icon: Package,
    tone: "bg-lime-100 text-lime-900",
  },
  {
    title: "Driver",
    description: "View assigned deliveries and update each stop on a phone.",
    to: "/driver",
    icon: Truck,
    tone: "bg-sky-100 text-sky-900",
  },
  {
    title: "Customer",
    description: "Browse groceries, check orders, and manage account details.",
    to: "/account",
    icon: ShoppingBag,
    tone: "bg-orange-100 text-orange-900",
  },
] as const;

export const Route = createFileRoute("/demo-login")({
  head: () => ({
    meta: [
      { title: "Mabote Fresh | Choose a demo view" },
      { name: "description", content: "Choose a Mabote Fresh role view to preview the demo." },
    ],
  }),
  component: DemoRoleSelector,
});

function DemoRoleSelector() {
  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:py-14">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <Link to="/" className="text-sm font-bold tracking-wide text-primary">
            MABOTE FRESH
          </Link>
          <Link to="/" className="text-sm font-medium text-muted-foreground hover:text-primary">
            Return to shop
          </Link>
        </header>
        <section className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">
            Demo workspace
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Choose a view to preview
          </h1>
          <p className="mt-3 max-w-xl text-muted-foreground">
            Each option opens a role-focused part of the prototype. Your changes stay in this
            browser.
          </p>
          <p className="mt-5 rounded-xl border bg-card px-4 py-3 text-sm text-muted-foreground">
            Demo role selection only. This does not sign in or restrict access to any page.
          </p>
        </section>
        <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {roleViews.map(({ title, description, to, icon: Icon, tone }) => (
            <Link
              key={title}
              to={to}
              className="group flex min-h-48 flex-col rounded-2xl border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className={`grid size-11 place-items-center rounded-xl ${tone}`}>
                <Icon className="size-5" />
              </span>
              <span className="mt-4 text-lg font-semibold">{title}</span>
              <span className="mt-1 flex-1 text-sm leading-6 text-muted-foreground">
                {description}
              </span>
              <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                Open view
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
