import { useAuthActions, useConvexAuth } from "@convex-dev/auth/react";
import { useMutation, useQuery } from "convex/react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { resolveWorkspaceDestination, type WorkspaceRole } from "@/lib/auth/workspace-destination";
import { WorkspaceChoice, WorkspaceVerificationError } from "@/components/auth/WorkspaceChoice";

export function PublicAuthPage({ inviteToken, returnTo }: { inviteToken?: string; returnTo?: string }) {
  const { signIn, signOut } = useAuthActions();
  const { isLoading, isAuthenticated } = useConvexAuth();
  const acceptInvite = useMutation(api.invitations.accept);
  const access = useQuery(api.memberships.currentAccess, {});
  const navigate = useNavigate();
  const acceptedOnce = useRef(false);
  const [email, setEmail] = useState("");
  const [flow, setFlow] = useState<"signIn" | "signUp">(inviteToken ? "signUp" : "signIn");
  const [verificationPending, setVerificationPending] = useState(false);
  const [resetRequested, setResetRequested] = useState(false);
  const [resetPending, setResetPending] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [inviteAccepted, setInviteAccepted] = useState(false);
  const [showWorkspaceChoice, setShowWorkspaceChoice] = useState(false);
  const [workspaceVerificationFailed, setWorkspaceVerificationFailed] = useState(false);

  useEffect(() => {
    if (inviteToken || isLoading || !isAuthenticated || access === undefined) return;
    if (access === null) {
      setWorkspaceVerificationFailed(true);
      return;
    }
    setWorkspaceVerificationFailed(false);
    if (access.memberships.length > 1) {
      setShowWorkspaceChoice(true);
      return;
    }
    setShowWorkspaceChoice(false);
    const destination = resolveWorkspaceDestination({
      roles: access.memberships.map((membership) => membership.role as WorkspaceRole),
      isSuperadmin: access.isSuperadmin,
      requestedPath: returnTo,
    });
    void navigate({ to: destination });
  }, [access, inviteToken, isAuthenticated, isLoading, navigate, returnTo]);

  useEffect(() => {
    if (!inviteToken || !isAuthenticated || inviteAccepted || acceptedOnce.current) return;
    acceptedOnce.current = true;
    setBusy(true);
    void acceptInvite({ token: inviteToken })
      .then(async (membership) => {
        if ("expired" in membership) {
          throw new Error("This invitation has expired. Ask the store owner to send another.");
        }
        setInviteAccepted(true);
        setMessage(`Invitation accepted. Your ${membership.role.replaceAll("_", " ")} access is active.`);
        await navigate({
          to: resolveWorkspaceDestination({ roles: [membership.role as WorkspaceRole] }),
        });
      })
      .catch((reason: unknown) => {
        acceptedOnce.current = false;
        setError(reason instanceof Error ? reason.message : "Could not accept this invitation.");
      })
      .finally(() => setBusy(false));
  }, [acceptInvite, inviteAccepted, inviteToken, isAuthenticated, navigate]);

  async function submitCredentials(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const formData = new FormData(event.currentTarget);
      formData.set("flow", flow);
      const result = await signIn("password", formData);
      if (!result.signingIn) {
        setVerificationPending(true);
        setMessage("Check your email for a verification code, then enter it below.");
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not complete sign in.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const formData = new FormData(event.currentTarget);
      formData.set("flow", "email-verification");
      await signIn("password", formData);
      setVerificationPending(false);
      setMessage(inviteToken ? "Email verified. Applying your invitation…" : "Email verified. Your account is ready.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not verify the email code.");
    } finally {
      setBusy(false);
    }
  }

  async function requestReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const formData = new FormData(event.currentTarget);
      formData.set("flow", "reset");
      await signIn("password", formData);
      setResetRequested(false);
      setResetPending(true);
      setMessage("If the account is eligible, a password reset code will arrive by email.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not request a reset code.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const formData = new FormData(event.currentTarget);
      formData.set("flow", "reset-verification");
      await signIn("password", formData);
      setResetPending(false);
      setMessage("Password updated. You are signed in.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not reset the password.");
    } finally {
      setBusy(false);
    }
  }

  if (workspaceVerificationFailed) {
    return <WorkspaceVerificationError onSignOut={() => void signOut()} />;
  }

  if (showWorkspaceChoice && access) {
    return (
      <WorkspaceChoice
        email={access.user?.email}
        onAccount={() => void navigate({ to: "/account" })}
        onStaff={() =>
          void navigate({
            to: resolveWorkspaceDestination({
              roles: access.memberships.map((membership) => membership.role as WorkspaceRole),
              isSuperadmin: access.isSuperadmin,
              requestedPath: returnTo,
            }),
          })
        }
      />
    );
  }

  return (
    <main className="grid min-h-screen place-items-center bg-muted/30 px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
        <Link to="/" className="text-sm font-bold tracking-wide text-primary">REETAPELE</Link>
        <p className="mt-7 text-sm font-semibold uppercase tracking-[0.14em] text-primary">
          {inviteToken ? "Store team access" : "Customer account"}
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">
          {inviteAccepted ? "Invitation accepted" : inviteToken ? "Join your store team" : isAuthenticated ? "You’re signed in" : "Sign in or create an account"}
        </h1>
        {inviteAccepted ? (
          <div className="mt-6 space-y-4">
            <p className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-900" role="status">{message}</p>
            <Link to="/" className="block text-center text-sm font-semibold text-primary">Return to the marketplace</Link>
          </div>
        ) : isLoading ? (
          <p className="mt-6 text-sm text-muted-foreground" role="status">Checking your account…</p>
        ) : isAuthenticated && !inviteToken ? (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-muted-foreground">Your REETAPELE account is active.</p>
            <Link to="/account" className="block text-sm font-semibold text-primary">Open your account</Link>
            <Button variant="outline" className="w-full" onClick={() => void signOut()}>Sign out</Button>
          </div>
        ) : resetPending ? (
          <form onSubmit={verifyReset} className="mt-6 space-y-4">
            <input name="email" type="hidden" value={email} />
            <label className="block text-sm font-medium">Password reset code<Input name="code" autoComplete="one-time-code" inputMode="numeric" required className="mt-1.5" /></label>
            <label className="block text-sm font-medium">New password<Input name="newPassword" type="password" autoComplete="new-password" minLength={8} required className="mt-1.5" /></label>
            <Button className="w-full" disabled={busy}>{busy ? "Updating…" : "Update password"}</Button>
          </form>
        ) : resetRequested ? (
          <form onSubmit={requestReset} className="mt-6 space-y-4">
            <label className="block text-sm font-medium">Email address<Input name="email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1.5" /></label>
            <Button className="w-full" disabled={busy}>{busy ? "Sending…" : "Send reset code"}</Button>
            <button type="button" className="w-full text-sm font-medium text-primary hover:underline" onClick={() => setResetRequested(false)}>Back to sign in</button>
          </form>
        ) : verificationPending ? (
          <form onSubmit={verifyEmail} className="mt-6 space-y-4">
            <input name="email" type="hidden" value={email} />
            <label className="block text-sm font-medium">Email verification code<Input name="code" autoComplete="one-time-code" inputMode="numeric" required className="mt-1.5" /></label>
            <Button className="w-full" disabled={busy}>{busy ? "Verifying…" : "Verify email"}</Button>
            <button type="button" className="w-full text-sm font-medium text-primary hover:underline" onClick={() => setVerificationPending(false)}>Back</button>
          </form>
        ) : (
          <form onSubmit={submitCredentials} className="mt-6 space-y-4">
            <label className="block text-sm font-medium">Email address<Input name="email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1.5" /></label>
            <label className="block text-sm font-medium">Password<Input name="password" type="password" autoComplete={flow === "signIn" ? "current-password" : "new-password"} minLength={8} required className="mt-1.5" /></label>
            <Button className="w-full" disabled={busy}>{busy ? "Please wait…" : flow === "signIn" ? "Sign in" : "Create account"}</Button>
            {flow === "signIn" && <button type="button" className="w-full text-sm font-medium text-primary hover:underline" onClick={() => setResetRequested(true)}>Forgot password?</button>}
            <button type="button" className="w-full text-sm font-medium text-primary hover:underline" onClick={() => setFlow(flow === "signIn" ? "signUp" : "signIn")}>{flow === "signIn" ? inviteToken ? "Create an account with this email" : "Create a customer account" : "I already have an account"}</button>
            {inviteToken && <p className="text-xs leading-5 text-muted-foreground">Use the email address that received the store invitation. If needed, create an account with that same address.</p>}
          </form>
        )}
        {message && !inviteAccepted && <p className="mt-4 text-sm text-primary" role="status">{message}</p>}
        {error && <p className="mt-4 text-sm text-destructive" role="alert">{error}</p>}
        <p className="mt-6 border-t pt-4 text-xs leading-5 text-muted-foreground">Guest checkout remains available. Account details and orders are visible only to the signed-in account.</p>
      </section>
    </main>
  );
}
