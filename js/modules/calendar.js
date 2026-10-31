import { listTasks } from "./tasks.js";
import {
  createMonthGrid,
  formatAgendaDate,
  formatLocalDate,
  groupTasksByDueDate,
} from "./calendar-data.js";

const monthTitle = document.querySelector("#calendar-month-title");
const monthGrid = document.querySelector("#calendar-grid");
const agendaTitle = document.querySelector("#calendar-agenda-title");
const agendaList = document.querySelector("#calendar-agenda-list");
const previousButton = document.querySelector("#calendar-previous-month");
const nextButton = document.querySelector("#calendar-next-month");
const todayButton = document.querySelector("#calendar-today");
const monthFormatter = new Intl.DateTimeFormat("en", {
  month: "long",
  year: "numeric",
});

const today = new Date();
let visibleYear = today.getFullYear();
let visibleMonth = today.getMonth();
let selectedDate = formatLocalDate(today);

function createTaskAgendaItem(task) {
  const item = document.createElement("li");
  item.className = task.completed
    ? "calendar-agenda__item calendar-agenda__item--completed"
    : "calendar-agenda__item";

  const title = document.createElement("strong");
  title.className = "calendar-agenda__task-title";
  title.textContent = task.title;

  const details = document.createElement("span");
  details.className = "calendar-agenda__details";
  details.textContent = `${task.category} · ${task.priority} priority${task.estimatedMinutes ? ` · ${task.estimatedMinutes} min` : ""}`;
  item.append(title, details);

  if (task.completed) {
    const status = document.createElement("span");
    status.className = "calendar-agenda__completed";
    status.textContent = "Completed";
    item.append(status);
  }

  return item;
}

function renderAgenda(tasksByDate) {
  agendaTitle.textContent = formatAgendaDate(selectedDate);
  agendaList.replaceChildren();

  const agendaTasks = tasksByDate.get(selectedDate) ?? [];
  if (agendaTasks.length === 0) {
    const emptyState = document.createElement("li");
    emptyState.className = "calendar-agenda__empty";
    emptyState.textContent = "No tasks due on this date.";
    agendaList.append(emptyState);
    return;
  }

  for (const task of agendaTasks) {
    agendaList.append(createTaskAgendaItem(task));
  }
}

function renderCalendar() {
  const firstOfMonth = new Date(visibleYear, visibleMonth, 1);
  monthTitle.textContent = monthFormatter.format(firstOfMonth);
  const tasksByDate = groupTasksByDueDate(listTasks(), visibleYear, visibleMonth);
  const monthCells = createMonthGrid(visibleYear, visibleMonth);
  monthGrid.replaceChildren();

  for (const date of monthCells) {
    const cell = document.createElement("div");
    cell.className = "calendar-grid__cell";

    if (date === null) {
      cell.setAttribute("aria-hidden", "true");
      monthGrid.append(cell);
      continue;
    }

    const day = Number(date.slice(-2));
    const dateTasks = tasksByDate.get(date) ?? [];
    const button = document.createElement("button");
    button.className = "calendar-day";
    button.type = "button";
    button.dataset.calendarDate = date;
    button.setAttribute("aria-pressed", String(date === selectedDate));
    button.setAttribute(
      "aria-label",
      `${formatAgendaDate(date)}${dateTasks.length ? `, ${dateTasks.length} ${dateTasks.length === 1 ? "task" : "tasks"}` : ", no tasks"}`
    );

    if (date === selectedDate) {
      button.classList.add("calendar-day--selected");
    }
    if (date === formatLocalDate(today)) {
      button.classList.add("calendar-day--today");
    }

    const number = document.createElement("span");
    number.className = "calendar-day__number";
    number.textContent = String(day);
    button.append(number);

    if (dateTasks.length > 0) {
      const count = document.createElement("span");
      count.className = "calendar-day__task-count";
      count.textContent = String(dateTasks.length);
      button.append(count);
    }

    cell.append(button);
    monthGrid.append(cell);
  }

  renderAgenda(tasksByDate);
}

function moveMonth(offset) {
  const nextMonth = new Date(visibleYear, visibleMonth + offset, 1);
  visibleYear = nextMonth.getFullYear();
  visibleMonth = nextMonth.getMonth();

  const daysInMonth = new Date(visibleYear, visibleMonth + 1, 0).getDate();
  const selectedDay = Math.min(Number(selectedDate.slice(-2)), daysInMonth);
  selectedDate = formatLocalDate(new Date(visibleYear, visibleMonth, selectedDay));
  renderCalendar();
}

previousButton.addEventListener("click", () => moveMonth(-1));
nextButton.addEventListener("click", () => moveMonth(1));
todayButton.addEventListener("click", () => {
  const currentDate = new Date();
  visibleYear = currentDate.getFullYear();
  visibleMonth = currentDate.getMonth();
  selectedDate = formatLocalDate(currentDate);
  renderCalendar();
});

monthGrid.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) {
    return;
  }

  const dayButton = event.target.closest("[data-calendar-date]");
  if (!dayButton) {
    return;
  }

  selectedDate = dayButton.dataset.calendarDate;
  renderCalendar();
});

document.addEventListener("lifeos:tasks-changed", renderCalendar);
renderCalendar();