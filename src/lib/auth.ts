import { getServerSession } from "next-auth";

import { ensureProfile } from "@/db/queries";
import { authOptions } from "@/lib/auth-options";

export async function requireUserContext() {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  const userId = (user as { id?: string } | undefined)?.id;
  const email = user?.email?.toLowerCase();

  if (!userId || !email) {
    throw new Error("Unauthorized");
  }

  const fullName = user?.name?.trim() || email;
  await ensureProfile(userId, fullName, user?.image ?? null);

  return {
    userId,
    email,
    fullName,
  };
}
