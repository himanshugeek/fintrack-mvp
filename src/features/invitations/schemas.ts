import { z } from "zod";

export const inviteUserSchema = z.object({
  groupId: z.uuid(),
  invitedEmail: z.email("Enter a valid email"),
});

export const acceptInvitationSchema = z.object({
  invitationId: z.uuid(),
});

export type InviteUserInput = z.infer<typeof inviteUserSchema>;
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;
