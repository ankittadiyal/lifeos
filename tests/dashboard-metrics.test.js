import { describe, expect, it } from "vitest";
import {
  countAllTasks,
  countCompletedTasks,
  countPendingTasks,
  getCompletionPercentage,
} from "../js/modules/dashboard-metrics.js";

describe("task completion metrics", () => {
  it("counts completed and pending tasks", () => {
    const tasks = [
      { completed: true },
      { completed: false },
      { completed: true },
      { completed: false },
    ];

    expect(countAllTasks(tasks)).toBe(4);
    expect(countCompletedTasks(tasks)).toBe(2);
    expect(countPendingTasks(tasks)).toBe(2);
  });

  it("returns zero counts and percentage for an empty collection", () => {
    expect(countAllTasks([])).toBe(0);
    expect(countCompletedTasks([])).toBe(0);
    expect(countPendingTasks([])).toBe(0);
    expect(getCompletionPercentage([])).toBe(0);
  });

  it("rounds completion percentage to the nearest whole percent", () => {
    expect(getCompletionPercentage([
      { completed: true },
      { completed: true },
      { completed: false },
    ])).toBe(67);
    expect(getCompletionPercentage([
      { completed: true },
      ...Array.from({ length: 7 }, () => ({ completed: false })),
    ])).toBe(13);
  });
});
