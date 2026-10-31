import { loadData, saveData } from "../storage.js";
import { calculateDsaInsights } from "./dsa-insights.js";

const STORAGE_KEY = "lifeos.dsaProblems";
const PLATFORMS = ["LeetCode", "Codeforces", "GeeksforGeeks", "Other"];
const DIFFICULTIES = ["Easy", "Medium", "Hard"];
const STATUSES = ["solved", "attempted", "revision-needed"];

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

function isOptionalDate(value) {
  if (value === "") {
    return true;
  }

  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isValidProblemUrl(value) {
  try {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:") && url.hostname !== "";
  } catch {
    return false;
  }
}

function normalizeProblems(value) {
  if (!Array.isArray(value)) {
    console.error(`Saved data for "${STORAGE_KEY}" is not a problem list.`);
    return [];
  }

  const usedIds = new Set();
  return value.flatMap((problem) => {
    if (
      problem === null ||
      typeof problem !== "object" ||
      typeof problem.title !== "string" ||
      problem.title.trim() === "" ||
      typeof problem.topic !== "string" ||
      typeof problem.url !== "string" ||
      !isValidProblemUrl(problem.url)
    ) {
      console.error(`Skipped invalid problem in "${STORAGE_KEY}".`);
      return [];
    }

    const savedId = typeof problem.id === "string" && problem.id !== "" ? problem.id : null;
    const id = savedId && !usedIds.has(savedId) ? savedId : createId(usedIds);
    usedIds.add(id);

    return [{
      id,
      title: problem.title.trim(),
      platform: PLATFORMS.includes(problem.platform) ? problem.platform : "Other",
      url: problem.url,
      topic: problem.topic.trim() || "Uncategorized",
      difficulty: DIFFICULTIES.includes(problem.difficulty) ? problem.difficulty : "Medium",
      status: STATUSES.includes(problem.status) ? problem.status : "attempted",
      dateSolved: isOptionalDate(problem.dateSolved) ? problem.dateSolved : "",
      notes: typeof problem.notes === "string" ? problem.notes : "",
      nextRevisionDate: isOptionalDate(problem.nextRevisionDate)
        ? problem.nextRevisionDate
        : "",
      createdAt:
        typeof problem.createdAt === "string" && !Number.isNaN(Date.parse(problem.createdAt))
          ? problem.createdAt
          : new Date().toISOString(),
    }];
  });
}

const savedProblems = loadData(STORAGE_KEY, []);
let problems = normalizeProblems(savedProblems);

if (JSON.stringify(savedProblems) !== JSON.stringify(problems)) {
  try {
    saveData(STORAGE_KEY, problems);
  } catch (error) {
    console.error("Could not normalize saved DSA problems.", error);
  }
}

function persistProblems(nextProblems) {
  saveData(STORAGE_KEY, nextProblems);
  problems = nextProblems;
  document.dispatchEvent(new Event("lifeos:dsa-changed"));
}

function validateProblem(details) {
  if (details === null || typeof details !== "object") {
    throw new TypeError("Problem details must be an object.");
  }

  const normalized = {
    title: typeof details.title === "string" ? details.title.trim() : "",
    platform: details.platform,
    url: typeof details.url === "string" ? details.url.trim() : "",
    topic: typeof details.topic === "string" ? details.topic.trim() : "",
    difficulty: details.difficulty,
    status: details.status,
    dateSolved: details.dateSolved ?? "",
    notes: typeof details.notes === "string" ? details.notes.trim() : "",
    nextRevisionDate: details.nextRevisionDate ?? "",
  };

  if (!normalized.title) {
    throw new TypeError("Enter a problem title.");
  }
  if (!PLATFORMS.includes(normalized.platform)) {
    throw new TypeError("Choose a valid platform.");
  }
  if (!isValidProblemUrl(normalized.url)) {
    throw new TypeError("Enter a valid http or https problem URL.");
  }
  if (!normalized.topic) {
    throw new TypeError("Enter a topic.");
  }
  if (!DIFFICULTIES.includes(normalized.difficulty)) {
    throw new TypeError("Choose Easy, Medium, or Hard difficulty.");
  }
  if (!STATUSES.includes(normalized.status)) {
    throw new TypeError("Choose a valid problem status.");
  }
  if (!isOptionalDate(normalized.dateSolved)) {
    throw new TypeError("Enter a valid date solved.");
  }
  if (!isOptionalDate(normalized.nextRevisionDate)) {
    throw new TypeError("Enter a valid next revision date.");
  }

  return normalized;
}

export function createProblem(details) {
  const validatedProblem = validateProblem(details);
  const problem = {
    id: createId(new Set(problems.map((currentProblem) => currentProblem.id))),
    ...validatedProblem,
    createdAt: new Date().toISOString(),
  };

  persistProblems([...problems, problem]);
  return { ...problem };
}

export function updateProblem(id, changes) {
  if (changes === null || typeof changes !== "object" || Array.isArray(changes)) {
    throw new TypeError("Problem changes must be an object.");
  }

  const existingProblem = problems.find((problem) => problem.id === id);

  if (!existingProblem) {
    return null;
  }

  const validatedProblem = validateProblem({ ...existingProblem, ...changes });
  const updatedProblem = { ...existingProblem, ...validatedProblem };

  persistProblems(problems.map((problem) => (
    problem.id === id ? updatedProblem : problem
  )));

  return { ...updatedProblem };
}

export function deleteProblem(id) {
  if (!problems.some((problem) => problem.id === id)) {
    return false;
  }

  persistProblems(problems.filter((problem) => problem.id !== id));
  return true;
}

export function listProblems() {
  return problems.map((problem) => ({ ...problem }));
}

export function getProblemCounts(problemList = listProblems()) {
  const status = {
    solved: 0,
    attempted: 0,
    "revision-needed": 0,
  };
  const byTopic = Object.create(null);
  const byDifficulty = {
    Easy: 0,
    Medium: 0,
    Hard: 0,
  };

  for (const problem of problemList) {
    if (Object.hasOwn(status, problem.status)) {
      status[problem.status] += 1;
    }

    byTopic[problem.topic] = (byTopic[problem.topic] ?? 0) + 1;

    if (Object.hasOwn(byDifficulty, problem.difficulty)) {
      byDifficulty[problem.difficulty] += 1;
    }
  }

  return { status, byTopic, byDifficulty };
}

const form = document.querySelector("#dsa-form");
const titleInput = document.querySelector("#dsa-title");
const platformInput = document.querySelector("#dsa-platform");
const urlInput = document.querySelector("#dsa-url");
const topicInput = document.querySelector("#dsa-topic");
const difficultyInput = document.querySelector("#dsa-difficulty");
const statusInput = document.querySelector("#dsa-status");
const dateSolvedInput = document.querySelector("#dsa-date-solved");
const notesInput = document.querySelector("#dsa-notes");
const nextRevisionInput = document.querySelector("#dsa-next-revision");
const message = document.querySelector("#dsa-message");
const submitButton = document.querySelector("#dsa-submit");
const cancelButton = document.querySelector("#dsa-cancel-edit");
const problemList = document.querySelector("#dsa-problem-list");
const topicCountsList = document.querySelector("#dsa-topic-counts");
const difficultyCountsList = document.querySelector("#dsa-difficulty-counts");
const solvedCount = document.querySelector("#dsa-solved-count");
const attemptedCount = document.querySelector("#dsa-attempted-count");
const revisionCount = document.querySelector("#dsa-revision-count");
const insightSolved = document.querySelector("#dsa-insight-solved");
const insightEasy = document.querySelector("#dsa-insight-easy");
const insightMedium = document.querySelector("#dsa-insight-medium");
const insightHard = document.querySelector("#dsa-insight-hard");
const topicProgressList = document.querySelector("#dsa-topic-progress");
const weeklyRange = document.querySelector("#dsa-weekly-range");
const weeklyCount = document.querySelector("#dsa-weekly-count");
const weeklyProblemsList = document.querySelector("#dsa-weekly-problems");
const revisionProblemsList = document.querySelector("#dsa-revision-problems");
let editingProblemId = null;

function showStorageError(error) {
  console.error("Could not save DSA problem data.", error);
  message.textContent =
    "Your browser could not save this change. Check its storage settings and try again.";
}

function appendCountRows(list, counts, emptyMessage) {
  list.replaceChildren();
  const entries = Object.entries(counts).sort(([first], [second]) =>
    first.localeCompare(second)
  );

  if (entries.length === 0) {
    const item = document.createElement("li");
    item.textContent = emptyMessage;
    list.append(item);
    return;
  }

  for (const [label, count] of entries) {
    const item = document.createElement("li");
    const name = document.createElement("span");
    const value = document.createElement("strong");
    name.textContent = label;
    value.textContent = String(count);
    item.append(name, value);
    list.append(item);
  }
}

function appendInsightRows(list, records, createRow, emptyMessage) {
  list.replaceChildren();

  if (records.length === 0) {
    const item = document.createElement("li");
    item.className = "dsa-insights__empty";
    item.textContent = emptyMessage;
    list.append(item);
    return;
  }

  for (const record of records) {
    list.append(createRow(record));
  }
}

function createTopicProgressRow(topic) {
  const item = document.createElement("li");
  const label = document.createElement("span");
  const count = document.createElement("strong");
  const progress = document.createElement("span");
  label.textContent = topic.topic;
  count.textContent = `${topic.solved} / ${topic.total}`;
  progress.className = "dsa-insights__percentage";
  progress.textContent = `${topic.percentage}%`;
  item.append(label, count, progress);
  return item;
}

function createInsightProblemRow(problem, dateLabel) {
  const item = document.createElement("li");
  const title = document.createElement("span");
  const date = document.createElement("time");
  title.textContent = problem.title;
  date.dateTime = dateLabel.value;
  date.textContent = dateLabel.text;
  item.append(title, date);
  return item;
}

function renderInsights(problemList) {
  const insights = calculateDsaInsights(problemList);

  insightSolved.textContent = String(insights.totalSolved);
  insightEasy.textContent = String(insights.solvedByDifficulty.Easy);
  insightMedium.textContent = String(insights.solvedByDifficulty.Medium);
  insightHard.textContent = String(insights.solvedByDifficulty.Hard);

  appendInsightRows(
    topicProgressList,
    insights.topicProgress,
    createTopicProgressRow,
    "Add problems to see topic progress."
  );

  weeklyRange.textContent = `(${insights.week.start} – ${insights.week.end})`;
  weeklyCount.textContent = String(insights.solvedThisWeek.length);
  appendInsightRows(
    weeklyProblemsList,
    insights.solvedThisWeek,
    (problem) => createInsightProblemRow(problem, {
      value: problem.dateSolved,
      text: problem.dateSolved,
    }),
    "No solved problems with valid dates this week."
  );

  appendInsightRows(
    revisionProblemsList,
    insights.dueForRevision,
    (problem) => createInsightProblemRow(problem, {
      value: problem.nextRevisionDate,
      text: `Due ${problem.nextRevisionDate}`,
    }),
    "No problems are due for revision."
  );
}

function createProblemCard(problem) {
  const item = document.createElement("li");
  item.className = "dsa-problem";
  item.dataset.problemId = problem.id;

  const header = document.createElement("div");
  header.className = "dsa-problem__header";

  const title = document.createElement("h5");
  title.textContent = problem.title;

  const status = document.createElement("span");
  status.className = "dsa-problem__status";
  status.textContent = problem.status.replace("-", " ");
  header.append(title, status);

  const meta = document.createElement("p");
  meta.className = "dsa-problem__meta";
  meta.textContent = `${problem.platform} · ${problem.topic} · ${problem.difficulty}`;

  const link = document.createElement("a");
  link.href = problem.url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = "Open problem";

  const dates = document.createElement("p");
  dates.className = "dsa-problem__dates";
  const solvedText = problem.dateSolved ? `Solved ${problem.dateSolved}` : "Not marked with a solved date";
  const revisionText = problem.nextRevisionDate
    ? `Next revision ${problem.nextRevisionDate}`
    : "No revision date set";
  dates.textContent = `${solvedText} · ${revisionText}`;

  item.append(header, meta, link, dates);

  if (problem.notes) {
    const notes = document.createElement("p");
    notes.className = "dsa-problem__notes";
    notes.textContent = problem.notes;
    item.append(notes);
  }

  const actions = document.createElement("div");
  actions.className = "dsa-problem__actions";

  const editButton = document.createElement("button");
  editButton.className = "task-item__action";
  editButton.type = "button";
  editButton.dataset.problemAction = "edit";
  editButton.textContent = "Edit";
  editButton.setAttribute("aria-label", `Edit ${problem.title}`);

  const deleteButton = document.createElement("button");
  deleteButton.className = "task-item__action task-item__action--delete";
  deleteButton.type = "button";
  deleteButton.dataset.problemAction = "delete";
  deleteButton.textContent = "Delete";
  deleteButton.setAttribute("aria-label", `Delete ${problem.title}`);

  actions.append(editButton, deleteButton);
  item.append(actions);
  return item;
}

function renderProblems() {
  const currentProblems = listProblems();
  const counts = getProblemCounts(currentProblems);

  solvedCount.textContent = String(counts.status.solved);
  attemptedCount.textContent = String(counts.status.attempted);
  revisionCount.textContent = String(counts.status["revision-needed"]);
  appendCountRows(topicCountsList, counts.byTopic, "No topics yet.");
  appendCountRows(difficultyCountsList, counts.byDifficulty, "No problems yet.");
  renderInsights(currentProblems);
  problemList.replaceChildren();

  if (currentProblems.length === 0) {
    const emptyState = document.createElement("li");
    emptyState.className = "task-list__empty";
    emptyState.textContent = "No problems added yet. Add one above to start tracking.";
    problemList.append(emptyState);
    return;
  }

  for (const problem of currentProblems) {
    problemList.append(createProblemCard(problem));
  }
}

function resetForm() {
  form.reset();
  editingProblemId = null;
  submitButton.textContent = "Add problem";
  cancelButton.hidden = true;
  message.textContent = "";
}

function beginEditing(problemId) {
  const problem = listProblems().find((item) => item.id === problemId);

  if (!problem) {
    message.textContent = "That problem could not be found.";
    return;
  }

  editingProblemId = problem.id;
  titleInput.value = problem.title;
  platformInput.value = problem.platform;
  urlInput.value = problem.url;
  topicInput.value = problem.topic;
  difficultyInput.value = problem.difficulty;
  statusInput.value = problem.status;
  dateSolvedInput.value = problem.dateSolved;
  notesInput.value = problem.notes;
  nextRevisionInput.value = problem.nextRevisionDate;
  submitButton.textContent = "Save changes";
  cancelButton.hidden = false;
  message.textContent = `Editing "${problem.title}".`;
  titleInput.focus();
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const details = {
    title: titleInput.value,
    platform: platformInput.value,
    url: urlInput.value,
    topic: topicInput.value,
    difficulty: difficultyInput.value,
    status: statusInput.value,
    dateSolved: dateSolvedInput.value,
    notes: notesInput.value,
    nextRevisionDate: nextRevisionInput.value,
  };

  try {
    if (editingProblemId) {
      updateProblem(editingProblemId, details);
    } else {
      createProblem(details);
    }
  } catch (error) {
    if (error instanceof TypeError) {
      message.textContent = error.message;
      return;
    }

    showStorageError(error);
    return;
  }

  resetForm();
  renderProblems();
});

problemList.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) {
    return;
  }

  const actionButton = event.target.closest("[data-problem-action]");
  const problemCard = actionButton?.closest(".dsa-problem");

  if (!actionButton || !problemCard) {
    return;
  }

  const problemId = problemCard.dataset.problemId;

  if (actionButton.dataset.problemAction === "edit") {
    beginEditing(problemId);
    return;
  }

  if (actionButton.dataset.problemAction === "delete") {
    try {
      deleteProblem(problemId);
      if (editingProblemId === problemId) {
        resetForm();
      }
      renderProblems();
    } catch (error) {
      showStorageError(error);
    }
  }
});

cancelButton.addEventListener("click", resetForm);
renderProblems();