"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import api from "@/lib/axios";
import type { ApiResponse } from "@/types";

/** My break — "Take break": no new leads from a team that splits by HRMS attendance until it ends. */
export interface MyBreak { onBreak: boolean; since: string | null }
const BREAK_KEY = ["break"] as const;

export const useMyBreak = () =>
  useQuery({
    queryKey: BREAK_KEY,
    queryFn: async () => (await api.get<ApiResponse<MyBreak>>("/break")).data.data as MyBreak,
    staleTime: 30_000,
    refetchInterval: 5 * 60_000,
  });

export const useSetBreak = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (on: boolean) => (await api.post<ApiResponse<MyBreak>>("/break", { on })).data.data as MyBreak,
    onSuccess: (data) => {
      queryClient.setQueryData(BREAK_KEY, data);
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      toast.success(data.onBreak ? "On a break — no new leads until you end it" : "Break ended — leads are coming to you again");
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? "Could not change your break");
    },
  });
};
