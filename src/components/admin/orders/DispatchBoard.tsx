import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, MapPin, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeliveryMap } from "@/components/maps/DeliveryMap";
import { useAppStore } from "@/lib/app-store";
import { deliveryAreasForMap, orderMapPoint } from "@/lib/delivery-map";
import { formatM } from "@/lib/format";

const eligible = new Set(["ready", "out_for_delivery"]);
export function DispatchBoard() {
  const { orders, shop, deliveryRouteSequence, setDeliveryRouteSequence } = useAppStore();
  const drivers = [...new Set(orders.filter((order) => eligible.has(order.status) && order.driver).map((order) => order.driver!))];
  const [driver, setDriver] = useState(drivers[0] ?? "");
  const activeDriver = drivers.includes(driver) ? driver : drivers[0] ?? "";
  const assigned = orders.filter((order) => order.driver === activeDriver && eligible.has(order.status));
  const savedIds = deliveryRouteSequence[activeDriver] ?? [];
  const ordered = [...assigned].sort((a, b) => {
    const ai = savedIds.indexOf(a.id), bi = savedIds.indexOf(b.id);
    return (ai < 0 ? Number.MAX_SAFE_INTEGER : ai) - (bi < 0 ? Number.MAX_SAFE_INTEGER : bi);
  });
  const points = useMemo(() => ordered.flatMap((order) => {
    const point = orderMapPoint(order);
    return point ? [{ ...point, label: order.number, detail: `${order.address.area} · approximate neighbourhood centre only` }] : [];
  }), [ordered]);
  const reorder = (index: number, direction: -1 | 1) => {
    const next = [...ordered];
    const other = index + direction;
    if (other < 0 || other >= next.length) return;
    [next[index], next[other]] = [next[other]!, next[index]!];
    setDeliveryRouteSequence(activeDriver, next.map((order) => order.id));
  };
  const areas = useMemo(() => deliveryAreasForMap(shop.deliveryAreas), [shop.deliveryAreas]);
  return <section className="space-y-5">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-xl font-semibold">Dispatch and stop order</h2><p className="text-sm text-muted-foreground">Arrange ready deliveries for each driver. This is a manual team sequence, not road directions.</p></div><label className="text-sm font-medium">Driver<select className="mt-1.5 block h-10 min-w-48 rounded-lg border bg-card px-3" value={activeDriver} onChange={e=>setDriver(e.target.value)}>{drivers.length?drivers.map(name=><option key={name}>{name}</option>):<option value="">No assigned deliveries</option>}</select></label></header>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,.85fr)]"><div className="overflow-hidden rounded-2xl border bg-card"><DeliveryMap points={points} areas={areas} height="360px" ariaLabel="Approximate Maseru delivery areas and dispatch stops"/><p className="border-t bg-muted/40 px-4 py-3 text-xs text-muted-foreground">Map pins show approximate neighbourhood centres only. Customer coordinates and address details are not sent to the map provider.</p></div>
    <div><div className="mb-3 flex items-center justify-between"><div><h3 className="font-semibold">Manual stop order</h3><p className="text-xs text-muted-foreground">Saved in this browser by driver.</p></div><Truck className="size-5 text-primary"/></div><ol className="divide-y rounded-2xl border bg-card">{ordered.map((order,index)=><li key={order.id} className="flex items-center gap-3 p-3"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{index+1}</span><div className="min-w-0 flex-1"><p className="font-semibold">{order.number} · {order.customer.name}</p><p className="flex items-center gap-1 truncate text-xs text-muted-foreground"><MapPin className="size-3 shrink-0"/>{order.address.area} · {order.address.landmark || "No landmark recorded"}</p><p className="text-xs text-muted-foreground">{formatM(order.total)} · {order.status.replaceAll("_"," ")}</p></div><div className="flex flex-col"><Button variant="ghost" size="icon" aria-label={`Move ${order.number} earlier`} disabled={index===0} onClick={()=>reorder(index,-1)}><ArrowUp className="size-4"/></Button><Button variant="ghost" size="icon" aria-label={`Move ${order.number} later`} disabled={index===ordered.length-1} onClick={()=>reorder(index,1)}><ArrowDown className="size-4"/></Button></div></li>)}{ordered.length===0&&<li className="p-8 text-center text-sm text-muted-foreground">No ready deliveries assigned to this driver yet. Assign a driver and mark an order ready to add it here.</li>}</ol>
    <p className="mt-3 rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">Move stops up or down to set the team’s order. The map does not calculate routes or travel times.</p></div></div>
  </section>;
}
