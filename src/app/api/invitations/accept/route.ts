import { acceptInvitation } from "@/db/queries";
import { acceptInvitationSchema } from "@/features/invitations/schemas";
import { requireUserContext } from "@/lib/auth";
import { badRequest, ok, serverError, unauthorized } from "@/lib/http";

export async function POST(request: Request) {
  try {
    const context = await requireUserContext();
    const json = await request.json();
    const parsed = acceptInvitationSchema.safeParse(json);

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid request");
    }

    await acceptInvitation(context.userId, context.email, parsed.data.invitationId);
    return ok({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorized();
    }

    return serverError(error instanceof Error ? error.message : "Failed to accept invitation");
  }
}
