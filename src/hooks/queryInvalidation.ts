import type { QueryClient } from "@tanstack/react-query";

/** Moi danh sach suy ra tu buoi hoc (sessions-by-class, attendance-sessions...) - prefix ["sessions"] khong cham toi chung. */
export function invalidateSessionQueries(client: QueryClient) {
  return client.invalidateQueries({ predicate: (query) => String(query.queryKey[0]).includes("session") });
}

/** Danh sach giao an, banner "buoi chua co giao an" va giao an theo buoi o trang lop hoc. */
export function invalidateLessonPlanQueries(client: QueryClient) {
  return Promise.all([
    client.invalidateQueries({ queryKey: ["lesson-plans"] }),
    client.invalidateQueries({ queryKey: ["lesson-plan-gaps"] }),
    client.invalidateQueries({ queryKey: ["lesson-plan"] }),
  ]);
}
