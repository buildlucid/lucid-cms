import path from "node:path";
import {
	benchmark,
	countQueries,
	type Metric,
	measureRequests,
	runMeasured,
	type ServedCms,
} from "#harness/performance";
import { HARNESS_JOB_ROUTES } from "#shared/fragments/jobs";
import type { Job } from "#shared/jobs";

const REQUESTS = 20;
const MINUTE_MS = 60_000;
/** A minute far enough ahead that the server's own timer never reaches it while this runs. */
const FIRST_MINUTE = Date.UTC(2031, 0, 1);

type Prepared = ServedCms & {
	/** The next minute to tick at, so each tick of `tick.minute` finds the every-minute schedules due. */
	minute: number;
};

/** The value at the middle of the sorted values. */
const median = (values: number[]) =>
	values.toSorted((x, y) => x - y)[Math.floor((values.length - 1) / 2)] ?? 0;

const tick = (server: ServedCms, at: number) =>
	server.admin.request({
		method: "POST",
		path: HARNESS_JOB_ROUTES.tick,
		body: { scheduledAt: new Date(at).toISOString() },
	});

/** Waits until no job is queued or running, so the next tick's schedules don't skip an active run. */
const waitForIdle = async (server: ServedCms) => {
	for (let attempt = 0; attempt < 200; attempt++) {
		const active = await server.admin.request<{ data: Job[] }>({
			path: "/api/v1/jobs",
			query: { "filter[status:in]": ["queued", "running"], perPage: 1 },
		});
		if (active.body.data.length === 0) {
			return;
		}
		await new Promise((resolve) => setTimeout(resolve, 50));
	}
	throw new Error("Jobs were still running after 10 seconds.");
};

/**
 * Benchmarks due and idle scheduler ticks and job enqueueing on the built server. Inline queues
 * include execution queries in request counts.
 */
benchmark<Prepared>({
	id: "jobs",
	warmups: 0,
	prepare: async (context) => {
		const database = await context.database();
		await runMeasured({
			command: "lucidcms",
			args: ["migrate", "--yes"],
			cwd: context.setup.directory,
			env: { ...context.env, HARNESS_DATABASE_URL: database.url },
			log: path.join(context.work, "jobs-migrate.log"),
		});
		const server = await context.serve(database);
		const prepared: Prepared = {
			...server,
			minute: FIRST_MINUTE,
			stop: async () => {
				await server.stop();
				await database.destroy();
			},
		};
		//* the first ticks load code the timed ones would otherwise wait for
		for (let warmup = 0; warmup < 3; warmup++) {
			await tick(server, prepared.minute);
			prepared.minute += MINUTE_MS;
			await waitForIdle(server);
		}
		return prepared;
	},
	cleanup: (prepared) => prepared.stop(),
	sample: async (_context, prepared) => {
		const durations: number[] = [];
		const queries: number[] = [];
		for (let request = 0; request < REQUESTS; request++) {
			const startedAt = performance.now();
			const response = await tick(prepared, prepared.minute);
			durations.push(performance.now() - startedAt);
			if (response.status !== 200) {
				throw new Error(`A scheduler tick gave ${response.status}.`);
			}
			queries.push(countQueries(response));
			prepared.minute += MINUTE_MS;
			await waitForIdle(prepared);
		}
		const lastMinute = prepared.minute - MINUTE_MS;

		const metrics: Record<string, Metric> = {
			"tick.minute": {
				label: "A scheduler tick with the every-minute schedules due",
				unit: "ms",
				value: Number(median(durations).toFixed(2)),
			},
			"tick.minute.queries": {
				label:
					"A scheduler tick with the every-minute schedules due (database queries)",
				unit: "count",
				value: median(queries),
			},
			...(await measureRequests({
				key: "tick.idle",
				label: "A scheduler tick with nothing due",
				status: 200,
				requests: REQUESTS,
				send: () => tick(prepared, lastMinute + 30_000),
			})),
			...(await measureRequests({
				key: "enqueue",
				label: "Enqueueing a job",
				status: 200,
				requests: REQUESTS,
				send: (request) =>
					prepared.admin.request({
						method: "POST",
						path: HARNESS_JOB_ROUTES.enqueue,
						body: { tag: `bench-${request}`, steps: ["succeed"] },
					}),
			})),
		};
		await waitForIdle(prepared);
		return metrics;
	},
});
