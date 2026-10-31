import { loadData, saveData } from "../storage.js";

const STORAGE_KEY = "lifeos.transactions";
const TRANSACTION_TYPES = ["income", "expense"];
const CATEGORIES = ["Food", "Travel", "Shopping", "Bills", "Education", "Other"];

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

function normalizeTransactions(value) {
  if (!Array.isArray(value)) {
    console.error(`Saved data for "${STORAGE_KEY}" is not a transaction list.`);
    return [];
  }

  const usedIds = new Set();
  return value.flatMap((transaction) => {
    if (
      transaction === null ||
      typeof transaction !== "object" ||
      !TRANSACTION_TYPES.includes(transaction.type) ||
      !Number.isFinite(transaction.amount) ||
      transaction.amount <= 0 ||
      !CATEGORIES.includes(transaction.category) ||
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
      amount: transaction.amount,
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
}

function validateDetails(details) {
  if (details === null || typeof details !== "object" || Array.isArray(details)) {
    throw new TypeError("Transaction details must be an object.");
  }

  const type = details.type;
  const amountInput = details.amount;
  const amount = typeof amountInput === "number"
    ? amountInput
    : typeof amountInput === "string" && amountInput.trim() !== ""
      ? Number(amountInput)
      : Number.NaN;
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
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new TypeError("Enter an amount greater than zero.");
  }
  if (!CATEGORIES.includes(category)) {
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

  return { type, amount, category, date, description };
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
  return { ...transaction };
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
    ...validateDetails({ ...existing, ...changes }),
  };
  persistTransactions(transactions.map((transaction) =>
    transaction.id === id ? updated : transaction
  ));
  return { ...updated };
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
    .map((transaction) => ({ ...transaction }))
    .sort((first, second) =>
      second.date.localeCompare(first.date) ||
      second.createdAt.localeCompare(first.createdAt)
    );
}

export function calculateMonthlySummary(transactionList, referenceDate = new Date()) {
  const month = `${referenceDate.getFullYear()}-${String(
    referenceDate.getMonth() + 1
  ).padStart(2, "0")}`;
  let income = 0;
  let expenses = 0;

  for (const transaction of transactionList) {
    if (
      !isValidDate(transaction.date) ||
      transaction.date.slice(0, 7) !== month ||
      !Number.isFinite(transaction.amount) ||
      transaction.amount <= 0
    ) {
      continue;
    }

    if (transaction.type === "income") {
      income += transaction.amount;
    } else if (transaction.type === "expense") {
      expenses += transaction.amount;
    }
  }

  income = Math.round((income + Number.EPSILON) * 100) / 100;
  expenses = Math.round((expenses + Number.EPSILON) * 100) / 100;
  return {
    month,
    income,
    expenses,
    balance: Math.round((income - expenses + Number.EPSILON) * 100) / 100,
  };
}