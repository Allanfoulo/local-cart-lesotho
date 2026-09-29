import { Link, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Mabote Fresh — Staff" }, { name: "description", content: "Staff area." }, { property: "og:title", content: "Mabote Fresh — Staff" }, { property: "og:description", content: "Staff area." }] }),
  component: () => (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="text-2xl font-bold">Staff area</h1>
      <p className="mt-2 text-muted-foreground">The shop management screens are coming soon.</p>
      <Link to="/" className="mt-4 inline-block font-semibold text-primary">Back to shop</Link>
    </div>
  ),
});
