import { describe, expect, test } from "vitest";
import { NAVIGATION_BY_ROLE, isNavGroup } from "@/constants/navigation";
import { ROUTES } from "@/constants/routes";
import { USER_ROLES } from "@/constants/roles";

describe("Teacher navigation", () => {
  test("exposes the user account deletion module", () => {
    const leaves = NAVIGATION_BY_ROLE[USER_ROLES.TEACHER]
      .flatMap((node) => isNavGroup(node) ? node.children : [node]);

    expect(leaves.some((leaf) => leaf.to === ROUTES.STAFF_USERS)).toBe(true);
  });
});
