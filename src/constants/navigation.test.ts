import { describe, expect, test } from "vitest";
import { NAVIGATION_BY_ROLE, isNavGroup } from "@/constants/navigation";
import { USER_ROLES } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";

function navigationPaths(role: keyof typeof NAVIGATION_BY_ROLE): string[] {
  return NAVIGATION_BY_ROLE[role].flatMap((node) =>
    isNavGroup(node) ? node.children.map((child) => child.to) : [node.to],
  );
}

describe("NAVIGATION_BY_ROLE", () => {
  test("exposes user management to both staff roles", () => {
    expect(navigationPaths(USER_ROLES.ADMIN)).toContain(ROUTES.STAFF_USERS);
    expect(navigationPaths(USER_ROLES.TEACHER)).toContain(ROUTES.STAFF_USERS);
  });

  test("keeps the remaining Teacher navigation unchanged", () => {
    expect(navigationPaths(USER_ROLES.TEACHER)).toEqual([
      ROUTES.STAFF_DASHBOARD,
      ROUTES.STAFF_STUDENTS,
      ROUTES.STAFF_CLASSES,
      ROUTES.STAFF_SESSIONS,
      ROUTES.STAFF_CATALOG,
      ROUTES.STAFF_CLASSROOM,
      ROUTES.STAFF_LESSON_PLANS,
      ROUTES.STAFF_ATTENDANCE,
      ROUTES.STAFF_LEARNING,
      ROUTES.STAFF_CHAT,
      ROUTES.STAFF_INVOICES,
      ROUTES.STAFF_USERS,
      ROUTES.STAFF_SETTINGS,
    ]);
  });
});
