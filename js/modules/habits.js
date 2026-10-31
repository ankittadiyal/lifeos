import { loadData, saveData } from "../storage.js";

const STORAGE_KEY = "lifeos.habits";
const MIN_WEEKLY_TARGET = 1;
const MAX_WEEKLY_TARGET = 7;

function isValidDateString(value) {
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

function createEmptyData() {
  return { habits: [], completions: Object.create(null) };
}

function normalizeData(value) {
  if (value === null || typeof value !== "object" || !Array.isArray(value.habits)) {
    console.error(`Saved data for "${STORAGE_KEY}" is not a valid habit collection.`);
    return createEmptyData();
  }

  const usedIds = new Set();
  const normalizedHabits = value.habits.flatMap((habit) => {
    if (
      habit === null ||
      typeof habit !== "object" ||
      typeof habit.title !== "string" ||
      habit.title.trim() === "" ||
      !Number.isInteger(habit.targetFrequency) ||
      habit.targetFrequency < MIN_WEEKLY_TARGET ||
      habit.targetFrequency > MAX_WEEKLY_TARGET
    ) {
      console.error(`Skipped invalid habit in "${STORAGE_KEY}".`);
      return [];
    }

    const savedId = typeof habit.id === "string" && habit.id !== "" ? habit.id : null;
    const id = savedId && !usedIds.has(savedId) ? savedId : createId(usedIds);
    usedIds.add(id);

    return [{
      id,
      title: habit.title.trim(),
      targetFrequency: habit.targetFrequency,
      createdAt:
        typeof habit.createdAt === "string" && !Number.isNaN(Date.parse(habit.createdAt))
          ? habit.createdAt
          : new Date().toISOString(),
    }];
  });

  const habitIds = new Set(normalizedHabits.map((habit) => habit.id));
  const normalizedCompletions = Object.create(null);

  if (value.completions !== null && typeof value.completions === "object") {
    for (const [habitId, dates] of Object.entries(value.completions)) {
      if (!habitIds.has(habitId) || dates === null || typeof dates !== "object") {
        continue;
      }

      const validDates = Object.create(null);
      for (const [date, completed] of Object.entries(dates)) {
        if (isValidDateString(date) && completed === true) {
          validDates[date] = true;
        }
      }

      if (Object.keys(validDates).length > 0) {
        normalizedCompletions[habitId] = validDates;
      }
    }
  }

  return { habits: normalizedHabits, completions: normalizedCompletions };
}

const savedData = loadData(STORAGE_KEY, createEmptyData());
let habitData = normalizeData(savedData);

if (JSON.stringify(savedData) !== JSON.stringify(habitData)) {
  try {
    saveData(STORAGE_KEY, habitData);
  } catch (error) {
    console.error("Could not normalize saved habits.", error);
  }
}

function persistData(nextData) {
  saveData(STORAGE_KEY, nextData);
  habitData = nextData;
}

function validateTitle(title) {
  const normalizedTitle = typeof title === "string" ? title.trim() : "";
  if (normalizedTitle === "") {
    throw new TypeError("Enter a habit name.");
  }
  if (normalizedTitle.length > 100) {
    throw new TypeError("Habit names must be 100 characters or fewer.");
  }
  return normalizedTitle;
}

function validateTargetFrequency(value) {
  const targetFrequency = Number(value);
  if (
    !Number.isInteger(targetFrequency) ||
    targetFrequency < MIN_WEEKLY_TARGET ||
    targetFrequency > MAX_WEEKLY_TARGET
  ) {
    throw new TypeError("Choose a weekly target from 1 to 7.");
  }
  return targetFrequency;
}

function validateDate(date) {
  if (!isValidDateString(date)) {
    throw new TypeError("Choose a valid calendar date.");
  }
  return date;
}

function cloneHabit(habit) {
  return { ...habit };
}

export function getTodayDateString(date = new Date()) {
  return getLocalDateString(date);
}

export function createHabit(details) {
  if (details === null || typeof details !== "object") {
    throw new TypeError("Habit details must be an object.");
  }

  const title = validateTitle(details.title);
  const habit = {
    id: createId(new Set(habitData.habits.map((item) => item.id))),
    title,
    targetFrequency: validateTargetFrequency(details.targetFrequency),
    createdAt: new Date().toISOString(),
  };

  persistData({
    ...habitData,
    habits: [...habitData.habits, habit],
  });
  return cloneHabit(habit);
}

export function renameHabit(id, title) {
  return updateHabit(id, { title });
}

export function updateHabit(id, changes) {
  if (changes === null || typeof changes !== "object" || Array.isArray(changes)) {
    throw new TypeError("Habit changes must be an object.");
  }

  const habit = habitData.habits.find((item) => item.id === id);
  if (!habit) {
    return null;
  }

  const updatedHabit = {
    ...habit,
    title: changes.title === undefined ? habit.title : validateTitle(changes.title),
    targetFrequency: changes.targetFrequency === undefined
      ? habit.targetFrequency
      : validateTargetFrequency(changes.targetFrequency),
  };
  persistData({
    ...habitData,
    habits: habitData.habits.map((item) => item.id === id ? updatedHabit : item),
  });
  return cloneHabit(updatedHabit);
}

export function deleteHabit(id) {
  if (!habitData.habits.some((habit) => habit.id === id)) {
    return false;
  }

  const completions = Object.assign(Object.create(null), habitData.completions);
  delete completions[id];
  persistData({
    habits: habitData.habits.filter((habit) => habit.id !== id),
    completions,
  });
  return true;
}

export function listHabits() {
  return habitData.habits.map(cloneHabit);
}

export function isHabitCompletedOnDate(habitId, date = getTodayDateString()) {
  validateDate(date);
  return habitData.completions[habitId]?.[date] === true;
}

export function getHabitCompletionDates(habitId) {
  return Object.keys(habitData.completions[habitId] ?? {}).sort((first, second) =>
    second.localeCompare(first)
  );
}

export function recordHabitCompletion(habitId, date = getTodayDateString()) {
  validateDate(date);
  if (!habitData.habits.some((habit) => habit.id === habitId)) {
    return false;
  }

  if (isHabitCompletedOnDate(habitId, date)) {
    return false;
  }

  const completions = Object.assign(Object.create(null), habitData.completions);
  completions[habitId] = Object.assign(
    Object.create(null),
    completions[habitId] ?? {},
    { [date]: true }
  );

  persistData({ ...habitData, completions });
  return true;
}