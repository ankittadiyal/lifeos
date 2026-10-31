import { listTasks } from "./tasks.js";
import {
  getHabitCompletionDates,
  listHabits,
} from "./habits.js";
import { calculateHabitAnalytics } from "./habit-analytics.js";
import { listProblems } from "./dsa.js";
import { calculateDsaInsights } from "./dsa-insights.js";
import {
  calculateBudgetStatus,
  calculateMonthlySummary,
  getMonthlyBudget,
  getTodayDateString as getExpenseTodayDateString,
  listTransactions,
} from "./expenses.js";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_LIST_ITEMS = 4;
const currencyFormatter = new Intl.NumberFormat("en-IN");
const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
});

export function countAllTasks(tasks) {
  return tasks.length;
}

export function countCompletedTasks(tasks) {
  return tasks.reduce((count, task) => count + Number(task.completed), 0);
}

export function countPendingTasks(tasks) {
  return tasks.filter((task) => !task.completed).length;
}

export function getCompletionPercentage(tasks) {
  const totalTasks = countAllTasks(tasks);
  return totalTasks === 0
    ? 0
    : Math.round((countCompletedTasks(tasks) / totalTasks) * 100);
}

function isValidDateString(value) {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(dateString) {
  if (!isValidDateString(dateString)) {
    return "Date unavailable";
  }

  const [year, month, day] = dateString.split("-").map(Number);
  return dateFormatter.format(new Date(year, month - 1, day, 12));
}

function formatPaise(amountPaise) {
  const amount = BigInt(amountPaise);
  const rupees = amount / 100n;
  const paise = String(amount % 100n).padStart(2, "0");
  return `₹${currencyFormatter.format(Number(rupees))}.${paise}`;
}

export function calculateDashboardSummary({
  taskList,
  habits,
  getCompletionDates,
  problems,
  transactions,
  budget,
  now = new Date(),
}) {
  const today = formatLocalDate(now);
  const month = today.slice(0, 7);
  const todayTasks = taskList
    .filter((task) => task.dueDate === today)
    .sort((first, second) =>
      Number(first.completed) - Number(second.completed) ||
      first.title.localeCompare(second.title)
    );
  const completedTodayTasks = countCompletedTasks(todayTasks);
  const habitStreaks = habits.map((habit) => ({
    id: habit.id,
    title: habit.title,
    currentStreak: calculateHabitAnalytics(
      getCompletionDates(habit.id),
      today
    ).currentStreak,
  }));
  const dsaInsights = calculateDsaInsights(problems, now);
  const monthlySummary = calculateMonthlySummary(transactions, now);
  const budgetStatus = calculateBudgetStatus(transactions, month, budget);
  const monthlyExpenseCount = transactions.filter((transaction) =>
    transaction.type === "expense" &&
    isValidDateString(transaction.date) &&
    transaction.date.slice(0, 7) === month
  ).length;
  const upcomingDeadlines = taskList
    .filter((task) =>
      !task.completed &&
      isValidDateString(task.dueDate) &&
      task.dueDate > today
    )
    .sort((first, second) =>
      first.dueDate.localeCompare(second.dueDate) ||
      first.title.localeCompare(second.title)
    )
    .slice(0, MAX_LIST_ITEMS);

  return {
    today,
    todayTasks,
    completedTodayTasks,
    totalTasks: countAllTasks(taskList),
    completedTasks: countCompletedTasks(taskList),
    completionRate: taskList.length === 0
      ? null
      : getCompletionPercentage(taskList),
    habitStreaks,
    totalProblems: problems.length,
    totalSolved: dsaInsights.totalSolved,
    dueForRevision: dsaInsights.dueForRevision.slice(0, MAX_LIST_ITEMS),
    totalRevisionDue: dsaInsights.dueForRevision.length,
    month,
    monthlySpendingPaise: monthlySummary.expensesPaise,
    monthlyExpenseCount,
    overallBudget: budgetStatus.overall,
    upcomingDeadlines,
  };
}

function appendEmptyState(list, text) {
  const item = document.createElement("li");
  item.className = "dashboard-card__empty";
  item.textContent = text;
  list.append(item);
}

function createListItem(titleText, detailText, href) {
  const item = document.createElement("li");
  const link = document.createElement("a");
  link.className = "dashboard-card__item";
  link.href = href;

  const title = document.createElement("span");
  title.className = "dashboard-card__item-title";
  title.textContent = titleText;
  link.append(title);

  if (detailText) {
    const detail = document.createElement("span");
    detail.className = "dashboard-card__item-detail";
    detail.textContent = detailText;
    link.append(detail);
  }

  item.append(link);
  return item;
}

function renderTodayTasks(summary) {
  const taskList = document.querySelector("#dashboard-today-tasks");
  const progress = document.querySelector("#dashboard-today-progress");
  const progressText = document.querySelector("#dashboard-today-progress-text");
  const todayDetail = document.querySelector("#dashboard-today-detail");
  const count = document.querySelector("#dashboard-today-count");
  taskList.replaceChildren();
  count.textContent = String(summary.todayTasks.length);

  if (summary.completionRate === null) {
    progress.hidden = true;
    progressText.textContent = "No tasks tracked yet.";
  } else {
    progress.hidden = false;
    progress.value = summary.completionRate;
    progress.setAttribute(
      "aria-label",
      `Overall task completion: ${summary.completionRate}%`
    );
    progressText.textContent =
      `Overall completion · ${summary.completedTasks} of ${summary.totalTasks} tasks · ` +
      `${summary.completionRate}%`;
  }

  todayDetail.textContent = summary.todayTasks.length === 0
    ? "No tasks due today."
    : `${summary.completedTodayTasks} of ${summary.todayTasks.length} due today complete.`;

  if (summary.todayTasks.length === 0) {
    appendEmptyState(taskList, "Add a task with today's due date to see it here.");
    return;
  }

  for (const task of summary.todayTasks.slice(0, MAX_LIST_ITEMS)) {
    taskList.append(createListItem(
      task.title,
      `${task.completed ? "Completed" : task.priority + " priority"} · ${task.category}`,
      "#tasks-study"
    ));
  }

  if (summary.todayTasks.length > MAX_LIST_ITEMS) {
    appendEmptyState(
      taskList,
      `${summary.todayTasks.length - MAX_LIST_ITEMS} more due today.`
    );
  }
}

function renderHabitStreaks(summary) {
  const habitList = document.querySelector("#dashboard-habit-streaks");
  const activeStreakCount = summary.habitStreaks.filter(
    (habit) => habit.currentStreak > 0
  ).length;
  document.querySelector("#dashboard-active-streak-count").textContent =
    String(activeStreakCount);
  habitList.replaceChildren();

  if (summary.habitStreaks.length === 0) {
    appendEmptyState(habitList, "Add a habit to start building a streak.");
    return;
  }

  for (const habit of summary.habitStreaks.slice(0, MAX_LIST_ITEMS)) {
    const streakLabel = `${habit.currentStreak} ${habit.currentStreak === 1 ? "day" : "days"}`;
    habitList.append(createListItem(
      habit.title,
      `${streakLabel} current streak`,
      "#habits"
    ));
  }

  if (summary.habitStreaks.length > MAX_LIST_ITEMS) {
    appendEmptyState(
      habitList,
      `${summary.habitStreaks.length - MAX_LIST_ITEMS} more habits.`
    );
  }
}

function renderDsa(summary) {
  document.querySelector("#dashboard-solved-count").textContent =
    String(summary.totalSolved);
  document.querySelector("#dashboard-revision-count").textContent =
    String(summary.totalRevisionDue);
  document.querySelector("#dashboard-dsa-empty").hidden =
    summary.totalProblems > 0;
  const revisionList = document.querySelector("#dashboard-revisions");
  revisionList.replaceChildren();

  if (summary.dueForRevision.length === 0) {
    appendEmptyState(revisionList, "No problems are due for revision.");
    return;
  }

  for (const problem of summary.dueForRevision) {
    revisionList.append(createListItem(
      problem.title,
      `Due ${formatDate(problem.nextRevisionDate)}`,
      "#dsa-tracker"
    ));
  }
}

function renderMonthlySpending(summary) {
  const spent = document.querySelector("#dashboard-spending");
  const budgetText = document.querySelector("#dashboard-budget-text");
  const progress = document.querySelector("#dashboard-budget-progress");
  spent.textContent = formatPaise(summary.monthlySpendingPaise);
  const noExpensesMessage = summary.monthlyExpenseCount === 0
    ? "No expenses recorded this month. "
    : "";

  if (summary.overallBudget === null) {
    budgetText.textContent =
      `${noExpensesMessage}No overall budget set for this month.`;
    progress.hidden = true;
    return;
  }

  const { limitPaise, remainingPaise, status, spentPaise } =
    summary.overallBudget;
  const percent = limitPaise === 0n
    ? (spentPaise > 0n ? 100 : 0)
    : spentPaise >= limitPaise
      ? 100
      : Number((spentPaise * 100n + limitPaise / 2n) / limitPaise);
  progress.hidden = false;
  progress.value = Math.min(percent, 100);
  progress.setAttribute(
    "aria-label",
    `Monthly spending budget: ${Math.min(percent, 100)}% used`
  );
  budgetText.textContent = noExpensesMessage + (status === "exceeded"
    ? `Budget exceeded by ${formatPaise(-remainingPaise)}.`
    : status === "reached"
      ? "Monthly budget reached."
      : `${formatPaise(remainingPaise)} remaining of ${formatPaise(limitPaise)}.`);
}

function renderUpcomingDeadlines(summary) {
  const deadlineList = document.querySelector("#dashboard-deadlines");
  deadlineList.replaceChildren();

  if (summary.upcomingDeadlines.length === 0) {
    appendEmptyState(deadlineList, "No upcoming task deadlines. Add a due date to a task to see it here.");
    return;
  }

  for (const task of summary.upcomingDeadlines) {
    deadlineList.append(createListItem(
      task.title,
      `Due ${formatDate(task.dueDate)} · ${task.category}`,
      "#tasks-study"
    ));
  }
}

function renderDashboard() {
  const today = new Date();
  const summary = calculateDashboardSummary({
    taskList: listTasks(),
    habits: listHabits(),
    getCompletionDates: getHabitCompletionDates,
    problems: listProblems(),
    transactions: listTransactions(),
    budget: getMonthlyBudget(getExpenseTodayDateString(today).slice(0, 7)),
    now: today,
  });

  renderTodayTasks(summary);
  renderHabitStreaks(summary);
  renderDsa(summary);
  renderMonthlySpending(summary);
  renderUpcomingDeadlines(summary);
}

for (const eventName of [
  "lifeos:tasks-changed",
  "lifeos:dsa-changed",
  "lifeos:habits-changed",
  "lifeos:expenses-changed",
]) {
  document.addEventListener(eventName, renderDashboard);
}

renderDashboard();
