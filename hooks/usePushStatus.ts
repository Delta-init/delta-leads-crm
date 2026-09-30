"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";

/** userId → number of devices with push notifications on (0 = off). */
export type PushStatusMap = Record<string, number>;

export function usePushStatus(userIds: string[], enabled = true) {
  const ids = [...userIds].sort();
  return useQuery({
    queryKey: ["push-status", ids],
    queryFn: async () => {
      const { data } = await api.get<{ data: PushStatusMap }>("/push/status", {
        params: { userIds: ids.join(",") },
      });
      return data.data;
    },
    enabled: enabled && ids.length > 0,
    staleTime: 60_000,
  });
}
