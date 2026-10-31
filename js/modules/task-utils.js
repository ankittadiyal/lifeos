function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function groupTasksByDate(taskList, today = getLocalDateString()) {
  const groups = {
    overdue: [],
    today: [],
    upcoming: [],
    unscheduled: [],
    completed: [],
  };

  for (const task of taskList) {
    if (task.completed) {
      groups.completed.push(task);
    } else if (!task.dueDate) {
      groups.unscheduled.push(task);
    } else if (task.dueDate < today) {
      groups.overdue.push(task);
    } else if (task.dueDate === today) {
      groups.today.push(task);
    } else {
      groups.upcoming.push(task);
    }
  }

  return groups;
}

export function filterAndSortTasks(taskCollection, filters = {}) {
  const searchTerm = (filters.search ?? "").trim().toLocaleLowerCase();
  const status = filters.status ?? "all";
  const category = filters.category ?? "all";
  const priorityOrder = filters.priorityOrder ?? "high-first";
  const priorityRank = priorityOrder === "low-first"
    ? { Low: 0, Medium: 1, High: 2 }
    : { High: 0, Medium: 1, Low: 2 };

  const matchingTasks = taskCollection.filter((task) => {
    const matchesSearch = searchTerm === "" ||
      task.title.toLocaleLowerCase().includes(searchTerm) ||
      task.category.toLocaleLowerCase().includes(searchTerm);
    const matchesStatus =
      status === "all" ||
      (status === "active" && !task.completed) ||
      (status === "completed" && task.completed);
    const matchesCategory = category === "all" || task.category === category;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  return [...matchingTasks].sort((first, second) => {
    const rankDifference =
      (priorityRank[first.priority] ?? 1) - (priorityRank[second.priority] ?? 1);

    return rankDifference || first.title.localeCompare(second.title);
  });
}
