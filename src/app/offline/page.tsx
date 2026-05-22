export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">You are offline</h1>
      <p className="text-muted-foreground">
        FinTrack cannot reach the network right now. Reconnect to continue syncing balances,
        transactions, and invitations.
      </p>
    </main>
  );
}
