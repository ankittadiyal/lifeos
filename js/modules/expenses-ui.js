import {
  calculateMonthlySummary,
  createTransaction,
  deleteTransaction,
  getTodayDateString,
  listTransactions,
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
  amount.textContent = currencyFormatter.format(transaction.amount);
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

  incomeTotal.textContent = currencyFormatter.format(summary.income);
  expensesTotal.textContent = currencyFormatter.format(summary.expenses);
  balanceTotal.textContent = currencyFormatter.format(summary.balance);
  const [year, month] = summary.month.split("-").map(Number);
  monthLabel.textContent = monthFormatter.format(new Date(year, month - 1, 1));
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
  amountInput.value = String(transaction.amount);
  categoryInput.value = transaction.category;
  dateInput.value = transaction.date;
  descriptionInput.value = transaction.description;
  submitButton.textContent = "Save changes";
  cancelButton.hidden = false;
  message.textContent = `Editing ${transaction.category} transaction.`;
  typeInput.focus();
}

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
renderTransactions();
