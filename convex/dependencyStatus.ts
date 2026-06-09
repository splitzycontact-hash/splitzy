import { query } from "./_generated/server";

type DependencyStatus = {
  service: string;
  status: "up" | "degraded" | "down";
  latencyMs?: number;
};

export const list = query({
  handler: async (): Promise<DependencyStatus[]> => {
    return [];
  },
});
