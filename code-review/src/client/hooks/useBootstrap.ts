import { useQuery } from "@tanstack/react-query";

export interface DiffPayload {
  readonly diff: string;
  readonly language: string;
}

export function useDiff(): {
  data: DiffPayload | undefined;
  isLoading: boolean;
  isError: boolean;
} {
  const query = useQuery<DiffPayload>({
    queryKey: ["diff"],
    queryFn: async () => {
      const res = await fetch("/api/diff");
      if (!res.ok) throw new Error(`diff fetch failed: ${res.status}`);
      const json = (await res.json()) as unknown;
      if (
        typeof json !== "object" ||
        json === null ||
        typeof (json as { diff?: unknown }).diff !== "string" ||
        typeof (json as { language?: unknown }).language !== "string"
      ) {
        throw new Error("invalid diff payload");
      }
      return json as DiffPayload;
    },
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
  return { data: query.data, isLoading: query.isLoading, isError: query.isError };
}
