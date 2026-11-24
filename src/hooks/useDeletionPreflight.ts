import { useQuery } from "@tanstack/react-query";
import {
  inspectDeletionDependencies,
  type DeletionTargetType,
} from "@/services/firestore/deletionDependencies";

export function useDeletionPreflight(targetType: DeletionTargetType, targetId: string | null) {
  return useQuery({
    queryKey: ["deletion-preflight", targetType, targetId],
    queryFn: () => inspectDeletionDependencies(targetType, targetId!),
    enabled: Boolean(targetId),
    staleTime: 0,
  });
}
