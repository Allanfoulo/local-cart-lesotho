import { Button } from "@/components/ui/button";

export function WorkspaceChoice({
  email,
  onAccount,
  onStaff,
}: {
  email?: string | null;
  onAccount: () => void;
  onStaff: () => void;
}) {
  return (
    <main className="grid min-h-screen place-items-center bg-muted/30 px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
        <p className="text-sm font-bold tracking-wide text-primary">REETAPELE</p>
        <p className="mt-7 text-sm font-semibold uppercase tracking-[0.14em] text-primary">
          Workspace access
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Where would you like to go?</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Are you going to your account, or into staff?
        </p>
        {email && <p className="mt-4 text-sm text-muted-foreground">Signed in as {email}</p>}
        <div className="mt-6 grid gap-3">
          <Button type="button" onClick={onAccount}>My account</Button>
          <Button type="button" variant="outline" onClick={onStaff}>Staff workspace</Button>
        </div>
      </section>
    </main>
  );
}

export function WorkspaceVerificationError({ onSignOut }: { onSignOut: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center bg-muted/30 px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
        <p className="text-sm font-bold tracking-wide text-primary">REETAPELE</p>
        <h1 className="mt-7 text-2xl font-bold tracking-tight">Could not verify workspace access</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          We couldn’t match this sign-in to an account and its active memberships. Sign out and try
          again with the email address connected to your account.
        </p>
        <Button type="button" variant="outline" className="mt-6 w-full" onClick={onSignOut}>
          Sign out
        </Button>
      </section>
    </main>
  );
}
