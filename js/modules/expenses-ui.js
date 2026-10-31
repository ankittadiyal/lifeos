import {
  calculateMonthlySummary,
  createTransaction,
  deleteTransaction,
  getTodayDateString,
  getMonthlyBudget,
  listTransactions,
  saveMonthlyBudget,
  calculateBudgetStatus,
  TRANSACTION_CATEGORIES,
  updateTransaction,
} from "./expenses.js";

const form = document.querySelector("#expense-form");
const typeInput = document.querySelector("#expense-type");
const amountInput = document.querySelector("#expense-amount");
const categoryInput = document.querySelector("#expense-category");
const dateInput = document.querySelector("#expense-date");
const descriptionInput = document.querySelector("#expense-description");
const submitButton = document.querySelector("#expense-submit");
const cancelButton = document.querySelector("#expense-cancel-edit");
const message = document.querySelector("#expense-message");
const transactionList = document.querySelector("#transaction-list");
const incomeTotal = document.querySelector("#expense-income-total");
const expensesTotal = document.querySelector("#expense-outgoing-total");
const balanceTotal = document.querySelector("#expense-balance-total");
const monthLabel = document.querySelector("#expense-month-label");
const budgetForm = document.querySelector("#budget-form");
const budgetMessage = document.querySelector("#budget-message");
const budgetStatus = document.querySelector("#budget-status");
let editingTransactionId = null;

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const monthFormatter = new Intl.DateTimeFormat("en-IN", {
  month: "long",
  year: "numeric",
});

dateInput.value = getTodayDateString();

function showStorageError(error) {
  console.error("Could not save transaction data.", error);
  message.textContent =
    "Your browser could not save this change. Check its storage settings and try again.";
}

function getCurrentMonthString() {
  const today = getTodayDateString();
  return today.slice(0, 7);
}

function formatPaise(amountPaise) {
  const amount = BigInt(amountPaise);
  const isNegative = amount < 0n;
  const absoluteAmount = isNegative ? -amount : amount;
  const rupees = absoluteAmount / 100n;
  const paise = String(absoluteAmount % 100n).padStart(2, "0");
  const formattedParts = currencyFormatter.formatToParts(rupees);
  const formattedAmount = formattedParts
    .map((part) => part.type === "fraction" ? paise : part.value)
    .join("");

  if (!isNegative) {
    return formattedAmount;
  }

  const minusSign = new Intl.NumberFormat("en-IN")
    .formatToParts(-1)
    .find((part) => part.type === "minusSign")?.value ?? "-";
  return `${minusSign}${formattedAmount}`;
}

function formatPaiseForInput(amountPaise) {
  const amount = BigInt(amountPaise);
  const rupees = amount / 100n;
  const paise = String(amount % 100n).padStart(2, "0");
  return `${rupees}.${paise}`;
}

function createBudgetNotice(status) {
  const paragraph = document.createElement("p");
  paragraph.className = `budget-status__notice budget-status__notice--${status.status}`;

  if (status.status === "exceeded") {
    const exceededBy = status.remainingPaise < 0n
      ? -status.remainingPaise
      : status.remainingPaise;
    paragraph.textContent =
      `Budget exceeded by ${formatPaise(exceededBy)}; ` +
      `remaining: ${formatPaise(status.remainingPaise)}.`;
  } else if (status.status === "reached") {
    paragraph.textContent = `Budget reached. Remaining: ${formatPaise(0n)}.`;
  } else {
    paragraph.textContent = `Remaining: ${formatPaise(status.remainingPaise)}.`;
  }
  return paragraph;
}

function createCategoryBudgetRow(status) {
  const item = document.createElement("li");
  item.className = "budget-status__category";

  const name = document.createElement("strong");
  name.textContent = status.category;

  const figures = document.createElement("span");
  figures.textContent =
    `Spent ${formatPaise(status.spentPaise)} of ${formatPaise(status.limitPaise)}`;

  item.append(name, figures, createBudgetNotice(status));
  return item;
}

function loadBudgetInputs() {
  const budget = getMonthlyBudget(getCurrentMonthString());
  budgetForm.elements.overall.value = budget.overall === null ? "" : String(budget.overall);

  for (const category of TRANSACTION_CATEGORIES) {
    const categoryInput = budgetForm.elements.namedItem(category);
    const categoryLimit = budget.categoryLimits[category];
    categoryInput.value = categoryLimit === undefined ? "" : String(categoryLimit);
  }
}

function renderBudgetStatus(transactionList, month) {
  const budget = getMonthlyBudget(month);
  const status = calculateBudgetStatus(transactionList, month, budget);
  budgetStatus.replaceChildren();

  const heading = document.createElement("h5");
  heading.className = "budget-status__heading";
  heading.textContent = "Spending against budgets";
  budgetStatus.append(heading);

  const overall = document.createElement("section");
  overall.className = "budget-status__overall";
  const overallTitle = document.createElement("h6");
  overallTitle.textContent = "Overall";
  overall.append(overallTitle);

  if (status.overall === null) {
    const noOverallLimit = document.createElement("p");
    noOverallLimit.className = "budget-status__empty";
    noOverallLimit.textContent = "No overall spending limit set for this month.";
    overall.append(noOverallLimit);
  } else {
    const spent = document.createElement("p");
    spent.textContent =
      `Spent ${formatPaise(status.overall.spentPaise)} of ${formatPaise(status.overall.limitPaise)}`;
    overall.append(spent, createBudgetNotice(status.overall));
  }
  budgetStatus.append(overall);

  const categories = document.createElement("section");
  categories.className = "budget-status__categories";
  const categoryTitle = document.createElement("h6");
  categoryTitle.textContent = "Category limits";
  const categoryList = document.createElement("ul");
  categoryList.className = "budget-status__list";
  categoryList.setAttribute("aria-label", "Category budget status");
  categories.append(categoryTitle, categoryList);

  if (status.categories.length === 0) {
    const empty = document.createElement("li");
    empty.className = "budget-status__empty";
    empty.textContent = "No category limits set for this month.";
    categoryList.append(empty);
  } else {
    for (const categoryStatus of status.categories) {
      categoryList.append(createCategoryBudgetRow(categoryStatus));
    }
  }
  budgetStatus.append(categories);
}

function createTransactionItem(transaction) {
  const item = document.createElement("li");
  item.className = "transaction-item";
  item.dataset.transactionId = transaction.id;

  const main = document.createElement("div");
  main.className = "transaction-item__main";

  const heading = document.createElement("div");
  heading.className = "transaction-item__heading";

  const category = document.createElement("h5");
  category.textContent = transaction.category;

  const type = document.createElement("span");
  type.className = `transaction-item__type transaction-item__type--${transaction.type}`;
  type.textContent = transaction.type === "income" ? "Income" : "Expense";

  const amount = document.createElement("strong");
  amount.className = `transaction-item__amount transaction-item__amount--${transaction.type}`;
  amount.textContent = formatPaise(transaction.amountPaise);
  heading.append(category, type, amount);

  const date = document.createElement("time");
  date.className = "transaction-item__date";
  date.dateTime = transaction.date;
  date.textContent = transaction.date;
  main.append(heading, date);

  if (transaction.description) {
    const description = document.createElement("p");
    description.className = "transaction-item__description";
    description.textContent = transaction.description;
    main.append(description);
  }

  const actions = document.createElement("div");
  actions.className = "transaction-item__actions";

  const editButton = document.createElement("button");
  editButton.className = "task-item__action";
  editButton.type = "button";
  editButton.dataset.transactionAction = "edit";
  editButton.textContent = "Edit";
  editButton.setAttribute("aria-label", `Edit ${transaction.category} transaction`);

  const deleteButton = document.createElement("button");
  deleteButton.className = "task-item__action task-item__action--delete";
  deleteButton.type = "button";
  deleteButton.dataset.transactionAction = "delete";
  deleteButton.textContent = "Delete";
  deleteButton.setAttribute("aria-label", `Delete ${transaction.category} transaction`);

  actions.append(editButton, deleteButton);
  item.append(main, actions);
  return item;
}

function renderTransactions() {
  const currentTransactions = listTransactions();
  const summary = calculateMonthlySummary(currentTransactions);

  incomeTotal.textContent = formatPaise(summary.incomePaise);
  expensesTotal.textContent = formatPaise(summary.expensesPaise);
  balanceTotal.textContent = formatPaise(summary.balancePaise);
  const [year, month] = summary.month.split("-").map(Number);
  monthLabel.textContent = monthFormatter.format(new Date(year, month - 1, 1));
  renderBudgetStatus(currentTransactions, summary.month);
  transactionList.replaceChildren();

  if (currentTransactions.length === 0) {
    const emptyState = document.createElement("li");
    emptyState.className = "transaction-list__empty";
    emptyState.textContent = "No transactions yet. Add income or an expense above.";
    transactionList.append(emptyState);
    return;
  }

  for (const transaction of currentTransactions) {
    transactionList.append(createTransactionItem(transaction));
  }
}

function resetForm() {
  form.reset();
  dateInput.value = getTodayDateString();
  editingTransactionId = null;
  submitButton.textContent = "Add transaction";
  cancelButton.hidden = true;
  message.textContent = "";
}

function beginEditing(transactionId) {
  const transaction = listTransactions().find((item) => item.id === transactionId);
  if (!transaction) {
    message.textContent = "That transaction could not be found.";
    return;
  }

  editingTransactionId = transaction.id;
  typeInput.value = transaction.type;
  amountInput.value = formatPaiseForInput(transaction.amountPaise);
  categoryInput.value = transaction.category;
  dateInput.value = transaction.date;
  descriptionInput.value = transaction.description;
  submitButton.textContent = "Save changes";
  cancelButton.hidden = false;
  message.textContent = `Editing ${transaction.category} transaction.`;
  typeInput.focus();
}

budgetForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const categories = Object.fromEntries(
    TRANSACTION_CATEGORIES.map((category) => [
      category,
      budgetForm.elements.namedItem(category).value,
    ])
  );

  try {
    saveMonthlyBudget(getCurrentMonthString(), {
      overall: budgetForm.elements.overall.value,
      categories,
    });
    budgetMessage.textContent = "This month's budgets saved.";
    renderTransactions();
  } catch (error) {
    if (error instanceof TypeError) {
      budgetMessage.textContent = error.message;
      return;
    }
    console.error("Could not save monthly budgets.", error);
    budgetMessage.textContent =
      "Your browser could not save these budgets. Check its storage settings and try again.";
  }
});

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const details = {
    type: typeInput.value,
    amount: amountInput.value,
    category: categoryInput.value,
    date: dateInput.value,
    description: descriptionInput.value,
  };

  try {
    if (editingTransactionId) {
      updateTransaction(editingTransactionId, details);
      message.textContent = "Transaction updated.";
    } else {
      createTransaction(details);
      message.textContent = "Transaction added.";
    }
    form.reset();
    dateInput.value = getTodayDateString();
    editingTransactionId = null;
    submitButton.textContent = "Add transaction";
    cancelButton.hidden = true;
    renderTransactions();
  } catch (error) {
    if (error instanceof TypeError) {
      message.textContent = error.message;
      return;
    }
    showStorageError(error);
  }
});

transactionList.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) {
    return;
  }

  const actionButton = event.target.closest("[data-transaction-action]");
  const item = actionButton?.closest(".transaction-item");
  if (!actionButton || !item) {
    return;
  }

  const transactionId = item.dataset.transactionId;
  if (actionButton.dataset.transactionAction === "edit") {
    beginEditing(transactionId);
    return;
  }

  if (actionButton.dataset.transactionAction === "delete") {
    try {
      deleteTransaction(transactionId);
      if (editingTransactionId === transactionId) {
        resetForm();
      }
      message.textContent = "Transaction deleted.";
      renderTransactions();
    } catch (error) {
      showStorageError(error);
    }
  }
});

cancelButton.addEventListener("click", resetForm);
loadBudgetInputs();
renderTransactions();
