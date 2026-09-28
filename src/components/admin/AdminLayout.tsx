import { useEffect, useState, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  ClipboardList,
  Package,
  Grid2X2,
  Boxes,
  Users,
  Truck,
  Tag,
  ChartNoAxesCombined,
  Settings,
  ArrowLeft,
  LogOut,
  Menu,
  ShieldCheck,
} from "lucide-react";
import { useAppStore } from "@/lib/app-store";
import { Logo } from "@/components/store/Logo";
import { A } from "@/components/shop/shared";
const nav = [
  ["", "Dashboard", LayoutDashboard],
  ["orders", "Orders", ClipboardList],
  ["products", "Products", Package],
  ["categories", "Categories", Grid2X2],
  ["inventory", "Inventory", Boxes],
  ["customers", "Customers", Users],
  ["deliveries", "Deliveries", Truck],
  ["promotions", "Promotions", Tag],
  ["reports", "Reports", ChartNoAxesCombined],
  ["settings", "Settings", Settings],
] as const;
export function AdminLayout({ children }: { children: ReactNode }) {
  const s = useAppStore();
  const path = useRouterState({ select: (r) => r.location.pathname });
  const [access, setAccess] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [menu, setMenu] = useState(false);
  useEffect(() => {
    try {
      setAccess(sessionStorage.getItem("mabote-staff-demo") === "true");
    } catch {
      /* Session storage may be disabled. */
    }
    setLoaded(true);
  }, []);
  useEffect(() => {
    setMenu(false);
  }, [path]);
  if (!loaded || !s.ready) return <div className="empty">Loading shop management…</div>;
  if (!access)
    return (
      <div className="staff-login">
        <Logo imageUrl={s.shop.logoUrl} name={s.shop.name} />
        <div className="form-panel">
          <ShieldCheck size={36} />
          <p className="eyebrow">SHOP MANAGEMENT</p>
          <h1>Welcome, shop team.</h1>
          <p>Explore orders, products and deliveries in the staff demonstration.</p>
          <p className="notice">
            Demo access only. This browser stores the data. Production staff authentication and
            permissions are not connected.
          </p>
          <button
            className="button wide"
            onClick={() => {
              try {
                sessionStorage.setItem("mabote-staff-demo", "true");
                setAccess(true);
              } catch {
                setAccess(true);
              }
            }}
          >
            Enter staff demo
          </button>
          <A to="/" className="text-button">
            <ArrowLeft size={17} />
            Back to the shop
          </A>
        </div>
      </div>
    );
  return (
    <div className="admin-shell">
      <aside className={`admin-sidebar ${menu ? "open" : ""}`}>
        <A to="/admin">
          <Logo imageUrl={s.shop.logoUrl} name={s.shop.name} tagline="SHOP MANAGEMENT" />
        </A>
        <nav>
          {nav.map(([slug, label, Icon]) => (
            <A
              key={slug}
              to={`/admin${slug ? `/${slug}` : ""}`}
              className={
                (slug ? path.startsWith(`/admin/${slug}`) : path === "/admin") ? "active" : ""
              }
            >
              <Icon size={19} />
              {label}
              {slug === "orders" && (
                <small>{s.orders.filter((o) => o.status === "received").length}</small>
              )}
            </A>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <A to="/operations/picking">
            <Package size={18} />
            Operations suite
          </A>
          <A to="/owner">
            <ChartNoAxesCombined size={18} />
            Owner overview
          </A>
          <A to="/driver">
            <Truck size={18} />
            Driver demo
          </A>
          <A to="/">
            <ArrowLeft size={18} />
            View storefront
          </A>
          <button
            onClick={() => {
              sessionStorage.removeItem("mabote-staff-demo");
              setAccess(false);
            }}
          >
            <LogOut size={18} />
            Leave staff demo
          </button>
        </div>
      </aside>
      <div className="admin-content">
        <header className="admin-header">
          <button
            className="icon-button admin-menu"
            aria-label="Toggle staff navigation"
            onClick={() => setMenu(!menu)}
          >
            <Menu />
          </button>
          <span>YOUR SHOP, AT A GLANCE</span>
          <div>
            <span className="demo-badge">Demo workspace</span>
            <span className="avatar">MF</span>
          </div>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}
