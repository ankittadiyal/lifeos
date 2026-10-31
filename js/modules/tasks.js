import { loadData, saveData } from "../storage.js";

const taskForm = document.querySelector("#task-form");
const taskInput = document.querySelector("#task-input");
const taskList = document.querySelector("#task-list");
const taskMessage = document.querySelector("#task-message");
const storageKey = "lifeos.tasks";

function isTaskList(value) {
  return Array.isArray(value) && value.every((task) => {
    return (
      task !== null &&
      typeof task === "object" &&
      typeof task.id === "string" &&
      typeof task.title === "string" &&
      typeof task.completed === "boolean"
    );
  });
}

const savedTasks = loadData(storageKey, []);
const hasValidSavedTasks = isTaskList(savedTasks);
let tasks = hasValidSavedTasks ? savedTasks : [];

if (!hasValidSavedTasks) {
  console.error(`Saved data for "${storageKey}" is not a valid task list.`);
}

function saveTasks(nextTasks) {
  try {
    saveData(storageKey, nextTasks);
    tasks = nextTasks;
    taskMessage.textContent = "";
    return true;
  } catch (error) {
    console.error("Could not save tasks to browser storage.", error);
    taskMessage.textContent =
      "Your browser could not save this change. Check its storage settings and try again.";
    return false;
  }
}

function renderTasks() {
  taskList.replaceChildren();

  if (tasks.length === 0) {
    const emptyMessage = document.createElement("li");
    emptyMessage.className = "task-list__empty";
    emptyMessage.textContent = "No tasks yet. Add your first task above.";
    taskList.append(emptyMessage);
    return;
  }

  for (const task of tasks) {
    const taskItem = document.createElement("li");
    taskItem.className = "task-item";

    const taskLabel = document.createElement("label");
    taskLabel.className = "task-item__label";

    const taskCheckbox = document.createElement("input");
    taskCheckbox.className = "task-item__checkbox";
    taskCheckbox.type = "checkbox";
    taskCheckbox.checked = task.completed;

    const taskTitleElement = document.createElement("span");
    taskTitleElement.className = "task-item__title";
    taskTitleElement.textContent = task.title;

    if (task.completed) {
      taskItem.classList.add("task-item--completed");
    }

    taskLabel.append(taskCheckbox, taskTitleElement);
    taskItem.append(taskLabel);
    taskList.append(taskItem);

    taskCheckbox.addEventListener("change", () => {
      const previousCompleted = !taskCheckbox.checked;
      const updatedTasks = tasks.map((currentTask) => {
        if (currentTask.id === task.id) {
          return { ...currentTask, completed: taskCheckbox.checked };
        }

        return currentTask;
      });

      if (!saveTasks(updatedTasks)) {
        taskCheckbox.checked = previousCompleted;
      }

      taskItem.classList.toggle("task-item--completed", taskCheckbox.checked);
    });
  }
}

taskForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const taskTitle = taskInput.value.trim();

  if (taskTitle === "") {
    taskMessage.textContent = "Please enter a task before adding it.";
    taskInput.focus();
    return;
  }

  const newTask = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title: taskTitle,
    completed: false,
  };

  if (!saveTasks([...tasks, newTask])) {
    return;
  }

  renderTasks();
  taskInput.value = "";
  taskInput.focus();
});

renderTasks();
