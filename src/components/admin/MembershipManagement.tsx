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
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const superadmin = access?.isSuperadmin ?? false;
  const myStoreRole = access?.memberships.find((membership) => membership.storeId === selectedStoreId && membership.status === "active")?.role;
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
    setError("");
    try { await setMembershipStatus({ membershipId, status }); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not update membership access."); }
  }
  async function resend(invitationId: Id<"staffInvitations">) {
    setError("");
    try { await resendInvitation({ invitationId }); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not resend this invitation."); }
  }
  async function revoke(invitationId: Id<"staffInvitations">) {
    setError("");
    try { await revokeInvitation({ invitationId }); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not revoke this invitation."); }
  }

  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-xl font-semibold">Team access</h2>
        <p className="text-sm text-muted-foreground">Invite people to this store and manage their scoped access.</p>
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
          <form onSubmit={invite} className="grid gap-3 rounded-2xl border bg-card p-4 sm:grid-cols-[1fr_220px_auto] sm:items-end">
            <label className="text-sm font-medium">Email address<Input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1.5" /></label>
            <label className="text-sm font-medium">Store role<select className="mt-1.5 h-11 w-full rounded-xl border bg-background px-3" value={role} onChange={(event) => setRole(event.target.value)}>{roles.map((value) => <option key={value} value={value}>{roleLabels[value]}</option>)}</select></label>
            <Button disabled={busy}>{busy ? "Sending…" : "Invite team member"}</Button>
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
                  <Button size="sm" variant="outline" disabled={member.role === "store_owner" && !superadmin} onClick={() => void changeStatus(member.id, member.status === "active" ? "suspended" : "active")}>{member.status === "active" ? "Suspend" : "Reactivate"}</Button>
                </div>
              ))}
              {members?.length === 0 && <p className="p-4 text-sm text-muted-foreground">No store memberships yet.</p>}
            </div>
          </div>
          <div>
            <h3 className="mb-3 font-semibold">Invitations</h3>
            <div className="divide-y rounded-2xl border bg-card">
              {invitations?.map((invitation) => (
                <div key={invitation._id} className="flex flex-wrap items-center gap-3 p-4">
                  <div className="min-w-0 flex-1"><p className="truncate font-medium">{invitation.email}</p><p className="text-sm text-muted-foreground">{roleLabels[invitation.role]} · expires {new Date(invitation.expiresAt).toLocaleDateString()}</p></div>
                  {(() => {
                    const status = ["pending", "sent"].includes(invitation.status) && invitation.expiresAt <= Date.now() ? "expired" : invitation.status;
                    return <><span className="text-sm capitalize text-muted-foreground">{status}</span>{(["failed", "expired"].includes(status)) && <Button size="sm" variant="outline" onClick={() => void resend(invitation._id)}>Resend</Button>}{(["pending", "sent", "failed"].includes(status)) && <Button size="sm" variant="ghost" onClick={() => void revoke(invitation._id)}>Revoke</Button>}</>;
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
