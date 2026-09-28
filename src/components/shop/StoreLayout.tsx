import { useState, type ReactNode } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import {
  MapPin,
  Search,
  ShoppingBasket,
  UserRound,
  Home,
  Grid2X2,
  ClipboardList,
  ArrowRight,
  Truck,
  Phone,
  Leaf,
} from "lucide-react";
import { useAppStore } from "@/lib/app-store";
import { Logo } from "@/components/store/Logo";
import { formatM } from "@/lib/format";
import { A, attempt } from "./shared";
export function StoreLayout({ children }: { children: ReactNode }) {
  const s = useAppStore();
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const path = useRouterState({ select: (r) => r.location.pathname });
  const nav = [
    ["/", "Home", Home],
    ["/categories", "Categories", Grid2X2],
    ["/shop", "Search", Search],
    ["/orders", "Orders", ClipboardList],
    ["/account", "Account", UserRound],
  ] as const;
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <div className="announcement">
        <span>
          <Leaf size={14} />
          Good food. Brighter tomorrows.
        </span>
        <span>Local people. Better days.</span>
      </div>
      <header className="store-header">
        <div className="header-inner">
          <A to="/" aria-label={`${s.shop.name} home`}>
            <Logo
              imageUrl={s.shop.logoUrl}
              name={s.shop.name}
              tagline="Your local grocer · Maseru"
            />
          </A>
          <label className="delivery-select">
            <MapPin size={20} />
            <span>
              <small>Delivering to</small>
              <select
                aria-label="Delivery area"
                value={s.deliveryArea}
                onChange={(e) => attempt(() => s.setDeliveryArea(e.target.value))}
              >
                {s.shop.deliveryAreas.map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
            </span>
          </label>
          <form
            className="header-search"
            onSubmit={(e) => {
              e.preventDefault();
              navigate({ to: "/shop", search: { q: search } });
            }}
          >
            <Search size={19} />
            <input
              aria-label="Search groceries"
              placeholder="What’s on your shopping list?"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button aria-label="Search" type="submit">
              <ArrowRight size={18} />
            </button>
          </form>
          <div className="header-actions">
            <A to="/account" className="account-link" aria-label="My account">
              <UserRound size={23} />
            </A>
            <A to="/cart" className="header-cart" aria-label={`Basket, ${s.cartCount} products`}>
              <ShoppingBasket size={22} />
              <span>{s.cartCount}</span>
              <strong>{formatM(s.cartSubtotal)}</strong>
            </A>
          </div>
        </div>
        <nav className="desktop-nav">
          <A to="/shop">Shop all groceries</A>
          {s.categories
            .filter((c) => c.enabled)
            .sort((a, b) => a.order - b.order)
            .slice(0, 7)
            .map((c) => (
              <A key={c.id} to={`/category/${c.slug}`}>
                {c.name}
              </A>
            ))}
          <A to="/category/specials" className="green">
            This week’s specials
          </A>
        </nav>
      </header>
      <main id="main" className="store-main">
        {s.ready ? (
          children
        ) : (
          <div className="loading-shell" aria-label="Loading shop">
            <div />
            <div />
            <div />
          </div>
        )}
      </main>
      <footer className="store-footer">
        <div>
          <Logo
            imageUrl={s.shop.logoUrl}
            name={s.shop.name}
            tagline="Good food brings us closer."
          />
          <p>{s.shop.address}</p>
          <p>{s.shop.openingHours}</p>
        </div>
        <div>
          <h3>Here for your neighbourhood</h3>
          <A to="/shop">Shop groceries</A>
          <A to="/orders">Track your order</A>
          <a href={`tel:${s.shop.phone.replace(/\s/g, "")}`}>
            <Phone size={16} />
            {s.shop.phone}
          </a>
        </div>
        <div>
          <h3>A little local goes a long way.</h3>
          <p>Every basket supports a shop in your community.</p>
          <A to="/admin">
            Staff demo <ArrowRight size={15} />
          </A>
          <A to="/driver">
            Driver demo <ArrowRight size={15} />
          </A>
          <small>Interactive prototype. Orders stay in this browser.</small>
        </div>
      </footer>
      {s.cartCount > 0 && !["/cart", "/checkout"].includes(path) && (
        <A className="floating-cart" to="/cart">
          <ShoppingBasket size={21} />
          <span>
            {s.cartCount} products · {formatM(s.cartSubtotal)}
          </span>
          <strong>View basket</strong>
          <ArrowRight size={18} />
        </A>
      )}
      <nav className="mobile-nav" aria-label="Main navigation">
        {nav.map(([to, label, Icon]) => (
          <A key={to} to={to} className={path === to ? "active" : ""}>
            <Icon size={21} />
            <span>{label}</span>
          </A>
        ))}
      </nav>
    </>
  );
}
