import {
  createHabit,
  deleteHabit,
  getHabitCompletionDates,
  getTodayDateString,
  isHabitCompletedOnDate,
  listHabits,
  recordHabitCompletion,
  updateHabit,
} from "./habits.js";
import { calculateHabitAnalytics } from "./habit-analytics.js";

const form = document.querySelector("#habit-form");
const titleInput = document.querySelector("#habit-title");
const frequencyInput = document.querySelector("#habit-frequency");
const dateInput = document.querySelector("#habit-check-in-date");
const submitButton = document.querySelector("#habit-submit");
const cancelButton = document.querySelector("#habit-cancel-edit");
const message = document.querySelector("#habit-message");
const habitList = document.querySelector("#habit-list");
let editingHabitId = null;

dateInput.value = getTodayDateString();

function showStorageError(error) {
  console.error("Could not save habit data.", error);
  message.textContent =
    "Your browser could not save this change. Check its storage settings and try again.";
}

function createHistory(habitId) {
  const details = document.createElement("details");
  details.className = "habit-item__history";

  const summary = document.createElement("summary");
  const dates = getHabitCompletionDates(habitId);
  summary.textContent = `Check-in history (${dates.length})`;
  details.append(summary);

  if (dates.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "No check-ins recorded yet.";
    details.append(empty);
    return details;
  }

  const dateList = document.createElement("ul");
  for (const date of dates) {
    const item = document.createElement("li");
    const time = document.createElement("time");
    time.dateTime = date;
    time.textContent = date;
    item.append(time);
    dateList.append(item);
  }
  details.append(dateList);
  return details;
}

function createHabitItem(habit, selectedDate) {
  const item = document.createElement("li");
  item.className = "habit-item";
  item.dataset.habitId = habit.id;

  const details = document.createElement("div");
  details.className = "habit-item__details";

  const title = document.createElement("h5");
  title.className = "habit-item__title";
  title.textContent = habit.title;

  const target = document.createElement("p");
  target.className = "habit-item__target";
  target.textContent = `Target: ${habit.targetFrequency} ${habit.targetFrequency === 1 ? "time" : "times"} per week`;
  const analytics = calculateHabitAnalytics(
    getHabitCompletionDates(habit.id),
    getTodayDateString()
  );
  const analyticsLine = document.createElement("p");
  analyticsLine.className = "habit-item__analytics";
  analyticsLine.textContent =
    `Current streak: ${analytics.currentStreak} ${analytics.currentStreak === 1 ? "day" : "days"} · ` +
    `Longest: ${analytics.longestStreak} ${analytics.longestStreak === 1 ? "day" : "days"} · ` +
    `Last 7 days: ${analytics.sevenDayCompletionCount}/7 (${analytics.sevenDayCompletionRate}%)`;
  details.append(title, target, analyticsLine);

  const actions = document.createElement("div");
  actions.className = "habit-item__actions";

  const completeButton = document.createElement("button");
  completeButton.className = "button button--primary";
  completeButton.type = "button";
  completeButton.dataset.habitAction = "complete";
  const isCompleted = selectedDate && isHabitCompletedOnDate(habit.id, selectedDate);
  completeButton.disabled = !selectedDate || isCompleted;
  completeButton.textContent = !selectedDate
    ? "Choose date"
    : isCompleted
      ? "Completed"
      : "Mark complete";
  completeButton.setAttribute("aria-label", !selectedDate
    ? `Choose a date to mark ${habit.title} complete`
    : `${completeButton.disabled ? "Completed" : "Mark"} ${habit.title} for ${selectedDate}`
  );

  const renameButton = document.createElement("button");
  renameButton.className = "task-item__action";
  renameButton.type = "button";
  renameButton.dataset.habitAction = "rename";
  renameButton.textContent = "Rename";
  renameButton.setAttribute("aria-label", `Rename ${habit.title}`);

  const deleteButton = document.createElement("button");
  deleteButton.className = "task-item__action task-item__action--delete";
  deleteButton.type = "button";
  deleteButton.dataset.habitAction = "delete";
  deleteButton.textContent = "Delete";
  deleteButton.setAttribute("aria-label", `Delete ${habit.title}`);

  actions.append(completeButton, renameButton, deleteButton);
  item.append(details, actions, createHistory(habit.id));
  return item;
}

function renderHabits() {
  const selectedDate = dateInput.value;
  habitList.replaceChildren();

  if (!selectedDate) {
    message.textContent = "Choose a valid date before recording a check-in.";
  }

  const habits = listHabits();
  if (habits.length === 0) {
    const emptyState = document.createElement("li");
    emptyState.className = "habit-list__empty";
    emptyState.textContent = "No habits yet. Add one above to begin building a routine.";
    habitList.append(emptyState);
    return;
  }

  for (const habit of habits) {
    habitList.append(createHabitItem(habit, selectedDate));
  }
}

function resetForm() {
  form.reset();
  editingHabitId = null;
  submitButton.textContent = "Add habit";
  cancelButton.hidden = true;
  message.textContent = "";
  titleInput.focus();
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  try {
    if (editingHabitId) {
      updateHabit(editingHabitId, {
        title: titleInput.value,
        targetFrequency: frequencyInput.value,
      });
      message.textContent = "Habit updated.";
    } else {
      createHabit({
        title: titleInput.value,
        targetFrequency: frequencyInput.value,
      });
      message.textContent = "Habit added.";
    }

    form.reset();
    editingHabitId = null;
    submitButton.textContent = "Add habit";
    cancelButton.hidden = true;
    renderHabits();
  } catch (error) {
    if (error instanceof TypeError) {
      message.textContent = error.message;
      return;
    }
    showStorageError(error);
  }
});

habitList.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) {
    return;
  }

  const actionButton = event.target.closest("[data-habit-action]");
  const habitItem = actionButton?.closest(".habit-item");
  if (!actionButton || !habitItem) {
    return;
  }

  const habitId = habitItem.dataset.habitId;
  const action = actionButton.dataset.habitAction;

  try {
    if (action === "complete") {
      const recorded = recordHabitCompletion(habitId, dateInput.value);
      message.textContent = recorded
        ? `Check-in saved for ${dateInput.value}.`
        : `This habit is already completed for ${dateInput.value}.`;
      renderHabits();
    } else if (action === "rename") {
      const habit = listHabits().find((item) => item.id === habitId);
      if (!habit) {
        message.textContent = "That habit could not be found.";
        return;
      }

      editingHabitId = habit.id;
      titleInput.value = habit.title;
      frequencyInput.value = String(habit.targetFrequency);
      submitButton.textContent = "Save changes";
      cancelButton.hidden = false;
      message.textContent = `Renaming "${habit.title}".`;
      titleInput.focus();
    } else if (action === "delete") {
      deleteHabit(habitId);
      if (editingHabitId === habitId) {
        editingHabitId = null;
        form.reset();
        submitButton.textContent = "Add habit";
        cancelButton.hidden = true;
      }
      message.textContent = "Habit and its check-in history deleted.";
      renderHabits();
    }
  } catch (error) {
    if (error instanceof TypeError) {
      message.textContent = error.message;
      return;
    }
    showStorageError(error);
  }
});

dateInput.addEventListener("change", () => {
  message.textContent = dateInput.value
    ? ""
    : "Choose a valid date before recording a check-in.";
  renderHabits();
});

cancelButton.addEventListener("click", resetForm);
renderHabits();
