import { useQuery } from "@tanstack/react-query";
import type { Reviewer, Thread } from "../../shared/types.js";

export interface ReviewPayload {
  readonly diff: string;
  readonly language: string;
  readonly reviewers: readonly Reviewer[];
  readonly threads: readonly Thread[];
}

export function useReviewQuery() {
  return useQuery({
    queryKey: ["review"],
    queryFn: async (): Promise<ReviewPayload> => {
      const response = await fetch("/api/review");
      if (!response.ok) throw new Error(`Review API failed: ${response.status}`);
      return (await response.json()) as ReviewPayload;
    },
  });
}
