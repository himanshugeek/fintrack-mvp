import { z } from "zod";

export const createTransactionSchema = z.object({
  groupId: z.uuid(),
  type: z.enum(["income", "expense"]),
  visibility: z.enum(["personal", "shared"]),
  amount: z.number().positive("Amount must be greater than 0"),
  category: z.string().trim().min(2, "Category is required").max(40),
  note: z.string().trim().max(300).optional().or(z.literal("")),
});

export const updateTransactionSchema = z.object({
  transactionId: z.uuid(),
  type: z.enum(["income", "expense"]),
  visibility: z.enum(["personal", "shared"]),
  amount: z.number().positive("Amount must be greater than 0"),
  category: z.string().trim().min(2, "Category is required").max(40),
  note: z.string().trim().max(300).optional().or(z.literal("")),
});

export const deleteTransactionSchema = z.object({
  transactionId: z.uuid(),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
export type DeleteTransactionInput = z.infer<typeof deleteTransactionSchema>;
