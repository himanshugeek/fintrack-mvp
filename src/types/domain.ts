export type GroupMemberView = {
  id: string;
  role: "owner" | "member";
  fullName: string | null;
};

export type GroupView = {
  id: string;
  name: string;
  role: "owner" | "member";
  createdAt: string;
  members: GroupMemberView[];
};

export type InvitationView = {
  id: string;
  groupId: string;
  groupName: string;
  invitedEmail: string;
  status: "pending" | "accepted" | "declined";
  createdAt: string;
};

export type TransactionView = {
  id: string;
  amount: number;
  category: string;
  note: string | null;
  type: "income" | "expense";
  visibility: "personal" | "shared";
  createdAt: string;
  userDisplayName: string;
};

export type DashboardSummary = {
  sharedIncome: number;
  sharedExpense: number;
  personalIncome: number;
  personalExpense: number;
};

export type MemberBalance = {
  userId: string;
  userDisplayName: string;
  income: number;
  expense: number;
  balance: number;
};

export type AnalyticsSpender = {
  userId: string;
  userDisplayName: string;
  total: number;
};

export type AnalyticsCategory = {
  category: string;
  total: number;
};

export type AnalyticsMonth = {
  monthKey: string;
  monthLabel: string;
  total: number;
  spenders: AnalyticsSpender[];
  categories: AnalyticsCategory[];
};

export type TransactionAnalytics = {
  months: AnalyticsMonth[];
};

export type DashboardData = {
  selectedGroupId: string | null;
  groups: GroupView[];
  summary: DashboardSummary;
  memberBalances: MemberBalance[];
  recentTransactions: TransactionView[];
  pendingInvitations: InvitationView[];
  analytics: TransactionAnalytics;
};
