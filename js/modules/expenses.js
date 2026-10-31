import { loadData, saveData } from "../storage.js";

export { calculateBudgetStatus, calculateMonthlySummary } from "./expense-calculations.js";

const STORAGE_KEY = "lifeos.transactions";
const BUDGET_STORAGE_KEY = "lifeos.monthlyBudgets";
const TRANSACTION_TYPES = ["income", "expense"];
export const TRANSACTION_CATEGORIES = ["Food", "Travel", "Shopping", "Bills", "Education", "Other"];
const MAX_AMOUNT_PAISE = Number.MAX_SAFE_INTEGER;

function isValidDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createId(existingIds = new Set()) {
  let id;

  do {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      id = crypto.randomUUID();
    } else {
      id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }
  } while (existingIds.has(id));

  return id;
}

function parseRupeesToPaise(value, allowZero = false) {
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

  if ((!allowZero && totalPaise <= 0n) || totalPaise > BigInt(MAX_AMOUNT_PAISE)) {
    return null;
  }
  return Number(totalPaise);
}

function parseLegacyRupeesToPaise(value) {
  const amountText = typeof value === "number"
    ? String(value)
    : typeof value === "string"
      ? value.trim()
      : "";
  const match = /^(\d+)(?:\.(\d+))?$/.exec(amountText);

  if (!match) {
    return null;
  }

  let totalPaise = BigInt(match[1]) * 100n;
  const fraction = match[2] ?? "";
  totalPaise += BigInt(fraction.slice(0, 2).padEnd(2, "0") || "0");
  if (fraction.length > 2 && Number(fraction[2]) >= 5) {
    totalPaise += 1n;
  }

  if (totalPaise <= 0n || totalPaise > BigInt(MAX_AMOUNT_PAISE)) {
    return null;
  }
  return Number(totalPaise);
}

function paiseToRupees(amountPaise) {
  return amountPaise / 100;
}

function paiseToInputString(amountPaise) {
  const amount = BigInt(amountPaise);
  return `${amount / 100n}.${String(amount % 100n).padStart(2, "0")}`;
}

function copyTransaction(transaction) {
  return {
    ...transaction,
    amount: paiseToRupees(transaction.amountPaise),
  };
}

function normalizeTransactions(value) {
  if (!Array.isArray(value)) {
    console.error(`Saved data for "${STORAGE_KEY}" is not a transaction list.`);
    return [];
  }

  const usedIds = new Set();
  return value.flatMap((transaction) => {
    const hasPaiseAmount = Number.isSafeInteger(transaction?.amountPaise);
    const amountPaise = hasPaiseAmount
      ? transaction.amountPaise
      : parseLegacyRupeesToPaise(transaction?.amount);

    if (
      transaction === null ||
      typeof transaction !== "object" ||
      !TRANSACTION_TYPES.includes(transaction.type) ||
      amountPaise === null ||
      !Number.isSafeInteger(amountPaise) ||
      amountPaise <= 0 ||
      !TRANSACTION_CATEGORIES.includes(transaction.category) ||
      !isValidDate(transaction.date)
    ) {
      console.error(`Skipped invalid transaction in "${STORAGE_KEY}".`);
      return [];
    }

    const savedId = typeof transaction.id === "string" && transaction.id !== ""
      ? transaction.id
      : null;
    const id = savedId && !usedIds.has(savedId) ? savedId : createId(usedIds);
    usedIds.add(id);

    return [{
      id,
      type: transaction.type,
      amountPaise,
      category: transaction.category,
      date: transaction.date,
      description: typeof transaction.description === "string"
        ? transaction.description.trim()
        : "",
      createdAt:
        typeof transaction.createdAt === "string" &&
        !Number.isNaN(Date.parse(transaction.createdAt))
          ? transaction.createdAt
          : new Date().toISOString(),
    }];
  });
}

const savedTransactions = loadData(STORAGE_KEY, []);
let transactions = normalizeTransactions(savedTransactions);

if (JSON.stringify(savedTransactions) !== JSON.stringify(transactions)) {
  try {
    saveData(STORAGE_KEY, transactions);
  } catch (error) {
    console.error("Could not normalize saved transactions.", error);
  }
}

function persistTransactions(nextTransactions) {
  saveData(STORAGE_KEY, nextTransactions);
  transactions = nextTransactions;
  document.dispatchEvent(new Event("lifeos:expenses-changed"));
}

function validateDetails(details) {
  if (details === null || typeof details !== "object" || Array.isArray(details)) {
    throw new TypeError("Transaction details must be an object.");
  }

  const type = details.type;
  const amountPaise = parseRupeesToPaise(details.amount);
  const category = details.category;
  const date = details.date;
  const description = details.description == null
    ? ""
    : typeof details.description === "string"
      ? details.description.trim()
      : null;

  if (!TRANSACTION_TYPES.includes(type)) {
    throw new TypeError("Choose income or expense.");
  }
  if (amountPaise === null) {
    throw new TypeError("Enter a positive amount with no more than two decimal places.");
  }
  if (!TRANSACTION_CATEGORIES.includes(category)) {
    throw new TypeError("Choose a valid transaction category.");
  }
  if (!isValidDate(date)) {
    throw new TypeError("Enter a valid transaction date.");
  }
  if (description === null) {
    throw new TypeError("Description must be text.");
  }
  if (description.length > 500) {
    throw new TypeError("Description must be 500 characters or fewer.");
  }

  return { type, amountPaise, category, date, description };
}

export function getTodayDateString(date = new Date()) {
  return getLocalDateString(date);
}

export function createTransaction(details) {
  const validatedDetails = validateDetails(details);
  const transaction = {
    id: createId(new Set(transactions.map((item) => item.id))),
    ...validatedDetails,
    createdAt: new Date().toISOString(),
  };

  persistTransactions([...transactions, transaction]);
  return copyTransaction(transaction);
}

export function updateTransaction(id, changes) {
  if (changes === null || typeof changes !== "object" || Array.isArray(changes)) {
    throw new TypeError("Transaction changes must be an object.");
  }

  const existing = transactions.find((transaction) => transaction.id === id);
  if (!existing) {
    return null;
  }

  const updated = {
    ...existing,
    ...validateDetails({
      ...existing,
      amount: paiseToInputString(existing.amountPaise),
      ...changes,
    }),
  };
  persistTransactions(transactions.map((transaction) =>
    transaction.id === id ? updated : transaction
  ));
  return copyTransaction(updated);
}

export function deleteTransaction(id) {
  if (!transactions.some((transaction) => transaction.id === id)) {
    return false;
  }

  persistTransactions(transactions.filter((transaction) => transaction.id !== id));
  return true;
}

export function listTransactions() {
  return transactions
    .map(copyTransaction)
    .sort((first, second) =>
      second.date.localeCompare(first.date) ||
      second.createdAt.localeCompare(first.createdAt)
    );
}

function isValidMonth(value) {
  return typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

function normalizeBudgets(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    console.error(`Saved data for "${BUDGET_STORAGE_KEY}" is not a budget map.`);
    return Object.create(null);
  }

  const budgets = Object.create(null);
  for (const [month, budget] of Object.entries(value)) {
    if (
      !isValidMonth(month) ||
      budget === null ||
      typeof budget !== "object" ||
      Array.isArray(budget)
    ) {
      continue;
    }

    const overallPaise = Number.isSafeInteger(budget.overallPaise) &&
      budget.overallPaise >= 0
      ? budget.overallPaise
      : null;
    const categories = Object.create(null);
    if (budget.categories !== null && typeof budget.categories === "object") {
      for (const [category, amountPaise] of Object.entries(budget.categories)) {
        if (
          TRANSACTION_CATEGORIES.includes(category) &&
          Number.isSafeInteger(amountPaise) &&
          amountPaise >= 0
        ) {
          categories[category] = amountPaise;
        }
      }
    }

    budgets[month] = { overallPaise, categories };
  }
  return budgets;
}

const savedBudgets = loadData(BUDGET_STORAGE_KEY, {});
let monthlyBudgets = normalizeBudgets(savedBudgets);

if (JSON.stringify(savedBudgets) !== JSON.stringify(monthlyBudgets)) {
  try {
    saveData(BUDGET_STORAGE_KEY, monthlyBudgets);
  } catch (error) {
    console.error("Could not normalize saved monthly budgets.", error);
  }
}

export function getMonthlyBudget(month) {
  if (!isValidMonth(month)) {
    throw new TypeError("Choose a valid budget month.");
  }

  const budget = monthlyBudgets[month] ?? { overallPaise: null, categories: {} };
  return {
    overallPaise: budget.overallPaise,
    categories: { ...budget.categories },
    overall: budget.overallPaise === null
      ? null
      : paiseToRupees(budget.overallPaise),
    categoryLimits: Object.fromEntries(
      Object.entries(budget.categories).map(([category, amountPaise]) => [
        category,
        paiseToRupees(amountPaise),
      ])
    ),
  };
}

export function saveMonthlyBudget(month, details) {
  if (!isValidMonth(month)) {
    throw new TypeError("Choose a valid budget month.");
  }
  if (details === null || typeof details !== "object" || Array.isArray(details)) {
    throw new TypeError("Budget details must be an object.");
  }

  const overallPaise = details.overall === "" || details.overall == null
    ? null
    : parseRupeesToPaise(details.overall, true);
  if (details.overall !== "" && details.overall != null && overallPaise === null) {
    throw new TypeError("Overall budget must be zero or more with no more than two decimal places.");
  }

  const categoryLimits = details.categories ?? {};
  if (categoryLimits === null || typeof categoryLimits !== "object" || Array.isArray(categoryLimits)) {
    throw new TypeError("Category limits must be an object.");
  }

  const categories = Object.create(null);
  for (const [category, amount] of Object.entries(categoryLimits)) {
    if (!TRANSACTION_CATEGORIES.includes(category)) {
      throw new TypeError("Choose a valid category for each budget.");
    }
    if (amount === "" || amount == null) {
      continue;
    }
    const amountPaise = parseRupeesToPaise(amount, true);
    if (amountPaise === null) {
      throw new TypeError(`${category} budget must be zero or more with no more than two decimal places.`);
    }
    categories[category] = amountPaise;
  }

  const nextBudgets = {
    ...monthlyBudgets,
    [month]: { overallPaise, categories },
  };
  saveData(BUDGET_STORAGE_KEY, nextBudgets);
  monthlyBudgets = nextBudgets;
  document.dispatchEvent(new Event("lifeos:expenses-changed"));
  return getMonthlyBudget(month);
}
