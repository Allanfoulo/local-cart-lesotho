import { useAppStore } from "@/lib/app-store";

export function ManagementStoreSelector() {
  const { managementStores, managementStore, setManagementStore } = useAppStore();
  if (managementStores.length < 2) return null;

  return (
    <label className="block max-w-sm text-sm font-medium">
      Managing store
      <select
        aria-label="Managing store"
        className="mt-1.5 h-11 w-full rounded-xl border bg-card px-3"
        value={managementStore.id}
        onChange={(event) => setManagementStore(event.target.value)}
      >
        {managementStores.map((store) => (
          <option key={store.id} value={store.id}>{store.name}{store.enabled ? "" : " (not published)"}</option>
        ))}
      </select>
    </label>
  );
}
