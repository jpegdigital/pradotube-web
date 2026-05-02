export default function ForbiddenPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-md text-center">
        <p className="font-body text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          403
        </p>
        <h1 className="mt-3 font-heading text-3xl text-foreground">
          Not allowed
        </h1>
        <p className="mt-3 font-body text-muted-foreground">
          Your account does not have access to this page.
        </p>
      </div>
    </main>
  );
}
