import { getGroupsForUser, createGroupForUser, renameGroupForUser } from "@/db/queries";
import { createGroupSchema, renameGroupSchema } from "@/features/groups/schemas";
import { requireUserContext } from "@/lib/auth";
import { badRequest, ok, serverError, unauthorized } from "@/lib/http";

export async function GET() {
  try {
    const context = await requireUserContext();
    const groups = await getGroupsForUser(context.userId);

    return ok(groups);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorized();
    }

    return serverError(error instanceof Error ? error.message : "Failed to fetch groups");
  }
}

export async function POST(request: Request) {
  try {
    const context = await requireUserContext();
    const json = await request.json();
    const parsed = createGroupSchema.safeParse(json);

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid request");
    }

    const group = await createGroupForUser(context.userId, parsed.data.name);
    return ok(group);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorized();
    }

    return serverError(error instanceof Error ? error.message : "Failed to create group");
  }
}

export async function PATCH(request: Request) {
  try {
    const context = await requireUserContext();
    const json = await request.json();
    const parsed = renameGroupSchema.safeParse(json);

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid request");
    }

    await renameGroupForUser(context.userId, parsed.data.groupId, parsed.data.name);
    return ok({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorized();
    }

    return serverError(error instanceof Error ? error.message : "Failed to rename group");
  }
}
