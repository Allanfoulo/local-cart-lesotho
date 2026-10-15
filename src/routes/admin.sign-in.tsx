import { useAuthActions, useConvexAuth } from "@convex-dev/auth/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMutation, useQuery } from "convex/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";

export const Route = createFileRoute("/admin/sign-in")({
  head: () => ({
    meta: [
      { title: "REETAPELE | Super admin sign in" },
      { name: "description", content: "Sign in to the REETAPELE platform administration account." },
    ],
  }),
  component: AdminSignIn,
});

function AdminSignIn() {
  const { signIn, signOut } = useAuthActions();
  const { isLoading, isAuthenticated } = useConvexAuth();
  const bootstrap = useQuery(api.memberships.bootstrapStatus);
  const claimInitialAdmin = useMutation(api.memberships.claimInitialSuperadmin);
  const [email, setEmail] = useState("");
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [verificationPending, setVerificationPending] = useState(false);
  const [forgotPassword, setForgotPassword] = useState(false);
  const [resetPending, setResetPending] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [claimAttempted, setClaimAttempted] = useState(false);

  useEffect(() => {
    if (
      !isAuthenticated ||
      !bootstrap ||
      bootstrap.isSuperadmin ||
      !bootstrap.initialSetupAvailable ||
      claimAttempted
    ) {
      return;
    }

    setClaimAttempted(true);
    setBusy(true);
    void claimInitialAdmin({})
      .then(() => setMessage("Super admin access is active."))
      .catch((reason: unknown) =>
        setError(reason instanceof Error ? reason.message : "Could not finish admin setup."),
      )
      .finally(() => setBusy(false));
  }, [bootstrap, claimAttempted, claimInitialAdmin, isAuthenticated]);

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
        setMessage("Check your email for a verification code.");
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not sign in.");
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
      setMessage("Email verified. Completing secure admin setup…");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not verify the email code.");
    } finally {
      setBusy(false);
    }
  }

  async function requestPasswordReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const formData = new FormData(event.currentTarget);
      formData.set("flow", "reset");
      await signIn("password", formData);
      setForgotPassword(false);
      setResetPending(true);
      setMessage("If the account is eligible, a password reset code will arrive by email.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not request a password reset.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyPasswordReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const formData = new FormData(event.currentTarget);
      formData.set("flow", "reset-verification");
      await signIn("password", formData);
      setResetPending(false);
      setMessage("Password updated. Signing you in…");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not reset the password.");
    } finally {
      setBusy(false);
    }
  }

  const isSuperadmin = bootstrap?.isSuperadmin ?? false;
  const setupAvailable = bootstrap?.initialSetupAvailable ?? false;

  return (
    <main className="grid min-h-screen place-items-center bg-muted/30 px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
        <Link to="/" className="text-sm font-bold tracking-wide text-primary">
          REETAPELE
        </Link>
        <p className="mt-7 text-sm font-semibold uppercase tracking-[0.14em] text-primary">
          Platform administration
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Super admin sign in</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Use your verified administrator email. New accounts are limited to the initial
          administrator setup.
        </p>

        {isLoading || bootstrap === undefined ? (
          <p className="mt-6 text-sm text-muted-foreground" role="status">
            Checking secure sign-in…
          </p>
        ) : isSuperadmin ? (
          <div className="mt-6 space-y-4">
            <p
              className="rounded-lg bg-emerald-50 p-4 text-sm font-medium text-emerald-900"
              role="status"
            >
              Super admin access is active.
            </p>
            <Button variant="outline" className="w-full" onClick={() => void signOut()}>
              Sign out
            </Button>
          </div>
        ) : isAuthenticated && !setupAvailable ? (
          <div className="mt-6 space-y-4">
            <p className="rounded-lg border p-4 text-sm text-muted-foreground" role="status">
              This account does not have platform administrator access.
            </p>
            <Button variant="outline" className="w-full" onClick={() => void signOut()}>
              Sign out
            </Button>
          </div>
        ) : resetPending ? (
          <form onSubmit={verifyPasswordReset} className="mt-6 space-y-4">
            <input name="email" type="hidden" value={email} />
            <label className="block text-sm font-medium">
              Password reset code
              <Input
                name="code"
                autoComplete="one-time-code"
                inputMode="numeric"
                required
                className="mt-1.5"
              />
            </label>
            <label className="block text-sm font-medium">
              New password
              <Input
                name="newPassword"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                className="mt-1.5"
              />
            </label>
            <Button className="w-full" disabled={busy}>
              {busy ? "Updating…" : "Update password"}
            </Button>
          </form>
        ) : forgotPassword ? (
          <form onSubmit={requestPasswordReset} className="mt-6 space-y-4">
            <label className="block text-sm font-medium">
              Email address
              <Input
                name="email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-1.5"
              />
            </label>
            <Button className="w-full" disabled={busy}>
              {busy ? "Requesting…" : "Send reset code"}
            </Button>
            <button
              type="button"
              className="w-full text-sm font-medium text-primary hover:underline"
              onClick={() => setForgotPassword(false)}
            >
              Back to sign in
            </button>
          </form>
        ) : verificationPending ? (
          <form onSubmit={verifyEmail} className="mt-6 space-y-4">
            <input name="email" type="hidden" value={email} />
            <label className="block text-sm font-medium">
              Email verification code
              <Input
                name="code"
                autoComplete="one-time-code"
                inputMode="numeric"
                required
                className="mt-1.5"
              />
            </label>
            <Button className="w-full" disabled={busy}>
              {busy ? "Verifying…" : "Verify email"}
            </Button>
          </form>
        ) : (
          <>
            {!bootstrap.initialSetupConfigured && !isAuthenticated && (
              <p className="mt-5 rounded-lg border p-3 text-sm text-muted-foreground" role="status">
                First account setup is waiting for the deployment email settings. Existing admin
                accounts can still sign in.
              </p>
            )}
            <form onSubmit={submitCredentials} className="mt-6 space-y-4">
              <label className="block text-sm font-medium">
                Email address
                <Input
                  name="email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-1.5"
                />
              </label>
              <label className="block text-sm font-medium">
                Password
                <Input
                  name="password"
                  type="password"
                  autoComplete={flow === "signIn" ? "current-password" : "new-password"}
                  minLength={8}
                  required
                  className="mt-1.5"
                />
              </label>
              <Button className="w-full" disabled={busy}>
                {busy
                  ? "Please wait…"
                  : flow === "signIn"
                    ? "Sign in"
                    : "Create initial admin account"}
              </Button>
              {flow === "signIn" && (
                <button
                  type="button"
                  className="w-full text-sm font-medium text-primary hover:underline"
                  onClick={() => setForgotPassword(true)}
                >
                  Forgot password?
                </button>
              )}
              {setupAvailable && (
                <button
                  type="button"
                  className="w-full text-sm font-medium text-primary hover:underline"
                  onClick={() => setFlow(flow === "signIn" ? "signUp" : "signIn")}
                >
                  {flow === "signIn"
                    ? "Set up the first admin account"
                    : "I already have an account"}
                </button>
              )}
            </form>
          </>
        )}

        {message && (
          <p className="mt-4 text-sm text-primary" role="status">
            {message}
          </p>
        )}
        {error && (
          <p className="mt-4 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        <p className="mt-6 border-t pt-4 text-xs leading-5 text-muted-foreground">
          Passwords and verification codes are handled by Convex Auth. Never share your password or
          code.
        </p>
      </section>
    </main>
  );
}
