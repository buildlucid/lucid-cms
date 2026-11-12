import type { Job, QueueDeliveryMessage } from "@lucidcms/core/types";
import {
	action,
	advanceClock,
	createManualQueue,
	describe,
	expect,
	fc,
	type ManualQueue,
	requires,
	type SimulationContext,
	simulation,
} from "#harness/simulation";
import {
	PROBE_JOBS,
	type ProbeStep,
	SLOW_PROBE_RETRY,
} from "#shared/config/fragments/jobs";
import {
	cancelJob,
	deliverJob,
	enqueueProbe,
	executions,
	type JobStatus,
	tick,
	uniqueTag,
} from "#shared/helpers/jobs";

const MAX_JOBS = 6;
/** A minute and a second, so every dispatch retry and first job retry is due after it. */
const MINUTE_MS = 61_000;
/**
 * When a delayed job is due. It sits between ticks of `aMinutePasses`, half a minute from the
 * nearest, so whether it is due only depends on how many minutes passed, not how fast the setup is.
 */
const DELAY_MS = 3.5 * 60_000;
const SETTLE_ROUNDS = 10;

type ModelJob = {
	jobId: string;
	tag: string;
	steps: ProbeStep[];
	transaction: boolean;
	/** When it may first run, on the CMS's clock. */
	runAt: number;
	/** The status it finished with, once an invariant saw it finish. */
	finished?: JobStatus;
	/** How many attempts had started when it was cancelled before running again. */
	startedWhenCancelled?: number;
};

type Model = { queue: ManualQueue; jobs: ModelJob[] };

type Context = SimulationContext<Model>;

const FINISHED: readonly JobStatus[] = ["completed", "failed", "cancelled"];

/** The simulation's jobs as the CMS has them, by job ID. */
const readJobs = async ({ admin }: Context) => {
	const response = await admin.request<{ data: Job[] }>({
		path: "/api/v1/jobs",
		//* the job key filter matches by containing, so this finds both slow probes
		query: { "filter[jobKey]": PROBE_JOBS.slow, perPage: 100 },
	});
	expect(response.status).toBe(200);
	return new Map(response.body.data.map((job) => [job.jobId, job]));
};

/** The attempts a job's ledger says started, oldest first. */
const startedAttempts = ({ lucid }: Context, job: ModelJob) =>
	executions(lucid, { tag: job.tag, event: "started" });

/** The step a probe takes on an attempt: the matching one, or the last for any after. */
const stepFor = (job: ModelJob, attempt: number) =>
	job.steps[Math.min(attempt, job.steps.length) - 1];

/**
 * Delivers one message as a push queue would. A delivery the job wasn't ready for goes back on
 * the queue, as the consumer asks; duplicates of a delivery that ran are dropped.
 */
const deliverMessage = async (
	context: Context,
	message: QueueDeliveryMessage,
	times: number,
) => {
	const results = await deliverJob(context.lucid, message.jobId, times);
	const ran = results.some((result) =>
		["completed", "failed", "retry-scheduled"].includes(result.type),
	);
	const early =
		!ran && results.some((result) => result.type === "retry-transport");
	if (early) {
		context.model.queue.putBack(message);
	}
};

const enqueue = action<
	Model,
	{ steps: ProbeStep[]; transaction: boolean; delayed: boolean }
>({
	name: "enqueue",
	input: fc.record({
		steps: fc.array(fc.constantFrom("succeed", "fail", "throw"), {
			minLength: 1,
			maxLength: 3,
		}),
		transaction: fc.boolean(),
		delayed: fc.boolean(),
	}),
	when: (model) => model.jobs.length < MAX_JOBS,
	run: async ({ lucid, model, input }) => {
		const tag = uniqueTag("simulated");
		const runAt = input.delayed ? new Date(Date.now() + DELAY_MS) : undefined;
		const jobId = await enqueueProbe(lucid, {
			tag,
			steps: input.steps,
			transaction: input.transaction,
			slowRetry: true,
			runAt,
			idempotencyKey: tag,
		});
		model.jobs.push({
			jobId,
			tag,
			steps: input.steps,
			transaction: input.transaction,
			runAt: runAt?.getTime() ?? Date.now(),
		});
	},
});

const enqueueAgain = action<Model, number>({
	name: "enqueueAgain",
	input: fc.nat(),
	when: (model) => model.jobs.length > 0,
	run: async ({ lucid, model, input }) => {
		const job = model.jobs[input % model.jobs.length] as ModelJob;
		const jobId = await enqueueProbe(lucid, {
			tag: job.tag,
			steps: job.steps,
			transaction: job.transaction,
			slowRetry: true,
			idempotencyKey: job.tag,
		});
		expect(jobId, "the same idempotency key gave another job").toBe(job.jobId);
	},
});

const deliver = action<Model, { pick: number; times: number }>({
	name: "deliver",
	input: fc.record({ pick: fc.nat(), times: fc.constantFrom(1, 2) }),
	when: (model) => model.queue.pending.length > 0,
	run: async (context) => {
		const message = context.model.queue.take(context.input.pick);
		if (message) {
			await deliverMessage(context, message, context.input.times);
		}
	},
});

/**
 * The queue loses a message it accepted, as Cloudflare Queues does once a message runs out of
 * retries. Only the scheduler can send the job again.
 */
const loseMessage = action<Model, number>({
	name: "loseMessage",
	input: fc.nat(),
	when: (model) => model.queue.pending.length > 0,
	run: async ({ model, input }) => {
		model.queue.take(input);
	},
});

const cancel = action<Model, number>({
	name: "cancel",
	input: fc.nat(),
	when: (model) => model.jobs.length > 0,
	run: async (context) => {
		const { model, lucid, input } = context;
		const job = model.jobs[input % model.jobs.length] as ModelJob;
		const result = await cancelJob(lucid, job.jobId);
		if (result.type === "cancelled") {
			job.startedWhenCancelled = (await startedAttempts(context, job)).length;
		}
	},
});

const refusePublishes = action<Model, number>({
	name: "refusePublishes",
	input: fc.integer({ min: 1, max: 3 }),
	run: async ({ model, input }) => {
		model.queue.refuse(input);
	},
});

/** A minute passes and the scheduler ticks, recovering work and resending refused publishes. */
const aMinutePasses = action<Model>({
	name: "aMinutePasses",
	run: async ({ lucid }) => {
		advanceClock(MINUTE_MS);
		await tick(lucid);
	},
});

const invariants: Record<string, (context: Context) => Promise<void>> = {
	"each attempt starts once, in order, and does what its steps say": async (
		context,
	) => {
		for (const job of context.model.jobs) {
			const started = await startedAttempts(context, job);
			expect(started.map((entry) => entry.attempt)).toEqual(
				started.map((_, index) => index + 1),
			);
			expect(started.length).toBeLessThanOrEqual(SLOW_PROBE_RETRY.maxAttempts);
			for (const entry of started) {
				expect(entry.step).toBe(stepFor(job, entry.attempt));
			}
		}
	},
	"no job starts before its time": async (context) => {
		for (const job of context.model.jobs) {
			const [first] = await startedAttempts(context, job);
			if (first) {
				expect(Date.parse(first.at)).toBeGreaterThanOrEqual(job.runAt);
			}
		}
	},
	"a finished job stays as it finished, and finished as its steps say": async (
		context,
	) => {
		const stored = await readJobs(context);
		for (const job of context.model.jobs) {
			const current = stored.get(job.jobId);
			expect(current, `job ${job.jobId} is missing`).toBeDefined();
			if (!current) {
				continue;
			}
			if (job.finished) {
				expect(current.status).toBe(job.finished);
			} else if (FINISHED.includes(current.status)) {
				job.finished = current.status;
			}
			if (current.status === "completed") {
				expect(stepFor(job, current.attempts)).toBe("succeed");
			}
			if (current.status === "failed") {
				expect(current.attempts).toBe(SLOW_PROBE_RETRY.maxAttempts);
				expect(stepFor(job, current.attempts)).not.toBe("succeed");
			}
		}
	},
	"a job keeps every attempt's writes, or only the completed one's in a transaction":
		async (context) => {
			const stored = await readJobs(context);
			for (const job of context.model.jobs) {
				const current = stored.get(job.jobId);
				const effects = current?.displayData?.effects;
				if (!job.transaction) {
					const started = await startedAttempts(context, job);
					expect(effects ?? []).toEqual(started.map((entry) => entry.attempt));
				} else if (current?.status === "completed") {
					expect(effects).toEqual([current.attempts]);
				} else {
					expect(effects).toBeUndefined();
				}
			}
		},
	"a job cancelled before it ran again never runs again": async (context) => {
		for (const job of context.model.jobs) {
			if (job.startedWhenCancelled === undefined) {
				continue;
			}
			expect(await startedAttempts(context, job)).toHaveLength(
				job.startedWhenCancelled,
			);
		}
	},
};

describe("job lifecycle", () => {
	requires("plugin:harness-jobs");

	simulation("jobs run as their steps say, however the queue delivers them", {
		model: (): Model => ({ queue: createManualQueue(), jobs: [] }),
		adapters: (_random, _cms, model) => ({ queue: model.queue.adapter }),
		//* only the simulation's jobs reach the queue, so every setup sees the same messages
		//* straight into the database, as pausing each one over the API meets its rate limit
		setup: async ({ admin, lucid }) => {
			const schedules = await admin.request<{ data: { key: string }[] }>({
				path: "/api/v1/jobs/schedules",
				query: { perPage: 100 },
			});
			expect(schedules.status).toBe(200);
			await lucid.query((db) =>
				db
					.insertInto("lucid_job_schedule_overrides")
					.values(
						schedules.body.data.map(({ key }) => ({
							schedule_key: key,
							paused_at: new Date().toISOString(),
						})),
					)
					.execute(),
			);
		},
		actions: [
			enqueue,
			enqueueAgain,
			deliver,
			loseMessage,
			cancel,
			refusePublishes,
			aMinutePasses,
		],
		invariants,
		//* once the queue works again and time passes, every job finishes
		settle: async (context) => {
			const { model, lucid } = context;
			model.queue.refuse(0);
			for (let round = 0; round < SETTLE_ROUNDS; round++) {
				advanceClock(5 * MINUTE_MS);
				await tick(lucid);
				//* what these deliveries publish waits for the next round
				for (let count = model.queue.pending.length; count > 0; count--) {
					const message = model.queue.take(0);
					if (message) {
						await deliverMessage(context, message, 1);
					}
				}

				const stored = await readJobs(context);
				const unfinished = model.jobs.filter(
					(job) =>
						!FINISHED.includes(stored.get(job.jobId)?.status ?? "queued"),
				);
				if (unfinished.length === 0 && model.queue.pending.length === 0) {
					return;
				}
			}
			const stored = await readJobs(context);
			throw new Error(
				`Jobs never finished: ${JSON.stringify(
					model.jobs
						.map((job) => stored.get(job.jobId))
						.filter((job) => job && !FINISHED.includes(job.status))
						.map((job) => ({
							status: job?.status,
							attempts: job?.attempts,
							dispatch: job?.dispatchStatus,
						})),
				)}`,
			);
		},
	});
});
