import { z } from "zod";

export const createGroupSchema = z.object({
  name: z.string().trim().min(2, "Group name must be at least 2 characters").max(60),
});

export const renameGroupSchema = z.object({
  groupId: z.uuid(),
  name: z.string().trim().min(2, "Group name must be at least 2 characters").max(60),
});

export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type RenameGroupInput = z.infer<typeof renameGroupSchema>;
