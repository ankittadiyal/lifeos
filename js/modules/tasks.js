import { loadData, saveData } from "../storage.js";

const STORAGE_KEY = "lifeos.tasks";
const PRIORITIES = ["Low", "Medium", "High"];

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

function isValidDueDate(value) {
  if (value === "") {
    return true;
  }

  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsedDate = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsedDate.getTime()) && parsedDate.toISOString().slice(0, 10) === value;
}

function isTask(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    typeof value.title === "string" &&
    typeof value.completed === "boolean"
  );
}

function normalizeTasks(value) {
  if (!Array.isArray(value)) {
    console.error(`Saved data for "${STORAGE_KEY}" is not a task list.`);
    return [];
  }

  const usedIds = new Set();

  return value.flatMap((task) => {
    if (!isTask(task) || task.title.trim() === "") {
      console.error(`Skipped invalid task in "${STORAGE_KEY}".`);
      return [];
    }

    const savedId = typeof task.id === "string" && task.id !== "" ? task.id : null;
    const id = savedId && !usedIds.has(savedId) ? savedId : createId(usedIds);
    usedIds.add(id);

    const priority = PRIORITIES.includes(task.priority) ? task.priority : "Medium";
    const dueDate = isValidDueDate(task.dueDate) ? task.dueDate : "";
    const category =
      typeof task.category === "string" && task.category.trim() !== ""
        ? task.category.trim()
        : "Study";
    const createdAt =
      typeof task.createdAt === "string" && !Number.isNaN(Date.parse(task.createdAt))
        ? task.createdAt
        : new Date().toISOString();

    return [{
      id,
      title: task.title.trim(),
      category,
      priority,
      dueDate,
      completed: task.completed,
      createdAt,
    }];
  });
}

const savedTasks = loadData(STORAGE_KEY, []);
let tasks = normalizeTasks(savedTasks);

if (JSON.stringify(savedTasks) !== JSON.stringify(tasks)) {
  try {
    saveData(STORAGE_KEY, tasks);
  } catch (error) {
    console.error("Could not update saved tasks to the current format.", error);
  }
}

function persistTasks(nextTasks) {
  saveData(STORAGE_KEY, nextTasks);
  tasks = nextTasks;
}

export function createTask(details) {
  if (details === null || typeof details !== "object") {
    throw new TypeError("Task details must be an object.");
  }

  const title = typeof details.title === "string" ? details.title.trim() : "";
  const category =
    typeof details.category === "string" && details.category.trim() !== ""
      ? details.category.trim()
      : "Study";
  const priority = details.priority ?? "Medium";
  const dueDate = details.dueDate ?? "";

  if (title === "") {
    throw new TypeError("A task title is required.");
  }

  if (!PRIORITIES.includes(priority)) {
    throw new TypeError("Priority must be Low, Medium, or High.");
  }

  if (!isValidDueDate(dueDate)) {
    throw new TypeError("Due date must be a valid calendar date.");
  }

  const task = {
    id: createId(new Set(tasks.map((currentTask) => currentTask.id))),
    title,
    category,
    priority,
    dueDate,
    completed: false,
    createdAt: new Date().toISOString(),
  };

  persistTasks([...tasks, task]);
  return { ...task };
}

export function updateTask(id, changes) {
  if (changes === null || typeof changes !== "object" || Array.isArray(changes)) {
    throw new TypeError("Task changes must be an object.");
  }

  const task = tasks.find((currentTask) => currentTask.id === id);

  if (!task) {
    return null;
  }

  const allowedFields = ["title", "category", "priority", "dueDate", "completed"];
  const unsupportedField = Object.keys(changes).find((field) => !allowedFields.includes(field));

  if (unsupportedField) {
    throw new TypeError(`"${unsupportedField}" cannot be updated.`);
  }

  const updatedTask = { ...task, ...changes };

  if (typeof updatedTask.title !== "string" || updatedTask.title.trim() === "") {
    throw new TypeError("A task title is required.");
  }
  if (typeof updatedTask.category !== "string" || updatedTask.category.trim() === "") {
    throw new TypeError("Task category cannot be empty.");
  }
  if (!PRIORITIES.includes(updatedTask.priority)) {
    throw new TypeError("Priority must be Low, Medium, or High.");
  }
  if (!isValidDueDate(updatedTask.dueDate)) {
    throw new TypeError("Due date must be a valid calendar date.");
  }
  if (typeof updatedTask.completed !== "boolean") {
    throw new TypeError("Completed must be true or false.");
  }

  updatedTask.title = updatedTask.title.trim();
  updatedTask.category = updatedTask.category.trim();

  persistTasks(tasks.map((currentTask) => (
    currentTask.id === id ? updatedTask : currentTask
  )));

  return { ...updatedTask };
}

export function deleteTask(id) {
  const taskExists = tasks.some((task) => task.id === id);

  if (!taskExists) {
    return false;
  }

  persistTasks(tasks.filter((task) => task.id !== id));
  return true;
}

export function toggleTaskCompletion(id) {
  const task = tasks.find((currentTask) => currentTask.id === id);

  if (!task) {
    return null;
  }

  return updateTask(id, { completed: !task.completed });
}

export function listTasks() {
  return tasks.map((task) => ({ ...task }));
}

const taskForm = document.querySelector("#task-form");
const taskInput = document.querySelector("#task-input");
const taskCategory = document.querySelector("#task-category");
const taskPriority = document.querySelector("#task-priority");
const taskDueDate = document.querySelector("#task-due-date");
const taskList = document.querySelector("#task-list");
const taskMessage = document.querySelector("#task-message");
const taskSubmitButton = taskForm.querySelector('button[type="submit"]');
const cancelEditButton = document.querySelector("#cancel-task-edit");
let editingTaskId = null;

function showStorageError(error) {
  console.error("Could not save tasks to browser storage.", error);
  taskMessage.textContent =
    "Your browser could not save this change. Check its storage settings and try again.";
}

function renderTasks() {
  taskList.replaceChildren();

  const currentTasks = listTasks();

  if (currentTasks.length === 0) {
    const emptyMessage = document.createElement("li");
    emptyMessage.className = "task-list__empty";
    emptyMessage.textContent = "No tasks yet. Add your first task above.";
    taskList.append(emptyMessage);
    return;
  }

  for (const task of currentTasks) {
    const taskItem = document.createElement("li");
    taskItem.className = "task-item";
    taskItem.dataset.taskId = task.id;

    if (task.completed) {
      taskItem.classList.add("task-item--completed");
    }

    const taskLabel = document.createElement("label");
    taskLabel.className = "task-item__label";

    const taskCheckbox = document.createElement("input");
    taskCheckbox.className = "task-item__checkbox";
    taskCheckbox.type = "checkbox";
    taskCheckbox.checked = task.completed;
    taskCheckbox.setAttribute("aria-label", `Mark "${task.title}" complete`);

    const taskDetails = document.createElement("span");
    taskDetails.className = "task-item__details";

    const taskTitle = document.createElement("span");
    taskTitle.className = "task-item__title";
    taskTitle.textContent = task.title;

    const taskMeta = document.createElement("span");
    taskMeta.className = "task-item__meta";
    const dueDateText = task.dueDate ? ` · Due ${task.dueDate}` : "";
    taskMeta.textContent = `${task.category} · ${task.priority} priority${dueDateText}`;

    taskDetails.append(taskTitle, taskMeta);
    taskLabel.append(taskCheckbox, taskDetails);

    const editButton = document.createElement("button");
    editButton.className = "task-item__action";
    editButton.type = "button";
    editButton.dataset.taskAction = "edit";
    editButton.textContent = "Edit";
    editButton.setAttribute("aria-label", `Edit "${task.title}"`);

    const deleteButton = document.createElement("button");
    deleteButton.className = "task-item__action task-item__action--delete";
    deleteButton.type = "button";
    deleteButton.dataset.taskAction = "delete";
    deleteButton.textContent = "Delete";
    deleteButton.setAttribute("aria-label", `Delete "${task.title}"`);

    const taskActions = document.createElement("div");
    taskActions.className = "task-item__actions";
    taskActions.append(editButton, deleteButton);

    taskItem.append(taskLabel, taskActions);
    taskList.append(taskItem);
  }
}

function resetTaskForm() {
  taskForm.reset();
  editingTaskId = null;
  taskSubmitButton.textContent = "Add Task";
  cancelEditButton.hidden = true;
  taskMessage.textContent = "";
}

function startEditingTask(taskId) {
  const task = listTasks().find((currentTask) => currentTask.id === taskId);

  if (!task) {
    taskMessage.textContent = "That task could not be found.";
    return;
  }

  editingTaskId = task.id;
  taskInput.value = task.title;
  taskCategory.value = task.category;
  taskPriority.value = task.priority;
  taskDueDate.value = task.dueDate;
  taskSubmitButton.textContent = "Save Changes";
  cancelEditButton.hidden = false;
  taskMessage.textContent = `Editing "${task.title}".`;
  taskInput.focus();
}

taskList.addEventListener("change", (event) => {
  if (!(event.target instanceof HTMLInputElement)) {
    return;
  }

  if (!event.target.matches(".task-item__checkbox")) {
    return;
  }

  const taskItem = event.target.closest(".task-item");

  if (!taskItem) {
    return;
  }

  try {
    toggleTaskCompletion(taskItem.dataset.taskId);
    taskMessage.textContent = "";
    renderTasks();
  } catch (error) {
    event.target.checked = !event.target.checked;
    showStorageError(error);
  }
});

taskList.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) {
    return;
  }

  const actionButton = event.target.closest("[data-task-action]");
  const taskItem = actionButton?.closest(".task-item");

  if (!actionButton || !taskItem) {
    return;
  }

  const taskId = taskItem.dataset.taskId;

  if (actionButton.dataset.taskAction === "edit") {
    startEditingTask(taskId);
    return;
  }

  if (actionButton.dataset.taskAction === "delete") {
    try {
      deleteTask(taskId);
      if (editingTaskId === taskId) {
        resetTaskForm();
      }
      taskMessage.textContent = "";
      renderTasks();
    } catch (error) {
      showStorageError(error);
    }
  }
});

taskForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (taskInput.value.trim() === "") {
    taskMessage.textContent = "Please enter a task title before adding it.";
    taskInput.focus();
    return;
  }

  try {
    const taskDetails = {
      title: taskInput.value,
      category: taskCategory.value,
      priority: taskPriority.value,
      dueDate: taskDueDate.value,
    };

    if (editingTaskId) {
      updateTask(editingTaskId, taskDetails);
    } else {
      createTask(taskDetails);
    }
  } catch (error) {
    if (error instanceof TypeError) {
      taskMessage.textContent = error.message;
      taskInput.focus();
      return;
    }

    showStorageError(error);
    return;
  }

  resetTaskForm();
  taskInput.focus();
  renderTasks();
});

cancelEditButton.addEventListener("click", resetTaskForm);

renderTasks();
