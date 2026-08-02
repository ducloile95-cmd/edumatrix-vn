// @vitest-environment jsdom

import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { Tab, Tabs } from "@/components/ui/Tabs";

function TabsHarness() {
  const [active, setActive] = useState("overview");
  return (
    <Tabs label="Nội dung lớp học">
      <Tab active={active === "overview"} onClick={() => setActive("overview")}>Tổng quan</Tab>
      <Tab active={active === "students"} onClick={() => setActive("students")}>Học sinh</Tab>
      <Tab active={active === "schedule"} onClick={() => setActive("schedule")}>Lịch học</Tab>
    </Tabs>
  );
}

afterEach(cleanup);

describe("Tabs", () => {
  test("moves and activates tabs with arrow keys", () => {
    render(<TabsHarness />);
    const overview = screen.getByRole("tab", { name: "Tổng quan" });
    overview.focus();

    fireEvent.keyDown(overview, { key: "ArrowRight" });

    const students = screen.getByRole("tab", { name: "Học sinh" });
    expect(document.activeElement).toBe(students);
    expect(students.getAttribute("aria-selected")).toBe("true");
    expect(students.tabIndex).toBe(0);
    expect(document.querySelector(".motion-tab-indicator")).not.toBeNull();
  });
});
