import { and, desc, eq, inArray, or, sql } from "drizzle-orm";

import { db } from "@/db/client";
import { groupMembers, groups, invitations, profiles, transactions } from "@/db/schema";
import type {
  AnalyticsMonth,
  DashboardData,
  GroupView,
  InvitationView,
  TransactionAnalytics,
  TransactionView,
} from "@/types/domain";

type DbErrorShape = {
  name?: string;
  message?: string;
  code?: string;
  detail?: string;
  hint?: string;
  severity?: string;
  table_name?: string;
  schema_name?: string;
  column_name?: string;
  constraint_name?: string;
  where?: string;
  routine?: string;
  cause?: unknown;
};

function getDbErrorChain(error: unknown, maxDepth = 6): DbErrorShape[] {
  const chain: DbErrorShape[] = [];
  let current: unknown = error;
  let depth = 0;

  while (current && depth < maxDepth) {
    if (typeof current !== "object") {
      chain.push({ message: String(current) });
      break;
    }

    const entry = current as DbErrorShape;
    chain.push({
      name: entry.name,
      message: entry.message,
      code: entry.code,
      detail: entry.detail,
      hint: entry.hint,
      severity: entry.severity,
      table_name: entry.table_name,
      schema_name: entry.schema_name,
      column_name: entry.column_name,
      constraint_name: entry.constraint_name,
      where: entry.where,
      routine: entry.routine,
    });

    current = entry.cause;
    depth += 1;
  }

  return chain;
}

export async function ensureProfile(userId: string, fullName?: string | null, avatarUrl?: string | null) {
  try {
    await db
      .insert(profiles)
      .values({
        id: userId,
        fullName: fullName ?? null,
        avatarUrl: avatarUrl ?? null,
      })
      .onConflictDoUpdate({
        target: profiles.id,
        set: {
          fullName: fullName ?? null,
          avatarUrl: avatarUrl ?? null,
        },
      });
  } catch (error) {
    const errorChain = getDbErrorChain(error);
    const dbError =
      errorChain.find((entry) => Boolean(entry.code || entry.detail || entry.severity || entry.hint)) ??
      errorChain[0] ??
      {};

    console.error("[db:ensureProfile] upsert failed", {
      userId,
      fullName,
      avatarUrl,
      message: dbError.message,
      code: dbError.code,
      detail: dbError.detail,
      hint: dbError.hint,
      constraint: dbError.constraint_name,
      table: dbError.table_name,
      schema: dbError.schema_name,
      severity: dbError.severity,
      column: dbError.column_name,
      where: dbError.where,
      routine: dbError.routine,
      errorChain,
    });

    throw error;
  }
}

export async function getGroupsForUser(userId: string): Promise<GroupView[]> {
  const memberships = await db
    .select({ groupId: groupMembers.groupId, role: groupMembers.role })
    .from(groupMembers)
    .where(eq(groupMembers.userId, userId));

  const groupIds = memberships.map((membership) => membership.groupId);

  if (groupIds.length === 0) {
    return [];
  }

  const rows = await db
    .select({
      groupId: groups.id,
      groupName: groups.name,
      createdAt: groups.createdAt,
      memberUserId: groupMembers.userId,
      memberRole: groupMembers.role,
      memberName: profiles.fullName,
    })
    .from(groupMembers)
    .innerJoin(groups, eq(groups.id, groupMembers.groupId))
    .leftJoin(profiles, eq(profiles.id, groupMembers.userId))
    .where(inArray(groupMembers.groupId, groupIds))
    .orderBy(groups.createdAt);

  const grouped = new Map<string, GroupView>();

  for (const row of rows) {
    const userMembership = memberships.find((membership) => membership.groupId === row.groupId);
    const existing = grouped.get(row.groupId);
    if (!existing) {
      grouped.set(row.groupId, {
        id: row.groupId,
        name: row.groupName,
        role: userMembership?.role ?? "member",
        createdAt: row.createdAt.toISOString(),
        members: [
          {
            id: row.memberUserId,
            role: row.memberRole,
            fullName: row.memberName,
          },
        ],
      });
      continue;
    }

    existing.members.push({
      id: row.memberUserId,
      role: row.memberRole,
      fullName: row.memberName,
    });
  }

  return Array.from(grouped.values());
}

export async function createGroupForUser(userId: string, name: string) {
  const [group] = await db
    .insert(groups)
    .values({
      name,
      createdBy: userId,
    })
    .returning({ id: groups.id });

  await db.insert(groupMembers).values({
    groupId: group.id,
    userId,
    role: "owner",
  });

  return group;
}

export async function renameGroupForUser(userId: string, groupId: string, name: string) {
  const [membership] = await db
    .select({ role: groupMembers.role })
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)));

  if (!membership || membership.role !== "owner") {
    throw new Error("Only group owners can rename the group.");
  }

  await db.update(groups).set({ name }).where(eq(groups.id, groupId));
}

export async function createInvitation(userId: string, groupId: string, invitedEmail: string) {
  const normalizedEmail = invitedEmail.trim().toLowerCase();

  const [membership] = await db
    .select({ id: groupMembers.id })
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)));

  if (!membership) {
    throw new Error("You are not a member of this group.");
  }

  const [existingPending] = await db
    .select({ id: invitations.id })
    .from(invitations)
    .where(
      and(
        eq(invitations.groupId, groupId),
        eq(invitations.invitedEmail, normalizedEmail),
        eq(invitations.status, "pending")
      )
    );

  if (existingPending) {
    throw new Error("A pending invitation already exists for this email.");
  }

  await db.insert(invitations).values({
    groupId,
    invitedBy: userId,
    invitedEmail: normalizedEmail,
    status: "pending",
  });
}

export async function acceptInvitation(userId: string, email: string, invitationId: string) {
  const [invitation] = await db
    .select({
      id: invitations.id,
      groupId: invitations.groupId,
      invitedEmail: invitations.invitedEmail,
      status: invitations.status,
    })
    .from(invitations)
    .where(eq(invitations.id, invitationId));

  if (!invitation || invitation.status !== "pending") {
    throw new Error("Invitation is no longer available.");
  }

  if (invitation.invitedEmail.toLowerCase() !== email.trim().toLowerCase()) {
    throw new Error("This invitation was sent to a different email address.");
  }

  await db.insert(groupMembers).values({
    groupId: invitation.groupId,
    userId,
    role: "member",
  }).onConflictDoNothing();

  await db.update(invitations).set({ status: "accepted" }).where(eq(invitations.id, invitationId));
}

export async function createTransactionForUser(input: {
  userId: string;
  groupId: string;
  type: "income" | "expense";
  visibility: "personal" | "shared";
  amount: number;
  category: string;
  note?: string;
}) {
  const [membership] = await db
    .select({ id: groupMembers.id })
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, input.groupId), eq(groupMembers.userId, input.userId)));

  if (!membership) {
    throw new Error("You can only add transactions to your groups.");
  }

  await db.insert(transactions).values({
    groupId: input.groupId,
    userId: input.userId,
    type: input.type,
    visibility: input.visibility,
    amount: input.amount.toFixed(2),
    category: input.category.trim(),
    note: input.note?.trim() ? input.note.trim() : null,
  });
}

export async function updateTransactionForUser(input: {
  userId: string;
  transactionId: string;
  type: "income" | "expense";
  visibility: "personal" | "shared";
  amount: number;
  category: string;
  note?: string;
}) {
  const [transaction] = await db
    .select({
      id: transactions.id,
      groupId: transactions.groupId,
      userId: transactions.userId,
    })
    .from(transactions)
    .where(eq(transactions.id, input.transactionId));

  if (!transaction) {
    throw new Error("Transaction not found.");
  }

  const [membership] = await db
    .select({ id: groupMembers.id })
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, transaction.groupId), eq(groupMembers.userId, input.userId)));

  if (!membership || transaction.userId !== input.userId) {
    throw new Error("You can only update your own transactions.");
  }

  await db
    .update(transactions)
    .set({
      type: input.type,
      visibility: input.visibility,
      amount: input.amount.toFixed(2),
      category: input.category.trim(),
      note: input.note?.trim() ? input.note.trim() : null,
    })
    .where(eq(transactions.id, input.transactionId));
}

export async function deleteTransactionForUser(userId: string, transactionId: string) {
  const [transaction] = await db
    .select({
      id: transactions.id,
      groupId: transactions.groupId,
      userId: transactions.userId,
    })
    .from(transactions)
    .where(eq(transactions.id, transactionId));

  if (!transaction) {
    throw new Error("Transaction not found.");
  }

  const [membership] = await db
    .select({ id: groupMembers.id })
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, transaction.groupId), eq(groupMembers.userId, userId)));

  if (!membership || transaction.userId !== userId) {
    throw new Error("You can only delete your own transactions.");
  }

  await db.delete(transactions).where(eq(transactions.id, transactionId));
}

export async function getPendingInvitationsByEmail(email: string): Promise<InvitationView[]> {
  const rows = await db
    .select({
      id: invitations.id,
      groupId: invitations.groupId,
      groupName: groups.name,
      invitedEmail: invitations.invitedEmail,
      status: invitations.status,
      createdAt: invitations.createdAt,
    })
    .from(invitations)
    .innerJoin(groups, eq(groups.id, invitations.groupId))
    .where(and(eq(invitations.invitedEmail, email.trim().toLowerCase()), eq(invitations.status, "pending")))
    .orderBy(desc(invitations.createdAt));

  return rows.map((row) => ({
    id: row.id,
    groupId: row.groupId,
    groupName: row.groupName,
    invitedEmail: row.invitedEmail,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function getDashboardData(userId: string, email: string, selectedGroupId?: string): Promise<DashboardData> {
  const groupsForUser = await getGroupsForUser(userId);
  const activeGroupId = selectedGroupId ?? groupsForUser[0]?.id ?? null;

  const pendingInvitations = await getPendingInvitationsByEmail(email);

  if (!activeGroupId) {
    return {
      selectedGroupId: null,
      groups: groupsForUser,
      pendingInvitations,
      analytics: { months: [] },
      summary: {
        sharedIncome: 0,
        sharedExpense: 0,
        personalIncome: 0,
        personalExpense: 0,
      },
      memberBalances: [],
      recentTransactions: [],
    };
  }

  const [summaryRow] = await db
    .select({
      sharedIncome: sql<string>`coalesce(sum(case when ${transactions.type} = 'income' and ${transactions.visibility} = 'shared' then ${transactions.amount} else 0 end), 0)`,
      sharedExpense: sql<string>`coalesce(sum(case when ${transactions.type} = 'expense' and ${transactions.visibility} = 'shared' then ${transactions.amount} else 0 end), 0)`,
      personalIncome: sql<string>`coalesce(sum(case when ${transactions.type} = 'income' and ${transactions.visibility} = 'personal' and ${transactions.userId} = ${userId} then ${transactions.amount} else 0 end), 0)`,
      personalExpense: sql<string>`coalesce(sum(case when ${transactions.type} = 'expense' and ${transactions.visibility} = 'personal' and ${transactions.userId} = ${userId} then ${transactions.amount} else 0 end), 0)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.groupId, activeGroupId),
        or(eq(transactions.visibility, "shared"), and(eq(transactions.visibility, "personal"), eq(transactions.userId, userId)))
      )
    );

  const recentRows = await db
    .select({
      id: transactions.id,
      amount: transactions.amount,
      category: transactions.category,
      note: transactions.note,
      type: transactions.type,
      visibility: transactions.visibility,
      createdAt: transactions.createdAt,
      userDisplayName: profiles.fullName,
      transactionUserId: transactions.userId,
    })
    .from(transactions)
    .leftJoin(profiles, eq(profiles.id, transactions.userId))
    .where(
      and(
        eq(transactions.groupId, activeGroupId),
        or(eq(transactions.visibility, "shared"), and(eq(transactions.visibility, "personal"), eq(transactions.userId, userId)))
      )
    )
    .orderBy(desc(transactions.createdAt))
    .limit(10);

  const memberBalanceRows = await db
    .select({
      userId: groupMembers.userId,
      userDisplayName: profiles.fullName,
      income: sql<string>`coalesce(sum(case when ${transactions.type} = 'income' then ${transactions.amount} else 0 end), 0)`,
      expense: sql<string>`coalesce(sum(case when ${transactions.type} = 'expense' then ${transactions.amount} else 0 end), 0)`,
    })
    .from(groupMembers)
    .leftJoin(profiles, eq(profiles.id, groupMembers.userId))
    .leftJoin(
      transactions,
      and(
        eq(transactions.groupId, activeGroupId),
        eq(transactions.userId, groupMembers.userId),
        or(
          eq(transactions.visibility, "shared"),
          and(eq(transactions.visibility, "personal"), eq(transactions.userId, userId))
        )
      )
    )
    .where(eq(groupMembers.groupId, activeGroupId))
    .groupBy(groupMembers.userId, profiles.fullName);

  const analyticsRows = await db
    .select({
      monthKey: sql<string>`to_char(date_trunc('month', ${transactions.createdAt}), 'YYYY-MM')`,
      monthLabel: sql<string>`to_char(date_trunc('month', ${transactions.createdAt}), 'Mon YYYY')`,
      userId: transactions.userId,
      userDisplayName: profiles.fullName,
      category: transactions.category,
      amount: transactions.amount,
    })
    .from(transactions)
    .leftJoin(profiles, eq(profiles.id, transactions.userId))
    .where(
      and(
        eq(transactions.groupId, activeGroupId),
        eq(transactions.type, "expense"),
        or(eq(transactions.visibility, "shared"), and(eq(transactions.visibility, "personal"), eq(transactions.userId, userId)))
      )
    )
    .orderBy(desc(transactions.createdAt));

  const monthMap = new Map<
    string,
    {
      monthKey: string;
      monthLabel: string;
      total: number;
      spenderMap: Map<string, { userId: string; userDisplayName: string; total: number }>;
      categoryMap: Map<string, { category: string; total: number }>;
    }
  >();

  for (const row of analyticsRows) {
    const existingMonth = monthMap.get(row.monthKey) ?? {
      monthKey: row.monthKey,
      monthLabel: row.monthLabel,
      total: 0,
      spenderMap: new Map<string, { userId: string; userDisplayName: string; total: number }>(),
      categoryMap: new Map<string, { category: string; total: number }>(),
    };

    const amount = Number(row.amount);
    const spenderId = row.userId;
    const spenderName = row.userDisplayName ?? (spenderId === userId ? "You" : "Member");
    const categoryKey = row.category.trim();

    existingMonth.total += amount;

    const existingSpender = existingMonth.spenderMap.get(spenderId) ?? {
      userId: spenderId,
      userDisplayName: spenderName,
      total: 0,
    };
    existingSpender.total += amount;
    existingMonth.spenderMap.set(spenderId, existingSpender);

    const existingCategory = existingMonth.categoryMap.get(categoryKey) ?? {
      category: categoryKey,
      total: 0,
    };
    existingCategory.total += amount;
    existingMonth.categoryMap.set(categoryKey, existingCategory);

    monthMap.set(row.monthKey, existingMonth);
  }

  const analytics: TransactionAnalytics = {
    months: Array.from(monthMap.values())
      .sort((left, right) => left.monthKey.localeCompare(right.monthKey))
      .map((month): AnalyticsMonth => ({
        monthKey: month.monthKey,
        monthLabel: month.monthLabel,
        total: month.total,
        spenders: Array.from(month.spenderMap.values()).sort((left, right) => right.total - left.total),
        categories: Array.from(month.categoryMap.values()).sort((left, right) => right.total - left.total),
      })),
  };

  const recentTransactions: TransactionView[] = recentRows.map((row) => ({
    id: row.id,
    amount: Number(row.amount),
    category: row.category,
    note: row.note,
    type: row.type,
    visibility: row.visibility,
    createdAt: row.createdAt.toISOString(),
    userDisplayName: row.userDisplayName ?? (row.transactionUserId === userId ? "You" : "Member"),
  }));

  const memberBalances = memberBalanceRows
    .map((row) => {
      const income = Number(row.income);
      const expense = Number(row.expense);

      return {
        userId: row.userId,
        userDisplayName: row.userDisplayName ?? (row.userId === userId ? "You" : "Member"),
        income,
        expense,
        balance: income - expense,
      };
    })
    .sort((left, right) => right.balance - left.balance);

  return {
    selectedGroupId: activeGroupId,
    groups: groupsForUser,
    pendingInvitations,
    analytics,
    summary: {
      sharedIncome: Number(summaryRow?.sharedIncome ?? 0),
      sharedExpense: Number(summaryRow?.sharedExpense ?? 0),
      personalIncome: Number(summaryRow?.personalIncome ?? 0),
      personalExpense: Number(summaryRow?.personalExpense ?? 0),
    },
    memberBalances,
    recentTransactions,
  };
}
