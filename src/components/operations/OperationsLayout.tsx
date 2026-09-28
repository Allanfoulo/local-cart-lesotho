import { useEffect, useState, type ReactNode } from "react";
import {
  Boxes,
  ChartNoAxesCombined,
  ClipboardList,
  Headphones,
  ListChecks,
  LogOut,
  PackageCheck,
  Truck,
} from "lucide-react";
import { useRouterState } from "@tanstack/react-router";
import { useAppStore } from "@/lib/app-store";
import { Logo } from "@/components/store/Logo";
import { A } from "@/components/shop/shared";

const nav = [
  ["/operations/picking", "Picking & fulfilment", ListChecks],
  ["/operations/dispatch", "Dispatch", Truck],
  ["/operations/inventory", "Inventory", Boxes],
  ["/operations/support", "Support desk", Headphones],
  ["/owner", "Owner overview", ChartNoAxesCombined],
] as const;

export function OperationsLayout({ children }: { children: ReactNode }) {
  const s = useAppStore();
  const path = useRouterState({ select: (router) => router.location.pathname });
  const [access, setAccess] = useState(false);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    try {
      setAccess(sessionStorage.getItem("mabote-operations-demo") === "true");
    } catch {
      /* Session storage may be disabled. */
    }
    setLoaded(true);
  }, []);
  const enter = () => {
    try {
      sessionStorage.setItem("mabote-operations-demo", "true");
    } catch {
      /* Continue in memory if storage is unavailable. */
    }
    setAccess(true);
  };
  const leave = () => {
    try {
      sessionStorage.removeItem("mabote-operations-demo");
    } catch {
      /* Ignore storage errors. */
    }
    setAccess(false);
  };
  if (!loaded || !s.ready) return <div className="empty">Loading operations workspace…</div>;
  if (!access)
    return (
      <div className="ops-login">
        <div className="ops-login-card">
          <Logo imageUrl={s.shop.logoUrl} name={s.shop.name} tagline="OPERATIONS SUITE" />
          <div className="ops-login-icon">
            <PackageCheck size={26} />
          </div>
          <p className="eyebrow">INTERNAL DEMO</p>
          <h1>Run the shop from one place.</h1>
          <p>
            Move orders from picking to dispatch, keep shelves healthy and give customers a quick
            answer.
          </p>
          <button className="button wide" onClick={enter}>
            Enter operations suite <ClipboardList size={17} />
          </button>
          <p className="notice">
            Demo access only. Changes are saved in this browser and appear in the staff and driver
            views.
          </p>
          <A to="/admin" className="text-button">
            Back to staff admin
          </A>
        </div>
      </div>
    );
  return (
    <div className="ops-shell">
      <aside className="ops-sidebar">
        <A to="/operations/picking" className="ops-brand">
          <Logo imageUrl={s.shop.logoUrl} name={s.shop.name} tagline="OPERATIONS SUITE" />
        </A>
        <div className="ops-sidebar-label">WORKSPACES</div>
        <nav>
          {nav.map(([to, label, Icon]) => (
            <A
              key={to}
              to={to}
              className={path === to || path.startsWith(`${to}/`) ? "active" : ""}
            >
              <Icon size={18} />
              {label}
            </A>
          ))}
        </nav>
        <div className="ops-sidebar-bottom">
          <A to="/admin">Staff admin</A>
          <A to="/driver">Driver demo</A>
          <button onClick={leave}>
            <LogOut size={17} /> Leave operations demo
          </button>
        </div>
      </aside>
      <div className="ops-content">
        <header className="ops-header">
          <div>
            <span className="ops-header-kicker">MABOTE FRESH · INTERNAL</span>
            <strong>Operations workspace</strong>
          </div>
          <span className="demo-badge">Demo workspace</span>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}

export function OperationsHeading({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="ops-heading">
      <div>
        <p className="eyebrow">OPERATIONS</p>
        <h1>{title}</h1>
        <p>{text}</p>
      </div>
      {action}
    </div>
  );
}
