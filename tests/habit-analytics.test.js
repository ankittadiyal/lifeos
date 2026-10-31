import { describe, expect, it } from "vitest";
import { calculateHabitAnalytics } from "../js/modules/habit-analytics.js";

describe("calculateHabitAnalytics", () => {
  it("counts consecutive days and the seven-day rate", () => {
    expect(calculateHabitAnalytics(
      ["2026-10-29", "2026-10-30", "2026-10-31"],
      "2026-10-31"
    )).toEqual({
      currentStreak: 3,
      longestStreak: 3,
      sevenDayCompletionCount: 3,
      sevenDayCompletionRate: 43,
    });
  });

  it("does not break a streak when today is incomplete but yesterday was completed", () => {
    const result = calculateHabitAnalytics(
      ["2026-10-28", "2026-10-29", "2026-10-30"],
      "2026-10-31"
    );

    expect(result.currentStreak).toBe(3);
    expect(result.longestStreak).toBe(3);
  });

  it("ends the current streak after a missed day", () => {
    const result = calculateHabitAnalytics(
      ["2026-10-27", "2026-10-29", "2026-10-30"],
      "2026-10-31"
    );

    expect(result.currentStreak).toBe(2);
    expect(result.longestStreak).toBe(2);
  });

  it("deduplicates dates and ignores malformed, impossible, and future dates", () => {
    const result = calculateHabitAnalytics(
      [
        "2026-10-30",
        "2026-10-30",
        "2026-10-31",
        "2026-11-01",
        "2026-02-30",
        "not-a-date",
      ],
      "2026-10-31"
    );

    expect(result.currentStreak).toBe(2);
    expect(result.longestStreak).toBe(2);
    expect(result.sevenDayCompletionCount).toBe(2);
  });

  it("returns zero analytics for an empty history", () => {
    expect(calculateHabitAnalytics([], "2026-10-31")).toEqual({
      currentStreak: 0,
      longestStreak: 0,
      sevenDayCompletionCount: 0,
      sevenDayCompletionRate: 0,
    });
  });

  it("rejects invalid arguments", () => {
    expect(() => calculateHabitAnalytics("2026-10-31", "2026-10-31"))
      .toThrow(TypeError);
    expect(() => calculateHabitAnalytics([], "2026-02-30"))
      .toThrow(TypeError);
  });
});
