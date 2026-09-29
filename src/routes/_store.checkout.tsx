import { Link, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_store/checkout")({
  head: () => ({ meta: [{ title: "Mabote Fresh — Checkout" }, { name: "description", content: "Mabote Fresh checkout." }, { property: "og:title", content: "Mabote Fresh — Checkout" }, { property: "og:description", content: "Mabote Fresh checkout." }] }),
  component: () => (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="text-2xl font-bold">Checkout</h1>
      <p className="mt-2 text-muted-foreground">This page is coming soon.</p>
      <Link to="/shop" className="mt-4 inline-block font-semibold text-primary">Back to shop</Link>
    </div>
  ),
});
