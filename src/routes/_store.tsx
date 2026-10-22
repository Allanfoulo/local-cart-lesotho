import { Link, Outlet, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Home, LayoutGrid, MapPin, Package, Search, ShoppingCart, User } from "lucide-react";
import { useState } from "react";

import { Logo } from "@/components/store/Logo";
import { ConvexMarketplaceSync } from "@/components/shop/ConvexMarketplaceSync";
import { WorkspaceSwitcher } from "@/components/auth/WorkspaceSwitcher";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppStore } from "@/lib/app-store";

export const Route = createFileRoute("/_store")({
  component: StoreLayout,
});

function StoreLayout() {
  const { shop, cartCount, deliveryArea, setDeliveryArea } = useAppStore();
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  return (
    <div className="min-h-screen pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
      {import.meta.env["VITE_CONVEX_URL"] ? <ConvexMarketplaceSync /> : null}
      <a
        href="#storefront-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-card focus:px-4 focus:py-3 focus:font-semibold focus:text-foreground focus:shadow-lg"
      >
        Skip to content
      </a>
      <header className="z-30 border-b border-border bg-background/90 backdrop-blur md:sticky md:top-0">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Link to="/" className="min-w-0 max-w-[75vw] md:max-w-none">
            <Logo name={shop.name} tagline={shop.tagline} />
          </Link>
          <form
            className="relative hidden flex-1 md:block"
            onSubmit={(e) => {
              e.preventDefault();
              navigate({ to: "/shop", search: { q } });
            }}
          >
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Search products"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search tomatoes, bread, milk…"
              className="h-10 rounded-full bg-card pl-9"
            />
          </form>
          <nav className="ml-auto hidden items-center gap-1 md:flex">
            <NavLink to="/shop">Shop</NavLink>
            <NavLink to="/orders">Orders</NavLink>
            <NavLink to="/account">Account</NavLink>
          </nav>
          <Link
            to="/cart"
            className="relative ml-auto flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground md:ml-0"
            aria-label={cartCount > 0 ? `Cart, ${cartCount} items` : "Cart, empty"}
          >
            <ShoppingCart className="size-5" />
            {cartCount > 0 ? (
              <span
                aria-hidden="true"
                className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-promo text-[10px] font-bold text-promo-foreground"
              >
                {cartCount}
              </span>
            ) : null}
          </Link>
        </div>
        <form
          className="mx-auto flex max-w-6xl px-4 pb-2.5 md:hidden"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            navigate({ to: "/shop", search: { q } });
          }}
        >
          <div className="relative min-w-0 flex-1">
            <Search
              className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="search"
              aria-label="Search products"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search products"
              className="h-11 rounded-full bg-card pl-9"
            />
          </div>
          <button
            type="submit"
            aria-label="Search"
            className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Search className="size-4" aria-hidden="true" />
          </button>
        </form>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 pb-2.5 text-sm">
          <div className="flex min-w-0 items-center gap-2">
            <MapPin className="size-4 shrink-0 text-primary" />
            <span className="shrink-0 text-muted-foreground">Deliver to</span>
            <Select value={deliveryArea} onValueChange={setDeliveryArea}>
              <SelectTrigger
                aria-label="Delivery area"
                className="h-11 w-auto min-w-0 max-w-[min(55vw,20rem)] gap-1 border-0 bg-transparent px-1 font-semibold shadow-none"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {shop.deliveryAreas.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <WorkspaceSwitcher className="ml-auto" />
        </div>
      </header>

      <main id="storefront-content" tabIndex={-1} className="mx-auto max-w-6xl px-4 py-5">
        <Outlet />
      </main>

      <footer className="mx-auto hidden max-w-6xl border-t border-border px-4 py-8 text-sm text-muted-foreground md:block">
        <div className="flex flex-wrap justify-between gap-4">
          <div>
            <p className="font-semibold text-foreground">{shop.name}</p>
            <p>{shop.address}</p>
            <p>{shop.openingHours}</p>
          </div>
          <div className="text-right">
            <p>Call or WhatsApp {shop.phone}</p>
            <Link
              to="/admin"
              search={{ store: undefined }}
              className="underline-offset-4 hover:underline"
            >
              Staff login
            </Link>
          </div>
        </div>
      </footer>

      <nav
        aria-label="Storefront"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <TabLink to="/" icon={<Home className="size-5" />} label="Home" />
        <TabLink to="/shop" icon={<LayoutGrid className="size-5" />} label="Shop" />
        <TabLink
          to="/cart"
          icon={<ShoppingCart className="size-5" />}
          label={`Cart${cartCount ? ` (${cartCount})` : ""}`}
        />
        <TabLink to="/orders" icon={<Package className="size-5" />} label="Orders" />
        <TabLink to="/account" icon={<User className="size-5" />} label="Account" />
      </nav>
    </div>
  );
}

function NavLink({ to, children }: { to: "/shop" | "/orders" | "/account"; children: string }) {
  return (
    <Link
      to={to}
      className="rounded-full px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      activeProps={{ className: "text-foreground bg-muted" }}
    >
      {children}
    </Link>
  );
}

function TabLink({
  to,
  icon,
  label,
}: {
  to: "/" | "/shop" | "/cart" | "/orders" | "/account";
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      to={to}
      activeOptions={{ exact: to === "/" }}
      className="flex min-h-12 flex-col items-center justify-center gap-0.5 py-1 text-xs font-medium text-muted-foreground"
      activeProps={{ className: "text-primary" }}
    >
      {icon}
      {label}
    </Link>
  );
}
