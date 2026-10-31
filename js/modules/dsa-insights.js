function isValidDateString(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function getLocalDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getWeekRange(referenceDate) {
  const monday = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate()
  );
  const daysSinceMonday = (monday.getDay() + 6) % 7;
  monday.setDate(monday.getDate() - daysSinceMonday);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return {
    start: getLocalDateString(monday),
    end: getLocalDateString(sunday),
  };
}

export function calculateDsaInsights(problemList, referenceDate = new Date()) {
  const today = getLocalDateString(referenceDate);
  const week = getWeekRange(referenceDate);
  const solvedByDifficulty = {
    Easy: 0,
    Medium: 0,
    Hard: 0,
  };
  const topicProgress = Object.create(null);
  const dueForRevision = [];
  const solvedThisWeek = [];
  let totalSolved = 0;

  for (const problem of problemList) {
    const topic = typeof problem.topic === "string" && problem.topic.trim()
      ? problem.topic.trim()
      : "Uncategorized";

    if (!topicProgress[topic]) {
      topicProgress[topic] = { total: 0, solved: 0 };
    }
    topicProgress[topic].total += 1;

    if (problem.status === "solved") {
      totalSolved += 1;
      topicProgress[topic].solved += 1;

      if (Object.hasOwn(solvedByDifficulty, problem.difficulty)) {
        solvedByDifficulty[problem.difficulty] += 1;
      }

      if (
        isValidDateString(problem.dateSolved) &&
        problem.dateSolved >= week.start &&
        problem.dateSolved <= week.end
      ) {
        solvedThisWeek.push(problem);
      }
    }

    if (
      isValidDateString(problem.nextRevisionDate) &&
      problem.nextRevisionDate <= today
    ) {
      dueForRevision.push(problem);
    }
  }

  const sortedTopicProgress = Object.entries(topicProgress)
    .map(([topic, counts]) => ({
      topic,
      total: counts.total,
      solved: counts.solved,
      percentage: Math.round((counts.solved / counts.total) * 100),
    }))
    .sort((first, second) => first.topic.localeCompare(second.topic));

  dueForRevision.sort((first, second) => {
    return first.nextRevisionDate.localeCompare(second.nextRevisionDate) ||
      first.title.localeCompare(second.title);
  });
  solvedThisWeek.sort((first, second) => {
    return first.dateSolved.localeCompare(second.dateSolved) ||
      first.title.localeCompare(second.title);
  });

  return {
    totalSolved,
    solvedByDifficulty,
    topicProgress: sortedTopicProgress,
    dueForRevision,
    solvedThisWeek,
    week,
  };
}
