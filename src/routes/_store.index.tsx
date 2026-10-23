import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Clock, Truck, Wallet } from "lucide-react";

import { ProductCard } from "@/components/store/ProductCard";
import { Button } from "@/components/ui/button";
import { filterProducts, useAppStore } from "@/lib/app-store";
import { formatMShort } from "@/lib/format";

export const Route = createFileRoute("/_store/")({
  head: () => ({
    meta: [
      { title: "REETAPELE — Fresh groceries delivered in Maseru" },
      {
        name: "description",
        content:
          "Shop fresh produce, bread, drinks and household essentials from local stores. Choose cash at delivery or arrange mobile money directly with the store.",
      },
      { property: "og:title", content: "REETAPELE — Fresh groceries delivered in Maseru" },
      {
        property: "og:description",
        content: "Your local grocer, online. Same-day delivery across Maseru.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { shop, stores, categories, products } = useAppStore();
  const popular = filterProducts(products, { sort: "popular" }).slice(0, 8);
  const specials = products.filter((p) => p.promoPrice).slice(0, 4);
  const uniqueCategories = [
    ...new Map(
      categories
        .filter((category) => category.enabled)
        .map((category) => [category.slug, category]),
    ).values(),
  ];

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl bg-primary-soft">
        <div className="grid items-center md:grid-cols-2">
          <div className="p-6 md:p-10">
            <p className="text-sm font-semibold text-primary">Shop local stores in one place</p>
            <h1 className="mt-2 text-3xl font-extrabold leading-tight tracking-tight md:text-5xl">
              Local favourites, delivered to your door.
            </h1>
            <p className="mt-3 max-w-md text-muted-foreground">
              Order before 4pm for same-day delivery across Maseru. Choose cash at delivery or
              arrange a transfer directly with the store.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button asChild size="lg" className="rounded-full">
                <Link to="/shop">
                  Start shopping <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>
          <img
            src="/promotional/home-groceries.png"
            alt="Fresh vegetables and groceries"
            className="h-48 w-full object-cover md:h-full"
            width={1024}
            height={768}
          />
        </div>
      </section>

      <section>
        <SectionHead title="Local stores" />
        {stores.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {stores.map((store) => (
              <Link
                key={store.id}
                to="/shop"
                search={{ store: store.slug }}
                className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 transition hover:border-primary/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span
                  className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary-soft text-2xl"
                  aria-hidden
                >
                  🏬
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-bold">{store.name}</span>
                  <span className="block truncate text-sm text-muted-foreground">
                    {store.tagline}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {formatMShort(store.deliveryFee)} delivery · {store.deliveryAreas.length}{" "}
                    delivery areas
                  </span>
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <CatalogEmptyState message="No local stores are taking orders yet. Check back soon." />
        )}
      </section>

      <section className="grid grid-cols-3 gap-2 text-center text-xs md:text-sm">
        <Perk
          icon={<Truck className="size-5" />}
          title={`${formatMShort(shop.deliveryFee)} delivery`}
        />
        <Perk icon={<Clock className="size-5" />} title="Same-day" />
        <Perk icon={<Wallet className="size-5" />} title="Cash or transfer" />
      </section>

      <section>
        <SectionHead title="Shop by category" />
        {uniqueCategories.length ? (
          <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 md:mx-0 md:grid md:grid-cols-8 md:px-0">
            {uniqueCategories
              .sort((a, b) => a.order - b.order)
              .map((c) => (
                <Link
                  key={c.id}
                  to="/shop"
                  search={{ category: c.slug }}
                  className="flex w-20 shrink-0 flex-col items-center gap-1.5 md:w-auto"
                >
                  <span
                    className={`tile-${c.accent} flex size-16 items-center justify-center overflow-hidden rounded-2xl text-3xl`}
                  >
                    <img
                      src={`/categories/${c.slug}.png`}
                      alt=""
                      className="size-full object-cover"
                      loading="lazy"
                    />
                  </span>
                  <span className="text-center text-xs font-medium leading-tight">{c.name}</span>
                </Link>
              ))}
          </div>
        ) : (
          <CatalogEmptyState message="Store categories will appear here when catalogues are ready." />
        )}
      </section>

      {specials.length ? (
        <section>
          <SectionHead title="This week's specials" />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {specials.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <SectionHead title="Popular right now" />
        {popular.length ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {popular.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <CatalogEmptyState message="Stores are adding products to their shelves. Browse again soon." />
        )}
      </section>
    </div>
  );
}

function SectionHead({ title }: { title: string }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-lg font-bold tracking-tight">{title}</h2>
      <Link to="/shop" className="text-sm font-semibold text-primary">
        See all
      </Link>
    </div>
  );
}

function Perk({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-2xl border border-border bg-card p-3 font-semibold">
      <span className="text-primary">{icon}</span>
      {title}
    </div>
  );
}

function CatalogEmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-5 text-sm text-muted-foreground">
      {message}
    </div>
  );
}
