"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { User } from "firebase/auth";
import { signOut } from "firebase/auth";
import { ArrowDownRight, ArrowUpRight, Loader2, LogOut, Menu, Plus, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { createGroupSchema, renameGroupSchema, type CreateGroupInput, type RenameGroupInput } from "@/features/groups/schemas";
import { inviteUserSchema, type InviteUserInput } from "@/features/invitations/schemas";
import { createTransactionSchema, type CreateTransactionInput } from "@/features/transactions/schemas";
import {
  useAcceptInvitation,
  useCreateGroup,
  useCreateTransaction,
  useDashboardData,
  useInviteUser,
  useRenameGroup,
} from "@/hooks/use-dashboard-data";
import { firebaseAuth } from "@/lib/firebase/client";
import { formatCurrency, formatDateTime } from "@/lib/format";

export function DashboardShell() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>(undefined);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [quickAmount, setQuickAmount] = useState("");
  const [quickCategory, setQuickCategory] = useState("");
  const [quickVisibility, setQuickVisibility] = useState<"shared" | "personal">("shared");
  const [selectedAnalyticsMonth, setSelectedAnalyticsMonth] = useState<string>("all");

  const dashboardQuery = useDashboardData(selectedGroupId, authReady && Boolean(currentUser));
  const effectiveGroupId = selectedGroupId ?? dashboardQuery.data?.selectedGroupId ?? undefined;

  const createGroupMutation = useCreateGroup();
  const renameGroupMutation = useRenameGroup();
  const inviteUserMutation = useInviteUser();
  const acceptInvitationMutation = useAcceptInvitation();
  const createTransactionMutation = useCreateTransaction();

  const activeGroup = useMemo(
    () => dashboardQuery.data?.groups.find((group) => group.id === effectiveGroupId),
    [dashboardQuery.data, effectiveGroupId]
  );

  const groupForm = useForm<CreateGroupInput>({
    resolver: zodResolver(createGroupSchema),
    defaultValues: {
      name: "",
    },
  });

  const renameForm = useForm<RenameGroupInput>({
    resolver: zodResolver(renameGroupSchema),
    defaultValues: {
      groupId: "",
      name: "",
    },
  });

  const inviteForm = useForm<InviteUserInput>({
    resolver: zodResolver(inviteUserSchema),
    defaultValues: {
      groupId: effectiveGroupId,
      invitedEmail: "",
    },
  });

  const transactionForm = useForm<CreateTransactionInput>({
    resolver: zodResolver(createTransactionSchema),
    defaultValues: {
      groupId: effectiveGroupId,
      type: "expense",
      visibility: "shared",
      amount: 0,
      category: "",
      note: "",
    },
  });

  useEffect(() => {
    const unsubscribe = firebaseAuth.onAuthStateChanged((user) => {
      setCurrentUser(user);
      setAuthReady(true);

      if (!user) {
        router.replace("/sign-in");
      }
    });

    return unsubscribe;
  }, [router]);

  useEffect(() => {
    if (effectiveGroupId) {
      inviteForm.setValue("groupId", effectiveGroupId);
      transactionForm.setValue("groupId", effectiveGroupId);
      renameForm.setValue("groupId", effectiveGroupId);
      if (activeGroup?.name) {
        renameForm.setValue("name", activeGroup.name);
      }
    }
  }, [activeGroup?.name, effectiveGroupId, inviteForm, renameForm, transactionForm]);

  const onCreateGroup = groupForm.handleSubmit(async (values) => {
    try {
      const result = await createGroupMutation.mutateAsync(values);
      setSelectedGroupId(result.id);
      setIsGroupDialogOpen(false);
      groupForm.reset();
      toast.success("Group created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create group");
    }
  });

  const onRenameGroup = renameForm.handleSubmit(async (values) => {
    try {
      await renameGroupMutation.mutateAsync(values);
      setIsRenameDialogOpen(false);
      toast.success("Group renamed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to rename group");
    }
  });

  const onInviteUser = inviteForm.handleSubmit(async (values) => {
    try {
      await inviteUserMutation.mutateAsync(values);
      setIsInviteDialogOpen(false);
      inviteForm.reset({ groupId: effectiveGroupId, invitedEmail: "" });
      toast.success("Invitation sent");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send invitation");
    }
  });

  const onCreateTransaction = transactionForm.handleSubmit(async (values) => {
    try {
      await createTransactionMutation.mutateAsync(values);
      setIsTransactionDialogOpen(false);
      transactionForm.reset({
        groupId: effectiveGroupId,
        type: values.type,
        visibility: values.visibility,
        amount: 0,
        category: "",
        note: "",
      });
      toast.success(`${values.type === "income" ? "Income" : "Expense"} added`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save transaction");
    }
  });

  const handleQuickAdd = async (type: "income" | "expense") => {
    if (!effectiveGroupId) {
      toast.error("Create or select a group first");
      return;
    }

    const parsedAmount = Number(quickAmount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error("Enter a valid amount in INR");
      return;
    }

    if (quickCategory.trim().length < 2) {
      toast.error("Enter a category");
      return;
    }

    try {
      await createTransactionMutation.mutateAsync({
        groupId: effectiveGroupId,
        type,
        visibility: quickVisibility,
        amount: parsedAmount,
        category: quickCategory,
        note: "",
      });
      setQuickAmount("");
      setQuickCategory("");
      toast.success(`${type === "income" ? "Income" : "Expense"} added`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save transaction");
    }
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);

    try {
      await signOut(firebaseAuth);
      router.replace("/sign-in");
    } catch {
      toast.error("Failed to sign out.");
    } finally {
      setIsSigningOut(false);
    }
  };

  if (!authReady || !currentUser || dashboardQuery.isLoading) {
    return <DashboardLoadingState />;
  }

  if (dashboardQuery.isError || !dashboardQuery.data) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Unable to load dashboard</CardTitle>
            <CardDescription>Please refresh the page and try again.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => dashboardQuery.refetch()}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const data = dashboardQuery.data;

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 via-zinc-50 to-white">
      <div className="mx-auto flex w-full max-w-7xl gap-4 p-4 md:p-6">
        <aside className="hidden w-72 shrink-0 rounded-3xl border bg-white/90 p-4 md:block">
          <SidebarContent
            selectedGroupId={effectiveGroupId}
            onSelectGroup={setSelectedGroupId}
            groups={data.groups}
            onOpenCreateGroup={() => setIsGroupDialogOpen(true)}
            onOpenRenameGroup={() => setIsRenameDialogOpen(true)}
          />
        </aside>

        <main className="flex min-w-0 flex-1 flex-col gap-4">
          <header className="flex items-center justify-between rounded-2xl border bg-white/90 p-3">
            <div className="flex items-center gap-2">
              <Dialog open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="icon" className="md:hidden">
                    <Menu className="size-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-sm p-4">
                  <SidebarContent
                    selectedGroupId={effectiveGroupId}
                    onSelectGroup={(groupId) => {
                      setSelectedGroupId(groupId);
                      setIsMobileSidebarOpen(false);
                    }}
                    groups={data.groups}
                    onOpenCreateGroup={() => {
                      setIsMobileSidebarOpen(false);
                      setIsGroupDialogOpen(true);
                    }}
                    onOpenRenameGroup={() => {
                      setIsMobileSidebarOpen(false);
                      setIsRenameDialogOpen(true);
                    }}
                  />
                </DialogContent>
              </Dialog>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">FinTrack</p>
                <h1 className="text-lg font-semibold">Dashboard</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="hidden md:inline-flex"
                onClick={() => setIsInviteDialogOpen(true)}
                disabled={!effectiveGroupId}
              >
                <Users className="size-4" />
                Invite
              </Button>
              <Dialog open={isTransactionDialogOpen} onOpenChange={setIsTransactionDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="lg">
                    <Plus className="size-4" />
                    <span className="sr-only sm:not-sr-only">Quick Add</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add transaction</DialogTitle>
                    <DialogDescription>Add shared or personal income and expenses.</DialogDescription>
                  </DialogHeader>
                  <form className="space-y-4" onSubmit={onCreateTransaction}>
                    <div className="space-y-2">
                      <Label htmlFor="type">Type</Label>
                      <Controller
                        control={transactionForm.control}
                        name="type"
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger id="type">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="income">Income</SelectItem>
                              <SelectItem value="expense">Expense</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="visibility">Visibility</Label>
                      <Controller
                        control={transactionForm.control}
                        name="visibility"
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger id="visibility">
                              <SelectValue placeholder="Select visibility" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="shared">Shared</SelectItem>
                              <SelectItem value="personal">Personal</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="amount">Amount (INR)</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        {...transactionForm.register("amount", {
                          setValueAs: (value) => Number(value),
                        })}
                      />
                      <p className="text-xs text-destructive">{transactionForm.formState.errors.amount?.message}</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <Input id="category" placeholder="Salary, Rent, Groceries" {...transactionForm.register("category")} />
                      <p className="text-xs text-destructive">{transactionForm.formState.errors.category?.message}</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="note">Note</Label>
                      <Textarea id="note" placeholder="Optional note" {...transactionForm.register("note")} />
                    </div>
                    <Button className="w-full" disabled={createTransactionMutation.isPending || !effectiveGroupId}>
                      {createTransactionMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                      Save transaction
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
              <div className="hidden items-center gap-2 rounded-xl border px-2 py-1 sm:flex">
                <div className="flex size-8 items-center justify-center rounded-full bg-zinc-200 text-xs font-semibold text-zinc-700">
                  {(currentUser.displayName?.[0] ?? currentUser.email?.[0] ?? "U").toUpperCase()}
                </div>
                <p className="max-w-40 truncate text-sm text-muted-foreground">{currentUser.email}</p>
              </div>
              <Button variant="outline" onClick={handleSignOut} disabled={isSigningOut}>
                {isSigningOut ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
                  <span className="sr-only sm:not-sr-only">Logout</span>
              </Button>
            </div>
          </header>

          <Card className="bg-white/90">
            <CardHeader className="pb-3">
              <CardTitle>Quick add in INR</CardTitle>
              <CardDescription>Add income or expense in one step.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-[1fr_1fr_180px_auto_auto]">
              <div className="space-y-2">
                <Label htmlFor="quickAmount">Amount (INR)</Label>
                <Input
                  id="quickAmount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={quickAmount}
                  onChange={(event) => setQuickAmount(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quickCategory">Category</Label>
                <Input
                  id="quickCategory"
                  placeholder="Food, Salary, Rent"
                  value={quickCategory}
                  onChange={(event) => setQuickCategory(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quickVisibility">Visibility</Label>
                <Select value={quickVisibility} onValueChange={(value) => setQuickVisibility(value as "shared" | "personal")}>
                  <SelectTrigger id="quickVisibility">
                    <SelectValue placeholder="Visibility" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="shared">Shared</SelectItem>
                    <SelectItem value="personal">Personal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="mt-auto"
                variant="outline"
                onClick={() => handleQuickAdd("expense")}
                disabled={createTransactionMutation.isPending || !effectiveGroupId}
              >
                {createTransactionMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                Add Expense
              </Button>
              <Button
                className="mt-auto"
                onClick={() => handleQuickAdd("income")}
                disabled={createTransactionMutation.isPending || !effectiveGroupId}
              >
                {createTransactionMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                Add Income
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-white/90">
            <CardHeader>
              <CardTitle>Spending analytics</CardTitle>
              <CardDescription>Monthly expense totals by person and category.</CardDescription>
            </CardHeader>
            <CardContent>
              {data.analytics.months.length === 0 ? (
                <p className="text-sm text-muted-foreground">No expense data yet.</p>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="analyticsMonthFilter" className="shrink-0">View month:</Label>
                    <Select value={selectedAnalyticsMonth} onValueChange={setSelectedAnalyticsMonth}>
                      <SelectTrigger id="analyticsMonthFilter" className="w-48">
                        <SelectValue placeholder="Select month" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All months</SelectItem>
                        {data.analytics.months.map((month) => (
                          <SelectItem key={month.monthKey} value={month.monthKey}>
                            {month.monthLabel}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {data.analytics.months
                    .filter((month) => selectedAnalyticsMonth === "all" || month.monthKey === selectedAnalyticsMonth)
                    .map((month) => (
                    <div key={month.monthKey} className="rounded-2xl border p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold">{month.monthLabel}</p>
                          <p className="text-xs text-muted-foreground">Total spent</p>
                        </div>
                        <p className="text-lg font-semibold">{formatCurrency(month.total)}</p>
                      </div>

                      <div className="mt-4 grid gap-3 lg:grid-cols-2">
                        <div>
                          <p className="mb-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">By person</p>
                          <div className="space-y-2">
                            {month.spenders.map((spender) => (
                              <div key={spender.userId} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm">
                                <span className="truncate">{spender.userDisplayName}</span>
                                <span className="font-medium">{formatCurrency(spender.total)}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <p className="mb-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">By category</p>
                          <div className="space-y-2">
                            {month.categories.map((category) => (
                              <div key={category.category} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm">
                                <span className="truncate">{category.category}</span>
                                <span className="font-medium">{formatCurrency(category.total)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {data.groups.length === 0 ? (
            <div className="space-y-4">
              <Card className="border-dashed bg-white/80">
                <CardHeader>
                  <CardTitle>Create your first group</CardTitle>
                  <CardDescription>Groups let couples or roommates track shared transactions together.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={() => setIsGroupDialogOpen(true)}>Create Group</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Pending invitations</CardTitle>
                  <CardDescription>Accept invites sent to your email.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {data.pendingInvitations.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No pending invitations.</p>
                  ) : (
                    data.pendingInvitations.map((invitation) => (
                      <div key={invitation.id} className="rounded-xl border p-3">
                        <p className="text-sm font-medium">{invitation.groupName}</p>
                        <p className="text-xs text-muted-foreground">Invited on {formatDateTime(invitation.createdAt)}</p>
                        <Button
                          className="mt-3 w-full"
                          onClick={async () => {
                            try {
                              await acceptInvitationMutation.mutateAsync({ invitationId: invitation.id });
                              toast.success("Invitation accepted");
                            } catch (error) {
                              toast.error(error instanceof Error ? error.message : "Failed to accept invitation");
                            }
                          }}
                          disabled={acceptInvitationMutation.isPending}
                        >
                          {acceptInvitationMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                          Accept invitation
                        </Button>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <>
              <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryCard title="Shared Income" amount={data.summary.sharedIncome} accent="income" />
                <SummaryCard title="Shared Expense" amount={data.summary.sharedExpense} accent="expense" />
                <SummaryCard title="Personal Income" amount={data.summary.personalIncome} accent="default" />
                <SummaryCard title="Personal Expense" amount={data.summary.personalExpense} accent="default" />
              </section>

              <section className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent transactions</CardTitle>
                    <CardDescription>Shared and personal activity in this group.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {data.recentTransactions.length === 0 ? (
                      <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                        No transactions yet. Add your first income or expense.
                      </div>
                    ) : (
                      data.recentTransactions.map((transaction) => (
                        <div key={transaction.id} className="rounded-xl border p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <Badge variant={transaction.type === "income" ? "income" : "expense"}>{transaction.type}</Badge>
                              <Badge variant={transaction.visibility === "shared" ? "shared" : "personal"}>
                                {transaction.visibility}
                              </Badge>
                            </div>
                            <p className="text-sm font-semibold">{formatCurrency(transaction.amount)}</p>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                            <span>{transaction.category}</span>
                            <span>•</span>
                            <span>{transaction.userDisplayName}</span>
                            <span>•</span>
                            <span>{formatDateTime(transaction.createdAt)}</span>
                          </div>
                          {transaction.note ? <p className="mt-2 text-sm">{transaction.note}</p> : null}
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Group members</CardTitle>
                      <CardDescription>{activeGroup?.name ?? "Select a group"}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {activeGroup?.members.map((member) => (
                        <div key={member.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                          <p className="text-sm font-medium">{member.fullName ?? member.id}</p>
                          <Badge variant="outline">{member.role}</Badge>
                        </div>
                      ))}
                      {!activeGroup?.members.length ? <p className="text-sm text-muted-foreground">No members yet.</p> : null}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Pending invitations</CardTitle>
                      <CardDescription>Accept invites sent to your email.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {data.pendingInvitations.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No pending invitations.</p>
                      ) : (
                        data.pendingInvitations.map((invitation) => (
                          <div key={invitation.id} className="rounded-xl border p-3">
                            <p className="text-sm font-medium">{invitation.groupName}</p>
                            <p className="text-xs text-muted-foreground">Invited on {formatDateTime(invitation.createdAt)}</p>
                            <Button
                              className="mt-3 w-full"
                              onClick={async () => {
                                try {
                                  await acceptInvitationMutation.mutateAsync({ invitationId: invitation.id });
                                  toast.success("Invitation accepted");
                                } catch (error) {
                                  toast.error(error instanceof Error ? error.message : "Failed to accept invitation");
                                }
                              }}
                              disabled={acceptInvitationMutation.isPending}
                            >
                              {acceptInvitationMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                              Accept invitation
                            </Button>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                </div>
              </section>
            </>
          )}
        </main>
      </div>

      <Dialog open={isGroupDialogOpen} onOpenChange={setIsGroupDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create group</DialogTitle>
            <DialogDescription>Start tracking with your partner, roommate, or small group.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={onCreateGroup}>
            <div className="space-y-2">
              <Label htmlFor="groupName">Group name</Label>
              <Input id="groupName" placeholder="Home Budget" {...groupForm.register("name")} />
              <p className="text-xs text-destructive">{groupForm.formState.errors.name?.message}</p>
            </div>
            <Button className="w-full" disabled={createGroupMutation.isPending}>
              {createGroupMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Create group
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename group</DialogTitle>
            <DialogDescription>Only owners can rename groups.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={onRenameGroup}>
            <div className="space-y-2">
              <Label htmlFor="renameGroup">Group name</Label>
              <Input id="renameGroup" placeholder="New group name" {...renameForm.register("name")} />
              <p className="text-xs text-destructive">{renameForm.formState.errors.name?.message}</p>
            </div>
            <Button className="w-full" disabled={renameGroupMutation.isPending || !effectiveGroupId}>
              {renameGroupMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Save name
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite member</DialogTitle>
            <DialogDescription>Send an invite by email to join this group.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={onInviteUser}>
            <div className="space-y-2">
              <Label htmlFor="invitedEmail">Email address</Label>
              <Input id="invitedEmail" type="email" placeholder="friend@email.com" {...inviteForm.register("invitedEmail")} />
              <p className="text-xs text-destructive">{inviteForm.formState.errors.invitedEmail?.message}</p>
            </div>
            <Button className="w-full" disabled={inviteUserMutation.isPending || !effectiveGroupId}>
              {inviteUserMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Send invitation
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <div className="fixed bottom-4 right-4 z-40 md:hidden">
        <Button size="lg" onClick={() => setIsInviteDialogOpen(true)} disabled={!effectiveGroupId}>
          <Users className="size-4" />
          Invite
        </Button>
      </div>
    </div>
  );
}

type SidebarContentProps = {
  groups: Array<{
    id: string;
    name: string;
    role: "owner" | "member";
  }>;
  selectedGroupId?: string;
  onSelectGroup: (groupId: string) => void;
  onOpenCreateGroup: () => void;
  onOpenRenameGroup: () => void;
};

function SidebarContent({ groups, selectedGroupId, onSelectGroup, onOpenCreateGroup, onOpenRenameGroup }: SidebarContentProps) {
  return (
    <div className="flex h-full flex-col gap-4">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Groups</p>
        <p className="text-sm text-muted-foreground">Switch between shared spaces</p>
      </div>

      <div className="space-y-2">
        {groups.map((group) => (
          <button
            key={group.id}
            type="button"
            className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
              selectedGroupId === group.id ? "border-primary bg-primary/5" : "hover:bg-muted"
            }`}
            onClick={() => onSelectGroup(group.id)}
          >
            <p className="font-medium">{group.name}</p>
            <p className="text-xs text-muted-foreground">{group.role}</p>
          </button>
        ))}
      </div>

      <div className="mt-auto space-y-2">
        <Button className="w-full" onClick={onOpenCreateGroup}>
          <Plus className="size-4" />
          New Group
        </Button>
        <Button variant="outline" className="w-full" onClick={onOpenRenameGroup} disabled={!selectedGroupId}>
          Rename Group
        </Button>
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  amount,
  accent,
}: {
  title: string;
  amount: number;
  accent: "income" | "expense" | "default";
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-between">
        <p className="text-2xl font-semibold tracking-tight">{formatCurrency(amount)}</p>
        {accent === "income" ? (
          <ArrowUpRight className="size-5 text-emerald-600" />
        ) : accent === "expense" ? (
          <ArrowDownRight className="size-5 text-rose-600" />
        ) : null}
      </CardContent>
    </Card>
  );
}

function DashboardLoadingState() {
  return (
    <div className="min-h-screen bg-zinc-50 p-4 md:p-6">
      <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-[18rem_1fr]">
        <Skeleton className="hidden h-[70vh] rounded-2xl md:block" />
        <div className="space-y-4">
          <Skeleton className="h-16 rounded-2xl" />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
          </div>
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
