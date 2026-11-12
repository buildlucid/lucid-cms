# Lucid test harness

Runs one set of tests against many Lucid CMS setups. Each setup is a real `lucid.config.ts` with its own runtime, database and plugins.

The unit tests that sit beside the code in `packages/` are separate. Run those with `npm test`.

## Run it

Build the packages first with `npm run build`. The harness uses their built output. Browser tests need Playwright's browser once: `npx playwright install chromium`.

```sh
npm run harness                                  # every test lane on every setup
npm run harness -- --lane performance            # the benchmarks
npm run harness -- --profile full                # tests and benchmarks, as CI runs on master
npm run harness -- list                          # show setups, lanes and what would run
npm run harness -- --setup node-sqlite           # one setup
npm run harness -- --lane integration --mode host
npm run harness -- --file documents/listing --test "lists stories"
npm run harness -- --failed                      # what failed in the latest run, again
npm run harness -- status                        # check on a run from another terminal
```

A run leaves out the benchmarks unless they are asked for, as they take most of a full run. `--file` keeps test files whose path holds the text, and `--test` keeps tests whose describe blocks and name match the pattern. Both can be repeated. Arguments after the second `--` go to the lane's test runner (Vitest or Playwright). `--help` lists every option.

### While it runs

A run prints a line that stays in the scrollback when a lane finishes, when a test fails (with the start of its error and the command that runs it again), for warnings and for steps such as starting Docker. In a terminal, a small block under those lines shows each lane that has not finished, then how far the run has got:

```
✓ node-sqlite          simulation host      16 passed             1m 45s
✗ node-postgres        integration host     documents/listing › listing documents › sorts by number
    AssertionError: expected [ 3, 1 ] to deeply equal [ 1, 3 ]
    Again  npm run harness -- --setup node-postgres --lane integration --mode host --file documents/listing.test.ts --test 'sorts by number'
────────────────────────────────────────────────────────────────────────────
⠹ cloudflare-postgres  integration served   212/618  1 failed     3m 02s of ~6m 00s
⠹ node-libsql          integration host     540/618               4m 11s  quiet for 45.0s · agent/routines › …
◌ node-libsql          e2e served           waiting for its turn
9/14 lanes · 1 failed · 5m 12s elapsed · about 4m left
```

A row shows how long its lane took last time. A lane that has reported nothing for 30 seconds says so and names the oldest test it is running, as it may be stuck. A long test that reports progress, such as a simulation, shows how far it has got. When every lane left has an earlier time, the last line estimates the time left. It leaves out building servers and preparing databases, so it can run short early on.

In CI, in a pipe or with `--plain`, a run prints the same lines without the block, and a progress line when it has been quiet for 30 seconds. When a run has a single lane, the lane's own output shows instead.

`npm run harness -- status` shows the latest run from another terminal: whether it is still running, finished or died without finishing, and the same block. `--json` prints it for tools.

Ctrl+C stops every lane and removes the run's databases and servers, then writes the report. A second Ctrl+C quits at once. A lane that runs for longer than `--job-timeout` minutes (15 by default) is stopped and reported as failed.

### When it ends

The report starts with whether the run passed. Then come the failures again, each with its error, its log and the command that runs it again, and a table of each setup's lanes. After those are the measurements, with a column per setup and the last run's value beside each one, the slowest tests and any test that applied to no setup. It ends with the run's folder.

## How it fits together

```
tests/
  setups/<name>/        a lucid.config.ts and a setup.ts that describes it
  shared/config/        what a setup's config loads: the shared config, collections and fragments,
                        and the config versions and seeds migration and seed tests move between
  shared/helpers/       what tests import: helpers for documents, requests, media, auth and more
  suites/<lane>/<area>/ the tests, grouped by lane and then by area
  harness/src/          the harness itself. Tests and shared code import it through #harness/*
  .harness/             run output (ignored by git)
```

- **Setup**: one way to run Lucid. For example `node-postgres`.
- **Lane**: one type of test or measurement. `integration`, `e2e`, `simulation` and `performance` exist today.
- **Mode**: how a lane uses a setup.
  - `host` runs the CMS inside the test process. Every test file gets its own database. It is fast.
  - `served` builds the setup and tests the real server for its runtime.
  - `project` runs nothing. The lane works on the setup's folder, such as timing its build.

For each setup the runner:

1. Creates a template database, migrates it with `lucidcms migrate` and seeds an admin. The server builds at the same time.
2. Runs each lane once per mode that the lane and the setup both support.
3. Gives each test file a cheap copy of the template (host), or starts one server (served).
4. Runs measuring lanes last, one setup at a time, so nothing else skews the numbers.
5. Collects every lane's results into one report.

Each step only happens when a lane needs it. A run of only the `performance` lane prepares no database.

Lanes run side by side, across setups and within them. A host lane starts as soon as the template is ready, while the server is still building. At most `--concurrency` lanes run at once (half the CPU cores by default), each with `--workers` test workers, so they share the machine. Lanes that took longest last time start first. Lanes on the same server take turns, as they share its database.

## Write a test

Put the file in `suites/<lane>/<area>/`. Tests are the same for every setup. The `lucid` fixture is the CMS under test in every lane: `lucid.admin()` is a session signed in as the seeded super admin, `lucid.session()` a new visitor and `lucid.user()` someone the admin invited. Helpers for documents, requests, media, signing in, jobs, AI and more are in `shared/helpers/`, and agent scripts and media files come from `#harness/client`. Each helper says in its comment what it needs and when to use it.

An integration test, in `suites/integration` with `#harness/vitest`:

```ts
import { describe, expect, test } from "#harness/vitest";
import { titled } from "#shared/helpers/documents";

describe("creating documents", () => {
  test("creates a page", async ({ lucid }) => {
    const admin = await lucid.admin();
    const created = await admin.request({
      method: "POST",
      path: "/api/v1/documents/page",
      body: titled("Hi"),
    });
    expect(created.status).toBe(201);
  });
});
```

A browser test, in `suites/e2e` with `#harness/playwright`. The browser starts signed in as the admin, and `pageAs(session)` opens a page as someone else:

```ts
import { expect, requires, test } from "#harness/playwright";

test.describe("memories", () => {
  requires("agent:harness");

  test("opens the memories page", async ({ page }) => {
    await page.goto("/admin/agent/memories");
    await expect(
      page.getByRole("button", { name: "New Memory" }).first(),
    ).toBeVisible();
  });
});
```

A simulation, in `suites/simulation` with `#harness/simulation`. It tries many random sequences of actions against a fresh CMS and checks its rules after every action. A failure is shrunk to the shortest sequence that still fails, and replays with the seed it prints: `npm run harness -- --lane simulation --seed 42`.

```ts
const createStory = action<Model, string>({
  name: "createStory",
  input: fc.string({ minLength: 1 }),
  run: async ({ admin, model, input }) => {
    model.ids.push(await createDocument(admin, STORY_KEY, titled(input)));
  },
});

simulation("stories are listed once each", {
  model: () => ({ ids: [] }),
  actions: [createStory],
  invariants: {
    "every story is listed": async ({ admin, model }) => {
      const listed = await admin.request<{ data: Array<{ id: number }> }>({
        path: `/api/v1/documents/${STORY_KEY}/latest`,
      });
      expect(sorted(listed.body.data.map((story) => story.id))).toEqual(
        sorted(model.ids),
      );
    },
  },
});
```

A benchmark, in `suites/performance` with `#harness/performance`. It does its work once per sample and returns what it measured. The report keeps each metric's median and the last run's beside it. Benchmarks only run when asked for, with `--lane performance` or `--profile full`, and `--performance-runs` sets how many samples they take.

```ts
benchmark({
  id: "build",
  sample: async ({ setup, env, work }) => {
    const run = await runMeasured({
      command: "lucidcms",
      args: ["build"],
      cwd: setup.directory,
      env,
      log: `${work}/build.log`,
    });
    return {
      duration: { label: "Build time", unit: "ms", value: run.durationMs },
    };
  },
});
```

### Rules that matter

- In served mode every test shares one server and database, so create the data you need and don't assume the database is empty. The server's outbox and its connection to Lucid's API are shared too, so send emails to users the test made, and leave the connection alone.
- Some things only work in host mode, where each test file has its own CMS and shares the test's clock: `useVariant()`, `advanceClock()`, `lucid.query()`, the `migrations` fixture, `changeConnection()` and `tick(lucid, at)`. Call `requires("mode:host")` where you use them.
- Each route the CMS serves needs a rule in `shared/helpers/permissions.ts`, as `suites/integration/permissions/routes.test.ts` fails on a route without one.

### Skip what a setup cannot do

Call `requires()` at the top of a file or inside a `describe`. On setups that lack the capability, the tests it covers are reported as not applicable, with the reason. They do not count as passed, failed or skipped, so each setup is judged on the tests that apply to it: `node-sqlite: 12/12 applicable tests passed, 8 not applicable`.

```ts
describe("page paths", () => {
  requires("plugin:pages");
  // ...
});
```

Capabilities are read from each setup's config, so a setup that goes without an ability loses its capability by itself:

| Capability                     | From                                            |
| ------------------------------ | ----------------------------------------------- |
| `mode:host`, `mode:served`     | the current mode                                |
| `runtime:node`                 | the setup's runtime                             |
| `database:postgres`            | the database adapter                            |
| `database.sharedRowLocks`      | the adapter's support flags                     |
| `database.concurrentWrites`    | a real Postgres server only                     |
| `plugin:pages`                 | registered plugins                              |
| `collection:page`, `locale:fr` | collections and locales                         |
| `agent:harness`                | enabled agents, from the `ai` ability           |
| `auth:password`, `feature:ai`  | enabled options                                 |
| `harness:outbox`               | the `outbox` ability                            |
| `harness:identityProvider`     | the `identityProvider` ability                  |
| `feature:mediaStorage`         | any media storage adapter, such as from `media` |
| `plugin:filesystem`            | the `media` ability on Node                     |
| `plugin:harness-jobs`          | the `jobs` ability                              |
| `queue:inline`, `queue:worker` | the queue adapter                               |
| `queue.delayedDelivery`        | the queue adapter's support                     |

A setup can correct the list in its `setup.ts` with `capabilities: { add, remove }`. Helpers that need a capability, such as `lucid.user()` needing `harness:outbox`, fail at once on a setup without it and say which `requires()` to add.

When a test only finds out once it runs that it doesn't apply, such as one case of a `test.for` that has nothing to check on this setup, skip it with `notApplicable(reason)`. It is reported as not applicable, like `requires()`, rather than skipped.

```ts
test.for(groups)("checks $name", (group, { lucid, skip }) => {
  skip(
    group.routes.length === 0,
    notApplicable("The setup has none of these routes."),
  );
});
```

A full run also lists any test that applied to no setup at all. That usually means a mistyped capability.

## Add a setup

1. Create `setups/<name>/lucid.config.ts`. Read the database from `getDatabaseUrl(env)` and return `nodeHarnessConfig(env)` from `shared/config/node-config.ts`, or `harnessConfig(env)` from `shared/config/config.ts` on another runtime. Every shared collection and ability comes with it. Add the setup's own collections and plugins with `collections` and `plugins`, and switch off what it can't do with `without`, such as `without: ["ai"]`. Tests that need an ability it goes without are then reported as not applicable there.
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
- For another test runner, write a `Lane` with its own command and a reporter that calls `writeLaneResult`. For the live output, the reporter also calls `emitProgress` as files are found and tests start and end. See `harness/src/progress/types.ts`.
- A lane's command runs in its own process group, so stopping it stops everything it started.

## Databases and services

| Setup asks for | The harness provides                                  |
| -------------- | ----------------------------------------------------- |
| `sqlite`       | a temporary file per test file                        |
| `libsql`       | a real libSQL server, with a namespace per database   |
| `postgres`     | a real Postgres server, with a database per test file |

Postgres and libSQL run in Docker from `docker-compose.yml`. The harness starts the ones a run needs and leaves them running, so the next run starts at once. Stop them with `docker compose down` in this folder.

- To use a server that is already running, set `HARNESS_POSTGRES_URL`, or `HARNESS_LIBSQL_URL` and `HARNESS_LIBSQL_ADMIN_URL`.
- Every database a run makes has a name starting with the run's ID. At the end of a run, Postgres databases its test processes left behind are removed. libSQL cannot list its namespaces, so those stay until `docker compose down`.
- Without Docker, or with `--no-services`, Postgres falls back to PGlite in memory. PGlite is one session shared by every connection, so tests of how connections block or race each other should require `database.concurrentWrites`.

To support another engine, add a driver in `harness/src/databases/` and register it in `get-driver.ts`.

### Fakes

Each run also starts a small local server for services a CMS reaches over HTTP, so they work from every runtime, Workers included. See `harness/src/fakes/`.

- An outbox for sent emails, which `lucid.email()` reads.
- A ledger, which probe jobs post what each attempt did to.
- An OAuth 2.0 and OpenID Connect identity provider for the `identityProvider` ability's sign-in providers, and OAuth client metadata documents for clients a CMS knows only by a URL.
- Lucid's own API, so connecting to Lucid and the AI features never reach Lucid's servers. Its model answers from the scripts tests send, and it checks every transcript as a real model API would. The served server is connected to it before its tests start.

## Reports

Each run writes to `.harness/runs/<id>/`, and `.harness/latest` points at the newest:

- `report.json`: every lane run's results, for tools and `--failed`.
- `summary.md`: used as the GitHub job summary.
- `status.json`: what the run was doing, saved every few seconds, which `status` reads.
- `<setup>/`: logs for migrations, the server and each lane, and each lane's progress events.

A run keeps the newest 20 run folders and removes older ones when it starts. `.harness/history.json` keeps how long each lane took and each measurement's median from the last full run, for start order, estimates and the "was" values in the report.

## CI

`.github/workflows/harness.yml` runs one job per setup and merges their reports.

- Pull requests run `--profile pr`: everything except integration tests against the built server.
- Pushes to master and the nightly run cover everything.
- On a pull request, the summary is posted as one comment, which is updated on each run. It is written for reviewers and review agents.
