import { describe, expect, it } from "vitest";
import {
  createMonthGrid,
  formatAgendaDate,
  formatLocalDate,
  groupTasksByDueDate,
} from "../js/modules/calendar-data.js";

describe("calendar date helpers", () => {
  it("formats local dates without shifting the calendar day", () => {
    expect(formatLocalDate(new Date(2026, 9, 31, 23, 30)))
      .toBe("2026-10-31");
  });

  it("builds the leap-year February grid with correct month boundaries", () => {
    const grid = createMonthGrid(2024, 1);
    const dates = grid.filter(Boolean);

    expect(grid).toHaveLength(35);
    expect(grid.slice(0, 5)).toEqual([null, null, null, null, "2024-02-01"]);
    expect(dates).toHaveLength(29);
    expect(dates.at(-1)).toBe("2024-02-29");
  });

  it("creates a 42-cell grid when the month needs six calendar weeks", () => {
    const grid = createMonthGrid(2026, 7);
    expect(grid).toHaveLength(42);
    expect(grid.find(Boolean)).toBe("2026-08-01");
    expect(grid.filter(Boolean).at(-1)).toBe("2026-08-31");
  });

  it("rejects invalid month indexes", () => {
    expect(() => createMonthGrid(2026, -1)).toThrow(TypeError);
    expect(() => createMonthGrid(2026, 12)).toThrow(TypeError);
    expect(() => createMonthGrid(2026.5, 0)).toThrow(TypeError);
  });

  it("groups only valid tasks in the requested month and orders same-day tasks", () => {
    const tasks = [
      { title: "Zebra", dueDate: "2026-10-31" },
      { title: "Alpha", dueDate: "2026-10-31" },
      { title: "November", dueDate: "2026-11-01" },
      { title: "Invalid day", dueDate: "2026-10-32" },
      { title: "No date", dueDate: "" },
    ];

    const grouped = groupTasksByDueDate(tasks, 2026, 9);

    expect([...grouped.keys()]).toEqual(["2026-10-31"]);
    expect(grouped.get("2026-10-31").map((task) => task.title))
      .toEqual(["Alpha", "Zebra"]);
  });

  it("formats agenda dates and rejects impossible dates", () => {
    expect(formatAgendaDate("2026-10-31")).toContain("Saturday");
    expect(() => formatAgendaDate("2026-02-30")).toThrow(TypeError);
  });
});
