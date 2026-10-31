# LifeOS

LifeOS is a personal productivity dashboard built with plain HTML, CSS, and vanilla JavaScript. It brings task planning, DSA practice, habit tracking, expense tracking, and a task calendar together in one browser-based interface.

> **Live demo:** _Add the deployed LifeOS URL here._

## Features

The dashboard derives its overview from the saved module records. It shows today's tasks and their completion rate, habit streaks, DSA progress and revision reminders, current-month spending against budget, and upcoming task deadlines. Empty states are shown when there is no data to summarize.

### Tasks & Study

- Create, edit, complete, and delete tasks.
- Add a category, priority, due date, and optional estimated duration.
- Search tasks, filter by status and category, and sort by priority.
- Review tasks grouped by date, including overdue, today's, and upcoming work.

### DSA Tracker

- Create, edit, and delete problem records with a title, platform, URL, topic, difficulty, status, solved date, notes, and next revision date.
- Track solved, attempted, and revision-needed problems.
- View solved totals, difficulty and topic breakdowns, a weekly solved summary, and revision reminders.
- LeetCode can be selected as a platform, but records are entered manually; automatic LeetCode synchronization is not implemented.

### Habits

- Create, rename, and delete habits with a weekly target frequency.
- Record a completion for a specific local calendar date.
- Review current and longest streaks and completion rate for the last seven calendar days.

### Expenses

- Create, edit, and delete income and expense transactions.
- Record amount in INR, category, date, and optional description.
- Review current-month income, expenses, and net balance.
- Set an overall monthly spending budget and optional category budgets, and see remaining budget or warning states.

### Calendar

- Browse months and select a date to view its agenda.
- See tasks on their due dates; the calendar reads the existing task records rather than keeping a separate copy.

## Screenshots

Screenshots are not currently included in the repository. Add images of the dashboard and module views here when available.

## Tech stack

- **HTML5** for semantic page structure and accessible controls.
- **CSS** for the responsive dashboard layout and design system.
- **Vanilla JavaScript (ES modules)** for module behavior, calculations, and rendering.
- **Browser `localStorage`** for client-side persistence.
- **Vitest** for focused tests of pure JavaScript utilities.

There is no frontend framework, bundler, or build step. Node.js and npm are used for running the tests, not for serving the application in production.

## Local setup

1. Clone the repository and enter its root directory:

   ```sh
   git clone https://github.com/ankittadiyal/lifeos.git
   cd lifeos
   ```

2. To run the automated tests, install the development dependencies and run Vitest:

   ```sh
   npm install
   npm test
   ```

3. To open the app locally, serve the repository root over HTTP. For example, with Python 3:

   ```sh
   python3 -m http.server 8000
   ```

   Then visit <http://localhost:8000>. Serving over HTTP is recommended because the app uses browser ES modules; opening `index.html` directly with a `file://` URL may prevent modules from loading.

## Architecture and project structure

`index.html` defines the dashboard and module sections. It links the shared stylesheet and loads the browser JavaScript entry modules. The sidebar uses in-page links, and `js/navigation.js` updates the active navigation state. Each module reads or writes its own saved records through the shared storage helpers in `js/storage.js`. Pure calculations are kept separate from DOM rendering where applicable, allowing the utilities to be tested independently.

Key project files:

```text
.
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── navigation.js
│   ├── storage.js
│   └── modules/
│       ├── tasks.js
│       ├── task-utils.js
│       ├── dsa.js
│       ├── dsa-insights.js
│       ├── habits.js
│       ├── habits-ui.js
│       ├── habit-analytics.js
│       ├── expenses.js
│       ├── expenses-ui.js
│       ├── expense-calculations.js
│       ├── calendar.js
│       ├── calendar-data.js
│       ├── dashboard.js
│       └── dashboard-metrics.js
├── tests/
│   ├── calendar-data.test.js
│   ├── dashboard-metrics.test.js
│   ├── expense-calculations.test.js
│   ├── habit-analytics.test.js
│   └── task-utils.test.js
├── package.json
└── package-lock.json
```

The modules communicate updates in the page through browser events. For example, task changes trigger calendar and dashboard refreshes, while changes to DSA, habit, or expense records refresh the dashboard summary.

## Data persistence and limitations

LifeOS saves records in the browser's `localStorage`, using separate keys for tasks, DSA problems, habits, transactions, and monthly budgets. This is local browser storage, not a hosted database:

- Data is specific to the browser profile and site origin. It is not automatically shared across devices, browsers, or deployment domains.
- **Multi-device cloud sync is not available.**
- Clearing site data or browser storage can remove saved records. There is no built-in server-side backup or account recovery.

## Tests

Run the test suite with:

```sh
npm test
```

The current Vitest tests cover task filtering and date grouping, dashboard task metrics, habit streak analytics, monthly expense and budget calculations, and calendar date helpers.

## Future improvements

Potential future work, not currently implemented, could include:

- Optional account-based cloud synchronization and backup.
- Data export and import for user-managed backups.
- Additional accessibility and usability refinements based on testing.
- More automated tests for module workflows and edge cases.
