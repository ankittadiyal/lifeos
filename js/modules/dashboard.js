export const sampleTasks = [
  {
    id: 1,
    title: "Review JavaScript arrays",
    category: "Study",
    priority: "High",
    completed: true,
    dueDate: "2026-11-01",
  },
  {
    id: 2,
    title: "Practice two-pointer problems",
    category: "DSA",
    priority: "Medium",
    completed: false,
    dueDate: "2026-11-02",
  },
  {
    id: 3,
    title: "Plan the week",
    category: "Personal",
    priority: "Low",
    completed: false,
    dueDate: "2026-11-03",
  },
  {
    id: 4,
    title: "Read a chapter",
    category: "Study",
    priority: "Medium",
    completed: true,
    dueDate: "2026-11-04",
  },
];

export function countAllTasks(tasks) {
  return tasks.length;
}

export function countCompletedTasks(tasks) {
  return tasks.reduce((completedCount, task) => {
    return completedCount + (task.completed ? 1 : 0);
  }, 0);
}

export function countPendingTasks(tasks) {
  return tasks.filter((task) => !task.completed).length;
}

export function getCompletionPercentage(tasks) {
  const totalTasks = countAllTasks(tasks);

  if (totalTasks === 0) {
    return 0;
  }

  return Math.round((countCompletedTasks(tasks) / totalTasks) * 100);
}