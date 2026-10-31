const taskForm = document.querySelector("#task-form");
const taskInput = document.querySelector("#task-input");
const taskList = document.querySelector("#task-list");
const taskMessage = document.querySelector("#task-message");

taskForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const taskTitle = taskInput.value.trim();

  if (taskTitle === "") {
    taskMessage.textContent = "Please enter a task before adding it.";
    taskInput.focus();
    return;
  }

  const emptyMessage = taskList.querySelector(".task-list__empty");
  emptyMessage?.remove();

  const taskItem = document.createElement("li");
  taskItem.className = "task-item";

  const taskLabel = document.createElement("label");
  taskLabel.className = "task-item__label";

  const taskCheckbox = document.createElement("input");
  taskCheckbox.className = "task-item__checkbox";
  taskCheckbox.type = "checkbox";

  const taskTitleElement = document.createElement("span");
  taskTitleElement.className = "task-item__title";
  taskTitleElement.textContent = taskTitle;

  taskLabel.append(taskCheckbox, taskTitleElement);
  taskItem.append(taskLabel);
  taskList.append(taskItem);

  taskCheckbox.addEventListener("change", () => {
    taskItem.classList.toggle("task-item--completed", taskCheckbox.checked);
  });

  taskInput.value = "";
  taskMessage.textContent = "";
  taskInput.focus();
});