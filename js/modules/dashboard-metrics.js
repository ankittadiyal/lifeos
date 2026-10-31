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
