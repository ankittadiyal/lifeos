const TRANSACTION_CATEGORIES = ["Food", "Travel", "Shopping", "Bills", "Education", "Other"];
const MAX_AMOUNT_PAISE = Number.MAX_SAFE_INTEGER;

function isValidDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function parseRupeesToPaise(value) {
  const amountText = typeof value === "number"
    ? String(value)
    : typeof value === "string"
      ? value.trim()
      : "";
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(amountText);

  if (!match) {
    return null;
  }

  const rupees = BigInt(match[1]);
  const paise = BigInt((match[2] ?? "").padEnd(2, "0") || "0");
  const totalPaise = rupees * 100n + paise;

  if (totalPaise <= 0n || totalPaise > BigInt(MAX_AMOUNT_PAISE)) {
    return null;
  }
  return Number(totalPaise);
}

function getAmountPaise(transaction) {
  if (Number.isSafeInteger(transaction.amountPaise)) {
    return transaction.amountPaise;
  }
  return parseRupeesToPaise(transaction.amount);
}

function isValidMonth(value) {
  return typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

function paiseToRupees(amountPaise) {
  return amountPaise / 100;
}

export function calculateMonthlySummary(transactionList, referenceDate = new Date()) {
  const month = `${referenceDate.getFullYear()}-${String(
    referenceDate.getMonth() + 1
  ).padStart(2, "0")}`;
  let incomePaise = 0n;
  let expensesPaise = 0n;

  for (const transaction of transactionList) {
    const amountPaise = getAmountPaise(transaction);

    if (
      !isValidDate(transaction.date) ||
      transaction.date.slice(0, 7) !== month ||
      amountPaise === null ||
      amountPaise <= 0
    ) {
      continue;
    }

    if (transaction.type === "income") {
      incomePaise += BigInt(amountPaise);
    } else if (transaction.type === "expense") {
      expensesPaise += BigInt(amountPaise);
    }
  }

  return {
    month,
    incomePaise,
    expensesPaise,
    balancePaise: incomePaise - expensesPaise,
    income: paiseToRupees(Number(incomePaise)),
    expenses: paiseToRupees(Number(expensesPaise)),
    balance: paiseToRupees(Number(incomePaise - expensesPaise)),
  };
}

export function calculateBudgetStatus(transactionList, month, budget) {
  if (!isValidMonth(month)) {
    throw new TypeError("Choose a valid budget month.");
  }
  const expensesByCategory = Object.create(null);
  let totalExpensesPaise = 0n;

  for (const transaction of transactionList) {
    const amountPaise = getAmountPaise(transaction);
    if (
      transaction.type !== "expense" ||
      !isValidDate(transaction.date) ||
      transaction.date.slice(0, 7) !== month ||
      amountPaise === null ||
      amountPaise <= 0 ||
      !TRANSACTION_CATEGORIES.includes(transaction.category)
    ) {
      continue;
    }

    totalExpensesPaise += BigInt(amountPaise);
    expensesByCategory[transaction.category] =
      (expensesByCategory[transaction.category] ?? 0n) + BigInt(amountPaise);
  }

  const categoryStatuses = Object.entries(budget.categories ?? {}).map(
    ([category, limitPaise]) => {
      const spentPaise = expensesByCategory[category] ?? 0n;
      const limitPaiseBigInt = BigInt(limitPaise);
      return {
        category,
        limitPaise: limitPaiseBigInt,
        spentPaise,
        remainingPaise: limitPaiseBigInt - spentPaise,
        status: spentPaise > limitPaiseBigInt
          ? "exceeded"
          : spentPaise === limitPaiseBigInt
            ? "reached"
            : "within",
      };
    }
  );
  const overallPaise = budget.overallPaise ?? null;
  const overallPaiseBigInt = overallPaise === null ? null : BigInt(overallPaise);

  return {
    month,
    totalExpensesPaise,
    overall: overallPaise === null
      ? null
      : {
          limitPaise: overallPaiseBigInt,
          spentPaise: totalExpensesPaise,
          remainingPaise: overallPaiseBigInt - totalExpensesPaise,
          status: totalExpensesPaise > overallPaiseBigInt
            ? "exceeded"
            : totalExpensesPaise === overallPaiseBigInt
              ? "reached"
              : "within",
        },
    categories: categoryStatuses,
  };
}
