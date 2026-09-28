import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowLeft, LogOut, MapPin, Truck } from "lucide-react";
import { useRouterState } from "@tanstack/react-router";
import { useAppStore } from "@/lib/app-store";
import { Logo } from "@/components/store/Logo";
import { A } from "@/components/shop/shared";

const SESSION_KEY = "mabote-driver-demo";

type DriverContextValue = {
  activeDriver: string;
  signOut: () => void;
};

const DriverContext = createContext<DriverContextValue | null>(null);

export function useDriver() {
  const value = useContext(DriverContext);
  if (!value) throw new Error("Missing driver provider");
  return value;
}

function driverOptions(orders: ReturnType<typeof useAppStore>["orders"]) {
  const names = orders.map((order) => order.driver).filter((name): name is string => Boolean(name));
  return [...new Set(["Moshe Thabane", "Thabo Molefi", ...names])];
}

function DriverLogin({ onEnter }: { onEnter: (name: string) => void }) {
  const s = useAppStore();
  const options = driverOptions(s.orders);
  const [selected, setSelected] = useState(options[0] ?? "Moshe Thabane");
  return (
    <div className="driver-login">
      <div className="driver-login-card">
        <div className="driver-login-brand">
          <Logo imageUrl={s.shop.logoUrl} name={s.shop.name} tagline="DRIVER DELIVERY APP" />
          <span className="driver-login-mark">
            <Truck size={22} />
          </span>
        </div>
        <p className="eyebrow">DRIVER DEMO</p>
        <h1>Your deliveries, at a glance.</h1>
        <p className="driver-login-copy">
          See today&apos;s stops, customer details and delivery handoffs from the driver side of the
          Mabote Fresh experience.
        </p>
        <label className="field">
          <span>Choose a demo driver</span>
          <select value={selected} onChange={(event) => setSelected(event.target.value)}>
            {options.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </label>
        <button className="button wide driver-login-button" onClick={() => onEnter(selected)}>
          Enter driver dashboard
          <Truck size={18} />
        </button>
        <p className="notice">
          Demo access only. Status changes are saved in this browser so you can walk through a
          complete handoff.
        </p>
        <A to="/" className="text-button">
          <ArrowLeft size={17} />
          Back to the shop
        </A>
      </div>
    </div>
  );
}

export function DriverLayout({ children }: { children: ReactNode }) {
  const s = useAppStore();
  const path = useRouterState({ select: (router) => router.location.pathname });
  const [loaded, setLoaded] = useState(false);
  const [access, setAccess] = useState(false);
  const [activeDriver, setActiveDriver] = useState("");
  const options = useMemo(() => driverOptions(s.orders), [s.orders]);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved && options.includes(saved)) {
        setActiveDriver(saved);
        setAccess(true);
      }
    } catch {
      /* Session storage may be disabled. */
    }
    setLoaded(true);
  }, [options]);

  const enter = (name: string) => {
    try {
      sessionStorage.setItem(SESSION_KEY, name);
    } catch {
      /* Continue in memory if storage is unavailable. */
    }
    setActiveDriver(name);
    setAccess(true);
  };
  const signOut = () => {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      /* Ignore storage errors. */
    }
    setAccess(false);
    setActiveDriver("");
  };

  if (!loaded || !s.ready) return <div className="empty">Loading driver dashboard…</div>;
  if (!access) return <DriverLogin onEnter={enter} />;

  return (
    <DriverContext.Provider value={{ activeDriver, signOut }}>
      <div className="driver-shell">
        <header className="driver-topbar">
          <div className="driver-topbar-brand">
            <A to="/driver" aria-label="Driver dashboard home">
              <Logo imageUrl={s.shop.logoUrl} name={s.shop.name} tagline="DRIVER APP" />
            </A>
            <span className="driver-live">
              <span /> On shift
            </span>
          </div>
          <div className="driver-topbar-actions">
            <span className="driver-avatar" aria-hidden="true">
              {activeDriver
                .split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)}
            </span>
            <span className="driver-name">{activeDriver}</span>
            <button className="icon-button" aria-label="Leave driver demo" onClick={signOut}>
              <LogOut size={18} />
            </button>
          </div>
        </header>
        <main className="driver-main">
          <div className="driver-breadcrumb">
            <A to="/driver">
              <Truck size={15} /> Driver dashboard
            </A>
            {path !== "/driver" && <span> / Delivery details</span>}
          </div>
          {children}
        </main>
        <footer className="driver-footer">
          <div>
            <MapPin size={15} /> Maseru delivery team
          </div>
          <div>
            Demo workspace · <A to="/admin">Open staff view</A>
          </div>
        </footer>
      </div>
    </DriverContext.Provider>
  );
}

export { SESSION_KEY };
