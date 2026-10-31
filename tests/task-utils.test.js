import { describe, expect, it } from "vitest";
import {
  filterAndSortTasks,
  groupTasksByDate,
} from "../js/modules/task-utils.js";

const tasks = [
  { id: "1", title: "Graph traversal", category: "DSA", priority: "Medium", completed: false },
  { id: "2", title: "Array practice", category: "DSA", priority: "High", completed: true },
  { id: "3", title: "Write notes", category: "College", priority: "Low", completed: false },
  { id: "4", title: "Binary search", category: "DSA", priority: "Low", completed: false },
];

describe("filterAndSortTasks", () => {
  it("combines case-insensitive search, status, and category filters", () => {
    const result = filterAndSortTasks(tasks, {
      search: "  dSa ",
      status: "active",
      category: "DSA",
    });

    expect(result.map((task) => task.id)).toEqual(["1", "4"]);
  });

  it("sorts by priority and then title without mutating the source array", () => {
    const originalOrder = tasks.map((task) => task.id);

    expect(filterAndSortTasks(tasks).map((task) => task.id)).toEqual(["2", "1", "4", "3"]);
    expect(filterAndSortTasks(tasks, { priorityOrder: "low-first" }).map((task) => task.id))
      .toEqual(["4", "3", "1", "2"]);
    expect(tasks.map((task) => task.id)).toEqual(originalOrder);
  });

  it("returns an empty result for filters with no matches and supports empty input", () => {
    expect(filterAndSortTasks(tasks, { search: "not found" })).toEqual([]);
    expect(filterAndSortTasks([])).toEqual([]);
  });
});

describe("groupTasksByDate", () => {
  it("classifies completed, overdue, today, upcoming, and unscheduled tasks", () => {
    const input = [
      { id: "1", completed: false, dueDate: "2026-10-30" },
      { id: "2", completed: false, dueDate: "2026-10-31" },
      { id: "3", completed: false, dueDate: "2026-11-01" },
      { id: "4", completed: false, dueDate: "" },
      { id: "5", completed: true, dueDate: "2026-10-20" },
    ];

    const result = groupTasksByDate(input, "2026-10-31");

    expect(result.overdue.map((task) => task.id)).toEqual(["1"]);
    expect(result.today.map((task) => task.id)).toEqual(["2"]);
    expect(result.upcoming.map((task) => task.id)).toEqual(["3"]);
    expect(result.unscheduled.map((task) => task.id)).toEqual(["4"]);
    expect(result.completed.map((task) => task.id)).toEqual(["5"]);
  });

  it("returns empty groups for an empty collection", () => {
    expect(groupTasksByDate([], "2026-10-31")).toEqual({
      overdue: [],
      today: [],
      upcoming: [],
      unscheduled: [],
      completed: [],
    });
  });
});
