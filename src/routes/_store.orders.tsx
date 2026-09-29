import { Link, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_store/orders")({
  head: () => ({ meta: [{ title: "Mabote Fresh — Orders" }, { name: "description", content: "Mabote Fresh orders." }, { property: "og:title", content: "Mabote Fresh — Orders" }, { property: "og:description", content: "Mabote Fresh orders." }] }),
  component: () => (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="text-2xl font-bold">Orders</h1>
      <p className="mt-2 text-muted-foreground">This page is coming soon.</p>
      <Link to="/shop" className="mt-4 inline-block font-semibold text-primary">Back to shop</Link>
    </div>
  ),
});
