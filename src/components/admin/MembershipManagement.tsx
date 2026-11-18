import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const roleLabels: Record<string, string> = {
  store_owner: "Store owner",
  store_manager: "Store manager",
  order_staff: "Order preparation staff",
  catalogue_staff: "Catalogue staff",
  dispatcher: "Dispatcher",
  driver: "Driver",
};
const roleDescriptions: Record<string, string> = {
  store_owner: "Full store administration, including manager invitations and store settings.",
  store_manager: "Manage store operations, orders, catalogue, settings, and staff invitations.",
  order_staff: "Prepare assigned orders and update their preparation status.",
  catalogue_staff: "Maintain products, categories, stock, and promotions.",
  dispatcher: "Review the store delivery queue and assign drivers.",
  driver: "View assigned deliveries and update delivery progress.",
};

export function MembershipManagement() {
  const access = useQuery(api.memberships.currentAccess, {});
  const [storeId, setStoreId] = useState<string>("");
  const selectedStoreId = storeId || access?.stores[0]?.id || "";
  const id = selectedStoreId ? (selectedStoreId as Id<"stores">) : undefined;
  const members = useQuery(api.memberships.listForStore, id ? { storeId: id } : "skip");
  const invitations = useQuery(api.invitations.listForStore, id ? { storeId: id } : "skip");
  const createInvitation = useMutation(api.invitations.create);
  const resendInvitation = useMutation(api.invitations.resend);
  const revokeInvitation = useMutation(api.invitations.revoke);
  const setMembershipStatus = useMutation(api.memberships.setMembershipStatus);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("driver");
  const [busy, setBusy] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const superadmin = access?.isSuperadmin ?? false;
  const myStoreRole = access?.memberships.find((membership) => membership.storeId === selectedStoreId && membership.status === "active")?.role;
  const selectedStore = access?.stores.find((store) => store.id === selectedStoreId);
  const roles = superadmin
    ? ["store_owner", "store_manager", "order_staff", "catalogue_staff", "dispatcher", "driver"]
    : myStoreRole === "store_owner"
      ? ["store_manager", "order_staff", "catalogue_staff", "dispatcher", "driver"]
      : ["order_staff", "catalogue_staff", "dispatcher", "driver"];

  async function invite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!id) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await createInvitation({ storeId: id, email, role: role as "store_owner" | "store_manager" | "order_staff" | "catalogue_staff" | "dispatcher" | "driver" });
      setEmail("");
      setNotice("Invitation queued. Delivery status will update here.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not create the invitation.");
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(membershipId: Id<"memberships">, status: "active" | "suspended") {
    setActionId(String(membershipId));
    setError("");
    try { await setMembershipStatus({ membershipId, status }); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not update membership access."); }
    finally { setActionId(null); }
  }
  async function resend(invitationId: Id<"staffInvitations">) {
    setActionId(String(invitationId));
    setError("");
    try { await resendInvitation({ invitationId }); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not resend this invitation."); }
    finally { setActionId(null); }
  }
  async function revoke(invitationId: Id<"staffInvitations">) {
    setActionId(String(invitationId));
    setError("");
    try { await revokeInvitation({ invitationId }); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not revoke this invitation."); }
    finally { setActionId(null); }
  }

  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-xl font-semibold">Team access</h2>
        <p className="text-sm text-muted-foreground">Invite people to {selectedStore?.name ?? "this store"}. Each person can access this store only, within the permissions shown below.</p>
      </header>
      {access && access.stores.length > 1 && (
        <label className="block max-w-sm text-sm font-medium">
          Store
          <select className="mt-1.5 h-11 w-full rounded-xl border bg-card px-3" value={selectedStoreId} onChange={(event) => setStoreId(event.target.value)}>
            {access.stores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}
          </select>
        </label>
      )}
      {!id ? <p className="rounded-xl border p-4 text-sm text-muted-foreground">No store is available for team management.</p> : (
        <>
          <form onSubmit={invite} className="grid gap-3 rounded-2xl border bg-card p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_minmax(220px,0.8fr)_auto] lg:items-end">
            <label className="text-sm font-medium">Email address<Input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1.5" /></label>
            <label className="text-sm font-medium">Store role<select className="mt-1.5 h-11 w-full rounded-xl border bg-background px-3" value={role} onChange={(event) => setRole(event.target.value)}>{roles.map((value) => <option key={value} value={value}>{roleLabels[value]}</option>)}</select></label>
            <Button className="min-h-11 w-full lg:w-auto" disabled={busy}>{busy ? "Sending…" : "Invite team member"}</Button>
            <p className="rounded-lg bg-muted/60 p-3 text-sm text-muted-foreground lg:col-span-3">
              <span className="font-medium text-foreground">{selectedStore?.name ?? "Selected store"} · {roleLabels[role]}:</span> {roleDescriptions[role]} Access is limited to this store. The invitation expires after 7 days and the recipient must verify the invited email before accepting.
            </p>
          </form>
          {notice && <p role="status" className="text-sm text-primary">{notice}</p>}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <div>
            <h3 className="mb-3 font-semibold">Current members</h3>
            <div className="divide-y rounded-2xl border bg-card">
              {members?.map((member) => (
                <div key={member.id} className="flex flex-wrap items-center gap-3 p-4">
                  <div className="min-w-0 flex-1"><p className="truncate font-medium">{member.name || member.email}</p><p className="text-sm text-muted-foreground">{member.email} · {roleLabels[member.role] ?? member.role}</p></div>
                  <span className="text-sm capitalize text-muted-foreground">{member.status}</span>
                  <Button size="sm" className="min-h-11" variant="outline" disabled={actionId === String(member.id) || (member.role === "store_owner" && !superadmin)} onClick={() => void changeStatus(member.id, member.status === "active" ? "suspended" : "active")}>{actionId === String(member.id) ? "Saving…" : member.status === "active" ? "Suspend" : "Reactivate"}</Button>
                </div>
              ))}
              {members?.length === 0 && <p className="p-4 text-sm text-muted-foreground">No store memberships yet.</p>}
            </div>
          </div>
          <div>
            <h3 className="mb-3 font-semibold">Invitations</h3>
            <div className="divide-y rounded-2xl border bg-card">
              {invitations?.map((invitation) => (
                <div key={invitation._id} className="flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:items-center">
                  <div className="min-w-0 flex-1"><p className="break-all font-medium">{invitation.email}</p><p className="mt-0.5 text-sm text-muted-foreground">{selectedStore?.name ?? "Store"} · {roleLabels[invitation.role]} · {roleDescriptions[invitation.role]}</p><p className="mt-1 text-xs text-muted-foreground">Expires {new Date(invitation.expiresAt).toLocaleDateString()}</p></div>
                  {(() => {
                    const status = ["pending", "sent"].includes(invitation.status) && invitation.expiresAt <= Date.now() ? "expired" : invitation.status;
                    return <div className="flex flex-wrap items-center gap-2"><span className="min-h-11 content-center rounded-full bg-muted px-3 text-sm capitalize text-muted-foreground">{status}</span>{(["failed", "expired"].includes(status)) && <Button className="min-h-11" size="sm" variant="outline" disabled={actionId === String(invitation._id)} onClick={() => void resend(invitation._id)}>{actionId === String(invitation._id) ? "Sending…" : "Resend invite"}</Button>}{(["pending", "sent", "failed"].includes(status)) && <Button className="min-h-11" size="sm" variant="ghost" disabled={actionId === String(invitation._id)} onClick={() => void revoke(invitation._id)}>Revoke</Button>}</div>;
                  })()}
                </div>
              ))}
              {invitations?.length === 0 && <p className="p-4 text-sm text-muted-foreground">No invitations yet.</p>}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
