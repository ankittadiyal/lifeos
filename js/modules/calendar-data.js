function isValidLocalDateString(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day;
}

export function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function createMonthGrid(year, monthIndex) {
  if (!Number.isInteger(year) || !Number.isInteger(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    throw new TypeError("Provide a valid year and month index.");
  }

  const firstDay = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const leadingBlankDays = firstDay.getDay();
  const cellCount = Math.ceil((leadingBlankDays + daysInMonth) / 7) * 7;

  return Array.from({ length: cellCount }, (_, index) => {
    const day = index - leadingBlankDays + 1;
    return day >= 1 && day <= daysInMonth
      ? formatLocalDate(new Date(year, monthIndex, day))
      : null;
  });
}

export function groupTasksByDueDate(taskList, year, monthIndex) {
  const month = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
  const tasksByDate = new Map();

  for (const task of taskList) {
    if (
      typeof task.dueDate !== "string" ||
      !task.dueDate.startsWith(`${month}-`) ||
      !isValidLocalDateString(task.dueDate)
    ) {
      continue;
    }

    const dateTasks = tasksByDate.get(task.dueDate) ?? [];
    dateTasks.push(task);
    tasksByDate.set(task.dueDate, dateTasks);
  }

  for (const dateTasks of tasksByDate.values()) {
    dateTasks.sort((first, second) => first.title.localeCompare(second.title));
  }

  return tasksByDate;
}

export function formatAgendaDate(dateString) {
  if (!isValidLocalDateString(dateString)) {
    throw new TypeError("Provide a valid local calendar date.");
  }

  const [year, month, day] = dateString.split("-").map(Number);
  return new Intl.DateTimeFormat("en", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(year, month - 1, day));
}
