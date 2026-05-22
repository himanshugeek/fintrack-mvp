import { NextRequest } from "next/server";

import { getDashboardData } from "@/db/queries";
import { requireUserContext } from "@/lib/auth";
import { ok, serverError, unauthorized } from "@/lib/http";

export async function GET(request: NextRequest) {
  try {
    const context = await requireUserContext();
    const groupId = request.nextUrl.searchParams.get("groupId") ?? undefined;
    const data = await getDashboardData(context.userId, context.email, groupId ?? undefined);

    return ok(data);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return unauthorized();
    }

    return serverError(error instanceof Error ? error.message : "Failed to load dashboard");
  }
}
