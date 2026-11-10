# Lucid test harness

Runs one set of tests against many Lucid CMS setups. Each setup is a real `lucid.config.ts` with its own runtime, database and plugins.

The unit tests that sit beside the code in `packages/` are separate. Run those with `npm test`.

## Run it

Build the packages first with `npm run build`. The harness uses their built output.

```sh
npm run harness                                  # everything
npm run harness -- list                          # show setups, lanes and what would run
npm run harness -- --setup node-sqlite           # one setup
npm run harness -- --lane integration --mode host
npm run harness -- --setup node-sqlite --lane integration --mode host -- -t "signs in"
```

Arguments after the second `--` go to the lane's test runner (Vitest or Playwright). When a run has a single job, its output shows live. Otherwise each job writes to a log file.

Browser tests need Playwright's browser once: `npx playwright install chromium`.

## How it fits together

```
tests/
  setups/<name>/        a lucid.config.ts and a setup.ts that describes it
  shared/               the config and collections every setup starts from
  suites/<lane>/<area>/ the tests, grouped by lane and then by area
  harness/src/          the harness itself
  .harness/             run output (ignored by git)
```

- **Setup**: one way to run Lucid. For example `node-postgres`.
- **Lane**: one type of test or measurement. `integration`, `e2e`, `simulation` and `performance` exist today.
- **Mode**: how a lane uses a setup.
  - `host` runs the CMS inside the test process. Every test file gets its own database. It is fast.
  - `served` builds the setup and tests the real server for its runtime.
  - `project` runs nothing. The lane works on the setup's folder, such as timing its build.

For each setup the runner:

1. Creates a template database, migrates it with `lucidcms migrate` and seeds an admin.
2. Runs each lane once per mode that the lane and the setup both support.
3. Gives each test file a cheap copy of the template (host), or starts one server (served).
4. Runs measuring lanes last, one setup at a time, so nothing else skews the numbers.
5. Collects every lane's results into one report.

Each step only happens when a lane needs it. A run of only the `performance` lane prepares no database.

## Write a test

Put the file in `suites/<lane>/<area>/`. Tests are the same for every setup.

```ts
import { describe, expect, requires, test } from "#harness/vitest";

describe("creating documents", () => {
  test("creates a page", async ({ lucid }) => {
    const admin = await lucid.admin();
    const created = await admin.request({
      method: "POST",
      path: "/api/v1/documents/page",
      body: {
        fields: [{ key: "title", type: "text", value: "Hi" }],
      },
    });
    expect(created.status).toBe(201);
  });
});
```

- `lucid.admin()` is a session signed in as the seeded super admin.
- `lucid.session()` is a new visitor with their own cookies and rate limits.
- In served mode every test shares one server and database, so create the data you need and do not assume the database is empty.

### Skip what a setup cannot do

Call `requires()` at the top of a file or inside a `describe`. On setups that lack the capability, the tests it covers are reported as not applicable, with the reason. They do not count as passed, failed or skipped, so each setup is judged on the tests that apply to it: `node-sqlite: 12/12 applicable tests passed, 8 not applicable`.

```ts
describe("page paths", () => {
  requires("plugin:pages");
  // ...
});
```

Capabilities are read from each setup's config, so most need no upkeep:

| Capability                     | From                        |
| ------------------------------ | --------------------------- |
| `mode:host`, `mode:served`     | the current mode            |
| `runtime:node`                 | the setup's runtime         |
| `database:postgres`            | the database adapter        |
| `database.sharedRowLocks`      | the adapter's support flags |
| `database.concurrentWrites`    | a real Postgres server only |
| `plugin:pages`                 | registered plugins          |
| `collection:page`, `locale:fr` | collections and locales     |
| `auth:password`, `feature:ai`  | enabled options             |

A setup can correct the list in its `setup.ts` with `capabilities: { add, remove }`.

A full run also lists any test that applied to no setup at all. That usually means a mistyped capability.

### Browser tests

Files in `suites/e2e` end in `.spec.ts` and import from `#harness/playwright`. The browser starts signed in as the admin. The `lucid` fixture is there for preparing data over the API.

### Simulation tests

A simulation tries many random sequences of actions against a fresh CMS and checks rules after every action. See `suites/simulation/documents/page-lifecycle.test.ts`.

- A failure is shrunk to the shortest sequence that still fails.
- Replay it with the seed it prints: `npm run harness -- --lane simulation --seed 42`.
- `--simulation-runs` sets how many sequences each simulation tries.
- Each simulation records a digest of what its actions returned. The report compares digests between setups for the same seed, so a database that behaves differently is flagged even when no rule breaks.
- `adapters` swaps in faulty adapters, such as a queue that drops deliveries. `withFaults` builds one.

### Benchmarks

Files in `suites/performance` end in `.bench.ts` and import from `#harness/performance`. A benchmark does its work once per sample and returns what it measured. See `suites/performance/builds/cms-build.bench.ts`, which times `lucidcms build` and sizes what it wrote.

- The report keeps each metric's median, and how much the samples varied.
- `--performance-runs` sets how many samples to take. One warm-up sample is thrown away first.
- Each metric has a `tolerance`, the share it may grow before that counts as a regression, and says whether a regression is `blocking`. Timings default to 15% and not blocking. Everything else defaults to 1% and blocking.

## Add a setup

1. Create `setups/<name>/lucid.config.ts`. Spread `sharedConfig()` from `shared/config.ts` and read the database from `getDatabaseUrl(env)`. `sharedConfig()` is the bare minimum. Turn features on by adding fragments from `shared/fragments`, such as `localization`.
2. Create `setups/<name>/setup.ts`:

```ts
import { defineSetup } from "#harness/setup";

export default defineSetup({
  description: "Node with SQLite and no plugins.",
  runtime: "node",
  database: "sqlite",
});
```

The setup then appears in `list`, in runs and in CI.

Setups add to the shared content model. They never change it. A plugin that changes a collection gets its own collection in that setup (see `setups/node-postgres`), so shared tests behave the same everywhere.

## Add a lane

A lane is a command that reads the context file named in `HARNESS_CONTEXT` and writes its results with `writeLaneResult`.

- For Vitest or Playwright, define it with `createVitestLane` or `createPlaywrightLane`, add it to `harness/src/lanes/get-lanes.ts` and create `suites/<key>/`.
- For another test runner, write a `Lane` with its own command and a reporter that calls `writeLaneResult`.

## Databases and services

| Setup asks for | The harness provides                                  |
| -------------- | ----------------------------------------------------- |
| `sqlite`       | a temporary file per test file                        |
| `libsql`       | a real libSQL server, with a namespace per database   |
| `postgres`     | a real Postgres server, with a database per test file |

Postgres and libSQL run in Docker from `docker-compose.yml`. The harness starts the ones a run needs and leaves them running, so the next run starts at once. Stop them with `docker compose down` in this folder.

- To use a server that is already running, set `HARNESS_POSTGRES_URL`, or `HARNESS_LIBSQL_URL` and `HARNESS_LIBSQL_ADMIN_URL`.
- Without Docker, or with `--no-services`, Postgres falls back to PGlite in memory. PGlite is one session shared by every connection, so it cannot show how separate connections block or race each other. Tests for that should require `database.concurrentWrites`.
- libSQL setups need the server, and fail with a clear message without it.

To support another engine, add a driver in `harness/src/databases/` and register it in `get-driver.ts`.

## Reports

Each run writes to `.harness/runs/<id>/`, and `.harness/latest` points at the newest:

- `report.html`: results per setup, measurements, every test against every setup, then the failures in full.
- `report.json`: the same data for tools.
- `summary.md`: used as the GitHub job summary.
- `<setup>/`: logs for migrations, the server and each lane.

Set `HARNESS_POSTHOG_KEY` (and `HARNESS_POSTHOG_HOST` if it is not `https://eu.i.posthog.com`) to send a `harness_run` event, a `harness_test` event per result and a `harness_measurement` event per measurement.

### Compare two runs

```sh
npm run harness -- compare base/report.json .harness/latest/report.json
```

This writes `.harness/comparison/comparison.md` and `comparison.json`. They list tests that newly fail, were fixed, added or removed, and every measurement against its previous value. Only lane runs that both reports have are compared.

The command fails when a blocking measurement regressed, such as a larger server bundle. Pass `--report-only` to never fail.

## CI

`.github/workflows/harness.yml` runs one job per setup, merges the reports and compares them with master.

- Pull requests run `--profile pr`: everything except integration tests against the built server.
- Pushes to master and the nightly run cover everything. Their merged report is the baseline for later pull requests.
- On a pull request, the summary and the comparison are posted as one comment, which is updated on each run. It is written for reviewers and review agents.
