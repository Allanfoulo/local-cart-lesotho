import { Link, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_store/account")({
  head: () => ({ meta: [{ title: "Mabote Fresh — Account" }, { name: "description", content: "Mabote Fresh account." }, { property: "og:title", content: "Mabote Fresh — Account" }, { property: "og:description", content: "Mabote Fresh account." }] }),
  component: () => (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="text-2xl font-bold">Account</h1>
      <p className="mt-2 text-muted-foreground">This page is coming soon.</p>
      <Link to="/shop" className="mt-4 inline-block font-semibold text-primary">Back to shop</Link>
    </div>
  ),
});
