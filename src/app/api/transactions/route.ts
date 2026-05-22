import { createTransactionForUser, deleteTransactionForUser, updateTransactionForUser } from "@/db/queries";
import { createTransactionSchema, deleteTransactionSchema, updateTransactionSchema } from "@/features/transactions/schemas";
import { requireUserContext } from "@/lib/auth";
import { badRequest, ok, serverError, unauthorized } from "@/lib/http";

export async function POST(request: Request) {
  try {
    const context = await requireUserContext();
    const json = await request.json();
    const parsed = createTransactionSchema.safeParse(json);

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid request");
    }

    await createTransactionForUser({
      userId: context.userId,
      groupId: parsed.data.groupId,
      type: parsed.data.type,
      visibility: parsed.data.visibility,
      amount: parsed.data.amount,
      category: parsed.data.category,
      note: parsed.data.note,
    });

    return ok({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorized();
    }

    return serverError(error instanceof Error ? error.message : "Failed to create transaction");
  }
}

export async function PATCH(request: Request) {
  try {
    const context = await requireUserContext();
    const json = await request.json();
    const parsed = updateTransactionSchema.safeParse(json);

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid request");
    }

    await updateTransactionForUser({
      userId: context.userId,
      transactionId: parsed.data.transactionId,
      type: parsed.data.type,
      visibility: parsed.data.visibility,
      amount: parsed.data.amount,
      category: parsed.data.category,
      note: parsed.data.note,
    });

    return ok({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorized();
    }

    return serverError(error instanceof Error ? error.message : "Failed to update transaction");
  }
}

export async function DELETE(request: Request) {
  try {
    const context = await requireUserContext();
    const json = await request.json();
    const parsed = deleteTransactionSchema.safeParse(json);

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid request");
    }

    await deleteTransactionForUser(context.userId, parsed.data.transactionId);
    return ok({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorized();
    }

    return serverError(error instanceof Error ? error.message : "Failed to delete transaction");
  }
}
