# Lucid test harness

Runs one set of tests against many Lucid CMS setups. Each setup is a real `lucid.config.ts` with its own runtime, database and plugins.

The unit tests that sit beside the code in `packages/` are separate. Run those with `npm test`.

## Run it

Build the packages first with `npm run build`. The harness uses their built output.

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

A run leaves out the benchmarks unless they are asked for, as they take most of a full run. `--file` keeps test files whose path holds the text, and `--test` keeps tests whose describe blocks and name match the pattern. Both can be repeated. Arguments after the second `--` go to the lane's test runner (Vitest or Playwright).

### While it runs

In a terminal, a run draws a dashboard. On the left is each setup and its lanes: what each one is waiting on, how many tests it has run, and how long it took last time. On the right are the tests running now, what has failed so far and the slowest tests. A lane that has reported nothing for 30 seconds says so, as it may be stuck. When an earlier run had the same lanes, the top line estimates the time left.

In CI, in a pipe or with `--plain`, a run prints a line when a lane starts or ends and when a test fails, and a progress line when it has been quiet for 30 seconds. When a run has a single lane, the lane's own output shows instead.

`npm run harness -- status` shows the latest run from another terminal: whether it is still running, finished or died without finishing, and the same dashboard. `--json` prints it for tools.

Ctrl+C stops every lane and removes the run's databases and servers, then writes the report. A second Ctrl+C quits at once. A lane that runs for longer than `--job-timeout` minutes (15 by default) is stopped and reported as failed.

### When it ends

The report starts with whether the run passed. Then come the failures, each with its error, its log and the command that runs it again, and a table of each setup's lanes. After those are the measurements, with a column per setup and a mark on what changed since the last run, and the slowest tests.

Browser tests need Playwright's browser once: `npx playwright install chromium`.

## How it fits together

```
tests/
  setups/<name>/        a lucid.config.ts and a setup.ts that describes it
  shared/               the config and collections every setup starts from
  shared/migrations/    the config versions that migration tests move between
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

1. Creates a template database, migrates it with `lucidcms migrate` and seeds an admin. The server builds at the same time.
2. Runs each lane once per mode that the lane and the setup both support.
3. Gives each test file a cheap copy of the template (host), or starts one server (served).
4. Runs measuring lanes last, one setup at a time, so nothing else skews the numbers.
5. Collects every lane's results into one report.

Each step only happens when a lane needs it. A run of only the `performance` lane prepares no database.

Lanes run side by side, across setups and within them. A host lane starts as soon as the template is ready, while the server is still building. At most `--concurrency` lanes run at once (half the CPU cores by default), each with `--workers` test workers, so they share the machine. Lanes that took longest last time start first. Lanes on the same server take turns, as they share its database.

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

- `lucid.admin()` is a session signed in as the seeded super admin. It renews its access token when it expires, as the admin app does. Other sessions answer exactly as the CMS does.
- `lucid.session()` is a new visitor with their own cookies, client address and rate limits.
- `lucid.user({ roleIds, superAdmin })` invites a new user as the admin, accepts the invitation from its email and signs them in, so a test can act as someone else. It needs `harness:outbox`. See `suites/integration/auth/invitations.test.ts`.
- `lucid.user({ permissions })` also makes a role for that user alone, with exactly those permissions. It returns the user's `id` and the role's `roleId`, so a test can change what the user may do.
- `lucid.invite()` invites a user without accepting, and returns the token from the email, for tests of how invitations are accepted.
- `lucid.email({ to, template })` waits for an email the CMS sent and returns the newest, with the data it was rendered from, such as a magic link's `loginLink` and `code`. `after` waits for one more than that many. `lucid.emails()` lists them without waiting. In host mode each CMS has its own outbox, so a test only sees its own emails. Send emails to users the test made, as the served server's outbox is shared.
- In served mode every test shares one server and database, so create the data you need and do not assume the database is empty.
- `useVariant(name)` at the top of a file runs its tests on a CMS with a change to the setup's config, such as no password login. See `shared/variants.ts`. Variants only run in host mode.
- `advanceClock(ms)` moves the clock forward for the rest of the test, such as past a token's expiry. It only works in host mode, where the CMS shares the test's clock. Sign in again on a new session after a long jump, as the shared admin's tokens would be renewed in the future.
- `lucid.query(use)` runs queries on the CMS's database, for what the API can't show, such as the storage count media limits are checked against. It only works in host mode.
- `lucid.uploads` is the folder Node setups store uploads in. In host mode each CMS has its own, so a test can compare the files on disk with what the database holds. See `findStorageDrift` in `shared/media.ts`.
- The `migrations` fixture gives empty databases for tests that migrate themselves. See `suites/integration/migrations`.
- Helpers for documents, media, permissions and signing in live in `shared/`. Each route the CMS serves needs a rule in `shared/permissions.ts`, as `suites/integration/permissions/routes.test.ts` fails on a route without one.

### Skip what a setup cannot do

Call `requires()` at the top of a file or inside a `describe`. On setups that lack the capability, the tests it covers are reported as not applicable, with the reason. They do not count as passed, failed or skipped, so each setup is judged on the tests that apply to it: `node-sqlite: 12/12 applicable tests passed, 8 not applicable`.

```ts
describe("page paths", () => {
  requires("plugin:pages");
  // ...
});
```

Capabilities are read from each setup's config, so most need no upkeep:

| Capability                     | From                          |
| ------------------------------ | ----------------------------- |
| `mode:host`, `mode:served`     | the current mode              |
| `runtime:node`                 | the setup's runtime           |
| `database:postgres`            | the database adapter          |
| `database.sharedRowLocks`      | the adapter's support flags   |
| `database.concurrentWrites`    | a real Postgres server only   |
| `plugin:pages`                 | registered plugins            |
| `collection:page`, `locale:fr` | collections and locales       |
| `auth:password`, `feature:ai`  | enabled options               |
| `harness:outbox`               | the `outbox` fragment         |
| `harness:identityProvider`     | the `authentication` fragment |
| `feature:mediaStorage`         | any media storage adapter     |
| `plugin:filesystem`            | the `node-media` fragment     |

A setup can correct the list in its `setup.ts` with `capabilities: { add, remove }`.

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

### Browser tests

Files in `suites/e2e` end in `.spec.ts` and import from `#harness/playwright`. The browser starts signed in as the admin. The `lucid` fixture is there for preparing data over the API.

`pageAs(session)` opens a new page signed in as someone else, such as a user from `lucid.user()`. See `suites/e2e/permissions/access.spec.ts`. Only one person can have a document open for editing, so give each page its own document.

- Each browser has its own client address, so tests that log in don't share rate limits.
- The served server is at `localhost`, as browsers only allow passkeys on a domain. `addVirtualAuthenticator(page)` gives a page's browser a passkey authenticator that always passes. The login page offers its passkeys as soon as it opens.

### Simulation tests

A simulation tries many random sequences of actions against a fresh CMS and checks rules after every action. See `suites/simulation/documents/document-lifecycle.test.ts`.

- A failure is shrunk to the shortest sequence that still fails.
- Replay it with the seed it prints: `npm run harness -- --lane simulation --seed 42`.
- `--simulation-runs` sets how many sequences each simulation tries. A simulation may take a minute per sequence before it times out, so it needs no timeout of its own.
- Each simulation records a digest of what its actions returned. The report compares digests between setups for the same seed, so a database that behaves differently is flagged even when no rule breaks.
- `adapters` swaps in faulty adapters, such as a queue that drops deliveries. `withFaults` builds one. It is given the folder the CMS stores uploads in, for storage that wraps the real one. See `suites/simulation/media/media-lifecycle.test.ts`.
- `variant` runs every sequence on a variant of the setup's config, such as `media-limits`.
- `setup` runs at the start of each sequence, such as to create the users its actions work with. See `suites/simulation/auth/sign-in-model.test.ts`.

### Benchmarks

Files in `suites/performance` end in `.bench.ts` and import from `#harness/performance`. A benchmark does its work once per sample and returns what it measured. See `suites/performance/builds/cms-build.bench.ts`, which times `lucidcms build` and sizes what it wrote.

- Benchmarks only run when asked for, with `--lane performance` or `--profile full`.
- The report keeps each metric's median, and how much the samples varied.
- `--performance-runs` sets how many samples to take. One warm-up sample is thrown away first, unless the benchmark sets `warmups: 0` and warms up more cheaply in `prepare`, as the migrate and documents benchmarks do.
- Arguments after the second `--` keep a run to the benchmark files whose path holds one of them: `npm run harness -- --lane performance -- documents`.
- `database()` gives a benchmark an empty database for the setup, such as to time its migrations. See `suites/performance/migrations/migrate.bench.ts`.
- `prepare` runs once before the samples, for what would take too long to make each time. What it returns is given to every sample, and to `cleanup` at the end.
- `serve(database)` builds the setup and starts its real server on a migrated database, to time requests. See `suites/performance/documents/documents.bench.ts`, which fills a CMS with stories and times reading, listing, saving, creating and publishing them. It also reports each one's database queries, which are exact, so a change in them fails a comparison.
- Each metric has a `tolerance`, the share it may grow before that counts as a regression, and says whether a regression is `blocking`. Timings default to 15% and not blocking. Everything else defaults to 1% and blocking.

## Add a setup

1. Create `setups/<name>/lucid.config.ts`. Spread `sharedConfig()` from `shared/config.ts` and read the database from `getDatabaseUrl(env)`. `sharedConfig()` is the bare minimum. Turn features on by adding fragments from `shared/fragments`, such as `localization`. Every setup spreads in `authentication(env)` and adds `email: outbox(env.HARNESS_OUTBOX)`, which sends emails to the harness for `lucid.user()` and magic links. Every setup spreads in `mediaConfig(env)` from `fragments/media.ts`, and Node setups add `nodeMediaPlugins(env.HARNESS_UPLOADS)`, which stores uploads and processes images. Node setups also wrap their config in `withSchemaStep()`, which migration tests use to move between config versions.
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
- For another test runner, write a `Lane` with its own command and a reporter that calls `writeLaneResult`. For the dashboard, the reporter also calls `emitProgress` as files are found and tests start and end. See `harness/src/progress/types.ts`.
- A lane's command runs in its own process group, so stopping it stops everything it started.

## Databases and services

| Setup asks for | The harness provides                                  |
| -------------- | ----------------------------------------------------- |
| `sqlite`       | a temporary file per test file                        |
| `libsql`       | a real libSQL server, with a namespace per database   |
| `postgres`     | a real Postgres server, with a database per test file |

Postgres and libSQL run in Docker from `docker-compose.yml`. The harness starts the ones a run needs and leaves them running, so the next run starts at once. Stop them with `docker compose down` in this folder.

- To use a server that is already running, set `HARNESS_POSTGRES_URL`, or `HARNESS_LIBSQL_URL` and `HARNESS_LIBSQL_ADMIN_URL`.
- Every database a run makes has a name starting with the run's ID. At the end of a run, Postgres databases its test processes left behind, such as when the run was stopped, are removed. libSQL cannot list its namespaces, so those stay until `docker compose down`.
- Without Docker, or with `--no-services`, Postgres falls back to PGlite in memory. PGlite is one session shared by every connection, so it cannot show how separate connections block or race each other. Tests for that should require `database.concurrentWrites`.
- libSQL setups need the server, and fail with a clear message without it.

To support another engine, add a driver in `harness/src/databases/` and register it in `get-driver.ts`.

### Fakes

Each run also starts a small local server for services a CMS reaches over HTTP, so they work from every runtime, Workers included. See `harness/src/fakes/`.

- An outbox. The `outbox` fragment posts each email to `HARNESS_OUTBOX`, and the harness keeps it in the setup's run folder for `lucid.email()`.
- An OAuth 2.0 and OpenID Connect identity provider at `HARNESS_IDP_URL`, for the `authentication` fragment's providers. It checks clients, redirects and PKCE like a real one.
- Lucid's own API, at `LUCID_CMS_INTERNAL_REMOTE_API_URL_OVERRIDE`, so connecting to Lucid and features that call it never reach Lucid's servers. It answers the discovery and client registration a connection starts with.

## Reports

Each run writes to `.harness/runs/<id>/`, and `.harness/latest` points at the newest:

- `report.html`: results per setup, measurements, every test against every setup, then the failures in full.
- `report.json`: the same data for tools.
- `summary.md`: used as the GitHub job summary.
- `status.json`: what the run was doing, saved every few seconds, which `status` reads.
- `<setup>/`: logs for migrations, the server and each lane, and each lane's progress events.

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
