// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { Timestamp } from "firebase/firestore";
import { afterEach, describe, expect, test, vi } from "vitest";
import { FitWeekTimetable } from "@/features/sessions/components/FitWeekTimetable";
import type { TimetableSession } from "@/features/sessions/components/TimetableGrid";

afterEach(cleanup);

const day = new Date(2026, 7, 3, 8, 0, 0);

function session(index: number): TimetableSession {
  const startAt = new Date(2026, 7, 3, 8 + index, 0, 0);
  const endAt = new Date(2026, 7, 3, 8 + index, 45, 0);
  const timestamp = Timestamp.fromDate(startAt);
  return {
    id: `session-${index}`,
    classId: `class-${index}`,
    className: `Lớp ${index}`,
    title: `Buổi ${index}`,
    startAt: timestamp,
    endAt: Timestamp.fromDate(endAt),
    location: "Phòng 1",
    status: "scheduled",
    note: "",
    makeUpForSessionId: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

describe("FitWeekTimetable dense class layout", () => {
  test("uses two rows for two classes and a 2-by-2 grid for four classes", () => {
    const { container, rerender } = render(
      <FitWeekTimetable days={[day]} sessions={[session(0), session(1)]} today={day} onSessionClick={vi.fn()} />,
    );

    expect(container.querySelector('[data-columns="1"]')?.children).toHaveLength(2);

    rerender(
      <FitWeekTimetable
        days={[day]}
        sessions={[session(0), session(1), session(2), session(3)]}
        today={day}
        onSessionClick={vi.fn()}
      />,
    );

    expect(container.querySelector('[data-columns="2"]')?.children).toHaveLength(4);
  });
});
