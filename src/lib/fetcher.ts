import { getCurrentIdToken } from "@/lib/firebase/client";

export async function apiRequest<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const token = typeof window === "undefined" ? null : await getCurrentIdToken();

  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
    credentials: "include",
  });

  const payload = (await response.json()) as { data?: T; error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? "Request failed");
  }

  if (!payload.data) {
    throw new Error("Invalid API response");
  }

  return payload.data;
}
