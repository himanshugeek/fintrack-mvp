"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createGroupSchema, renameGroupSchema } from "@/features/groups/schemas";
import { acceptInvitationSchema, inviteUserSchema } from "@/features/invitations/schemas";
import { createTransactionSchema } from "@/features/transactions/schemas";
import { apiRequest } from "@/lib/fetcher";
import type { DashboardData } from "@/types/domain";

const DASHBOARD_KEY = "dashboard";

export function useDashboardData(groupId?: string, enabled = true) {
  return useQuery({
    queryKey: [DASHBOARD_KEY, groupId],
    queryFn: () => apiRequest<DashboardData>(`/api/dashboard${groupId ? `?groupId=${groupId}` : ""}`),
    enabled,
  });
}

export function useCreateGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: unknown) => {
      const parsed = createGroupSchema.parse(payload);
      return apiRequest<{ id: string }>("/api/groups", {
        method: "POST",
        body: JSON.stringify(parsed),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [DASHBOARD_KEY] });
    },
  });
}

export function useRenameGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: unknown) => {
      const parsed = renameGroupSchema.parse(payload);
      return apiRequest<{ success: true }>("/api/groups", {
        method: "PATCH",
        body: JSON.stringify(parsed),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [DASHBOARD_KEY] });
    },
  });
}

export function useInviteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: unknown) => {
      const parsed = inviteUserSchema.parse(payload);
      return apiRequest<{ success: true }>("/api/invitations", {
        method: "POST",
        body: JSON.stringify(parsed),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [DASHBOARD_KEY] });
    },
  });
}

export function useAcceptInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: unknown) => {
      const parsed = acceptInvitationSchema.parse(payload);
      return apiRequest<{ success: true }>("/api/invitations/accept", {
        method: "POST",
        body: JSON.stringify(parsed),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [DASHBOARD_KEY] });
    },
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: unknown) => {
      const parsed = createTransactionSchema.parse(payload);
      return apiRequest<{ success: true }>("/api/transactions", {
        method: "POST",
        body: JSON.stringify(parsed),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [DASHBOARD_KEY] });
    },
  });
}
