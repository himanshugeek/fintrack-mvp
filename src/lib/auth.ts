import { headers } from "next/headers";

import { ensureProfile } from "@/db/queries";
import { env } from "@/lib/env";

type FirebaseLookupResponse = {
  users?: Array<{
    localId?: string;
    email?: string;
    displayName?: string;
    photoUrl?: string;
    emailVerified?: boolean;
  }>;
};

async function verifyFirebaseToken(idToken: string) {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${env.FIREBASE_WEB_API_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ idToken }),
      cache: "no-store",
    }
  );

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as FirebaseLookupResponse;
  return payload.users?.[0] ?? null;
}

export async function requireUserContext() {
  const requestHeaders = await headers();
  const authorizationHeader = requestHeaders.get("authorization");

  if (!authorizationHeader?.startsWith("Bearer ")) {
    throw new Error("Unauthorized");
  }

  const idToken = authorizationHeader.slice("Bearer ".length).trim();
  if (!idToken) {
    throw new Error("Unauthorized");
  }

  const user = await verifyFirebaseToken(idToken);
  const userId = user?.localId;
  const email = user?.email?.toLowerCase();

  if (!userId || !email || !user.emailVerified) {
    throw new Error("A verified primary email is required.");
  }

  const fullName = user.displayName?.trim() || email;
  await ensureProfile(userId, fullName, user.photoUrl ?? null);

  return {
    userId,
    email,
    fullName,
  };
}
