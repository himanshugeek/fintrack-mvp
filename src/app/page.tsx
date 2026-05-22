import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-zinc-50 px-6 py-12 dark:bg-black">
      <main className="w-full max-w-3xl rounded-2xl border border-border bg-card p-8 sm:p-12">
        <div className="flex flex-col gap-6 text-center sm:text-left">
          <div className="space-y-3">
            <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Fintrack MVP</p>
            <h1 className="text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
              Sign in to manage your finances.
            </h1>
            <p className="text-base text-muted-foreground sm:text-lg">
              Use Clerk auth to create your first account, then return here to continue building your dashboard.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-start">
            <Show when="signed-out">
              <SignInButton mode="modal">
                <Button size="lg" variant="outline">Sign in</Button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button size="lg">Sign up</Button>
              </SignUpButton>
            </Show>

            <Show when="signed-in">
              <div className="flex items-center gap-3 rounded-full border border-border bg-background px-3 py-2">
                <span className="text-sm text-muted-foreground">Signed in</span>
                <UserButton />
              </div>
            </Show>
          </div>
        </div>
      </main>
    </div>
  );
}
