import { Link, Outlet, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Home, LayoutGrid, MapPin, Package, Search, ShoppingCart, User } from "lucide-react";
import { useState } from "react";

import { Logo } from "@/components/store/Logo";
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
    <div className="min-h-screen pb-20 md:pb-0">
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Link to="/">
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
            className="relative ml-auto flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground md:ml-0"
            aria-label="Cart"
          >
            <ShoppingCart className="size-5" />
            {cartCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-promo text-[10px] font-bold text-promo-foreground">
                {cartCount}
              </span>
            ) : null}
          </Link>
        </div>
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 pb-2.5 text-sm">
          <MapPin className="size-4 shrink-0 text-primary" />
          <span className="text-muted-foreground">Deliver to</span>
          <Select value={deliveryArea} onValueChange={setDeliveryArea}>
            <SelectTrigger className="h-7 w-auto gap-1 border-0 bg-transparent px-1 font-semibold shadow-none">
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
      </header>

      <main className="mx-auto max-w-6xl px-4 py-5">
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
            <Link to="/admin" className="underline-offset-4 hover:underline">
              Staff login
            </Link>
          </div>
        </div>
      </footer>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-card md:hidden">
        <TabLink to="/" icon={<Home className="size-5" />} label="Home" />
        <TabLink to="/shop" icon={<LayoutGrid className="size-5" />} label="Shop" />
        <TabLink to="/cart" icon={<ShoppingCart className="size-5" />} label={`Cart${cartCount ? ` (${cartCount})` : ""}`} />
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
      className="flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-muted-foreground"
      activeProps={{ className: "text-primary" }}
    >
      {icon}
      {label}
    </Link>
  );
}
