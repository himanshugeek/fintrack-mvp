import { auth, currentUser } from "@clerk/nextjs/server";

import { ensureProfile } from "@/db/queries";

export async function requireUserContext() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress?.toLowerCase();

  if (!user || !email) {
    throw new Error("A verified primary email is required.");
  }

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || email;
  await ensureProfile(userId, fullName, user.imageUrl ?? null);

  return {
    userId,
    email,
    fullName,
  };
}
