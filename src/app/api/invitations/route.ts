import { createInvitation } from "@/db/queries";
import { inviteUserSchema } from "@/features/invitations/schemas";
import { requireUserContext } from "@/lib/auth";
import { badRequest, ok, serverError, unauthorized } from "@/lib/http";

export async function POST(request: Request) {
  try {
    const context = await requireUserContext();
    const json = await request.json();
    const parsed = inviteUserSchema.safeParse(json);

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid request");
    }

    await createInvitation(context.userId, parsed.data.groupId, parsed.data.invitedEmail);
    return ok({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorized();
    }

    return serverError(error instanceof Error ? error.message : "Failed to create invitation");
  }
}
