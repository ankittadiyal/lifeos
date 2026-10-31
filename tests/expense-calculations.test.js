import { describe, expect, it } from "vitest";
import {
  calculateBudgetStatus,
  calculateMonthlySummary,
} from "../js/modules/expense-calculations.js";

describe("calculateMonthlySummary", () => {
  it("sums income and expenses in exact paise for the requested month", () => {
    const transactions = [
      { type: "income", amountPaise: 100001, date: "2026-10-01" },
      { type: "expense", amountPaise: 101, date: "2026-10-31" },
      { type: "expense", amountPaise: 202, date: "2026-10-15" },
      { type: "expense", amountPaise: 99999, date: "2026-11-01" },
      { type: "transfer", amountPaise: 500, date: "2026-10-10" },
    ];

    expect(calculateMonthlySummary(transactions, new Date(2026, 9, 31))).toEqual({
      month: "2026-10",
      incomePaise: 100001n,
      expensesPaise: 303n,
      balancePaise: 99698n,
      income: 1000.01,
      expenses: 3.03,
      balance: 996.98,
    });
  });

  it("supports exact legacy INR inputs and ignores invalid dates", () => {
    const result = calculateMonthlySummary([
      { type: "expense", amount: "0.10", date: "2026-10-01" },
      { type: "expense", amount: "0.20", date: "2026-10-31" },
      { type: "expense", amount: "50.00", date: "2026-10-32" },
    ], new Date(2026, 9, 1));

    expect(result.expensesPaise).toBe(30n);
    expect(result.expenses).toBe(0.3);
  });

  it("returns zero totals for empty data and respects month/year boundaries", () => {
    expect(calculateMonthlySummary([], new Date(2026, 0, 1))).toMatchObject({
      month: "2026-01",
      incomePaise: 0n,
      expensesPaise: 0n,
      balancePaise: 0n,
    });

    const summary = calculateMonthlySummary([
      { type: "expense", amountPaise: 100, date: "2025-12-31" },
      { type: "expense", amountPaise: 200, date: "2026-01-01" },
    ], new Date(2026, 0, 1));
    expect(summary.expensesPaise).toBe(200n);
  });
});

describe("calculateBudgetStatus", () => {
  it("calculates overall and per-category remaining amounts", () => {
    const transactions = [
      { type: "expense", amountPaise: 1001, category: "Food", date: "2026-10-31" },
      { type: "expense", amountPaise: 202, category: "Food", date: "2026-10-01" },
      { type: "expense", amountPaise: 500, category: "Travel", date: "2026-10-02" },
      { type: "income", amountPaise: 50000, category: "Other", date: "2026-10-02" },
      { type: "expense", amountPaise: 90000, category: "Food", date: "2026-11-01" },
    ];

    const result = calculateBudgetStatus(transactions, "2026-10", {
      overallPaise: 5000,
      categories: { Food: 2000, Travel: 500, Bills: 1000 },
    });

    expect(result.totalExpensesPaise).toBe(1703n);
    expect(result.overall).toMatchObject({
      limitPaise: 5000n,
      spentPaise: 1703n,
      remainingPaise: 3297n,
      status: "within",
    });
    expect(result.categories).toEqual([
      {
        category: "Food",
        limitPaise: 2000n,
        spentPaise: 1203n,
        remainingPaise: 797n,
        status: "within",
      },
      {
        category: "Travel",
        limitPaise: 500n,
        spentPaise: 500n,
        remainingPaise: 0n,
        status: "reached",
      },
      {
        category: "Bills",
        limitPaise: 1000n,
        spentPaise: 0n,
        remainingPaise: 1000n,
        status: "within",
      },
    ]);
  });

  it("marks reached and exceeded budgets exactly", () => {
    const transactions = [
      { type: "expense", amountPaise: 1000, category: "Food", date: "2026-10-10" },
      { type: "expense", amountPaise: 1, category: "Food", date: "2026-10-11" },
    ];
    const result = calculateBudgetStatus(transactions, "2026-10", {
      overallPaise: 1000,
      categories: { Food: 1000 },
    });

    expect(result.overall.status).toBe("exceeded");
    expect(result.overall.remainingPaise).toBe(-1n);
    expect(result.categories[0].status).toBe("exceeded");

    const reached = calculateBudgetStatus(transactions.slice(0, 1), "2026-10", {
      overallPaise: 1000,
      categories: { Food: 1000 },
    });
    expect(reached.overall.status).toBe("reached");
    expect(reached.categories[0].status).toBe("reached");
  });

  it("handles empty transactions and an unset overall limit", () => {
    expect(calculateBudgetStatus([], "2026-10", {
      overallPaise: null,
      categories: {},
    })).toEqual({
      month: "2026-10",
      totalExpensesPaise: 0n,
      overall: null,
      categories: [],
    });
  });

  it("rejects invalid month values", () => {
    expect(() => calculateBudgetStatus([], "2026-13", { categories: {} }))
      .toThrow(TypeError);
  });
});
