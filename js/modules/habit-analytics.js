const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

function getDayNumber(dateString) {
  if (typeof dateString !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return null;
  }

  const [year, month, day] = dateString.split("-").map(Number);
  const timestamp = Date.UTC(year, month - 1, day);
  const date = new Date(timestamp);

  if (
    Number.isNaN(timestamp) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return Math.floor(timestamp / MILLISECONDS_PER_DAY);
}

export function calculateHabitAnalytics(completionDates, todayDate) {
  if (!Array.isArray(completionDates)) {
    throw new TypeError("Completion dates must be an array.");
  }

  const today = getDayNumber(todayDate);
  if (today === null) {
    throw new TypeError("Today must be a valid YYYY-MM-DD date.");
  }

  const completedDays = new Set(
    completionDates
      .map(getDayNumber)
      .filter((dayNumber) => dayNumber !== null && dayNumber <= today)
  );
  const sortedDays = [...completedDays].sort((first, second) => first - second);

  let longestStreak = 0;
  let runningStreak = 0;
  let previousDay = null;

  for (const day of sortedDays) {
    runningStreak = previousDay !== null && day === previousDay + 1
      ? runningStreak + 1
      : 1;
    longestStreak = Math.max(longestStreak, runningStreak);
    previousDay = day;
  }

  let currentStreak = 0;
  let streakDay = completedDays.has(today) ? today : today - 1;
  while (completedDays.has(streakDay)) {
    currentStreak += 1;
    streakDay -= 1;
  }

  const sevenDayCompletionCount = [...completedDays]
    .filter((day) => day >= today - 6)
    .length;

  return {
    currentStreak,
    longestStreak,
    sevenDayCompletionCount,
    sevenDayCompletionRate: Math.round((sevenDayCompletionCount / 7) * 100),
  };
}
