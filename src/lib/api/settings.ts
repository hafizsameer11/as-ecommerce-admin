import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "./client";

export const publicSettingsQueryKey = ["store", "settings", "public"] as const;

export function usePublicSettings() {
  return useQuery({
    queryKey: publicSettingsQueryKey,
    queryFn: () => apiRequest<Record<string, unknown>>("/store/settings/public"),
    staleTime: 5 * 60_000,
  });
}
