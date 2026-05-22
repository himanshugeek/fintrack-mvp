import {
  index,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const groupRoleEnum = pgEnum("group_role", ["owner", "member"]);
export const invitationStatusEnum = pgEnum("invitation_status", ["pending", "accepted", "declined"]);
export const transactionTypeEnum = pgEnum("transaction_type", ["income", "expense"]);
export const transactionVisibilityEnum = pgEnum("transaction_visibility", ["personal", "shared"]);

export const profiles = pgTable("profiles", {
  id: text("id").primaryKey(),
  fullName: text("full_name"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const groups = pgTable("groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const groupMembers = pgTable(
  "group_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    role: groupRoleEnum("role").notNull().default("member"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    groupUserUnique: uniqueIndex("group_members_group_user_unique").on(table.groupId, table.userId),
    groupIdx: index("group_members_group_idx").on(table.groupId),
    userIdx: index("group_members_user_idx").on(table.userId),
  })
);

export const invitations = pgTable(
  "invitations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    invitedEmail: text("invited_email").notNull(),
    invitedBy: text("invited_by")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    status: invitationStatusEnum("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    emailIdx: index("invitations_email_idx").on(table.invitedEmail),
    pendingUnique: uniqueIndex("invitations_pending_unique").on(table.groupId, table.invitedEmail, table.status),
  })
);

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    type: transactionTypeEnum("type").notNull(),
    visibility: transactionVisibilityEnum("visibility").notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    category: text("category").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    groupCreatedAtIdx: index("transactions_group_created_at_idx").on(table.groupId, table.createdAt),
    userIdx: index("transactions_user_idx").on(table.userId),
    typeIdx: index("transactions_type_idx").on(table.type),
    visibilityIdx: index("transactions_visibility_idx").on(table.visibility),
  })
);

export type GroupRole = (typeof groupRoleEnum.enumValues)[number];
export type InvitationStatus = (typeof invitationStatusEnum.enumValues)[number];
export type TransactionType = (typeof transactionTypeEnum.enumValues)[number];
export type TransactionVisibility = (typeof transactionVisibilityEnum.enumValues)[number];
