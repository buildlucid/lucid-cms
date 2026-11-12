import {
	copy,
	defineJob,
	definePlugin,
	defineRoute,
	formatAPIResponse,
	LucidError,
	middleware,
	serviceWrapper,
	z,
} from "@lucidcms/core";
import { consumeJob } from "@lucidcms/core/extension";
import { setupJobScheduler } from "@lucidcms/core/runtime";
import { createToolkit } from "@lucidcms/core/toolkit";
import type {
	JobExecution,
	LucidPluginDefinition,
	ServiceContext,
} from "@lucidcms/core/types";

/** The plugin's key, which the harness reads `plugin:harness-jobs` from. */
export const HARNESS_JOBS_PLUGIN = "harness-jobs";

/** What one attempt of a probe job does. */
export const PROBE_STEPS = ["succeed", "fail", "throw", "hang"] as const;

export type ProbeStep = (typeof PROBE_STEPS)[number];

const probeInput = z.object({
	/** Names the job's executions in the ledger, so a test finds its own. */
	tag: z.string().min(1).max(200),
	/** What each attempt does, in order. The last one repeats for any attempt after it. */
	steps: z.array(z.enum(PROBE_STEPS)).min(1).max(10),
	/** How long `hang` waits unless the job's signal aborts it first. */
	hangMs: z.number().int().positive().max(60_000).optional(),
});

export type ProbeInput = z.infer<typeof probeInput>;

/** How long `hang` waits by default, which is past the 20 second lease heartbeat. */
const DEFAULT_HANG_MS = 30_000;

/** One thing a probe job did, as the ledger keeps it. */
export type ProbeEntry = {
	tag: string;
	jobId: string;
	attempt: number;
	step: ProbeStep;
	event:
		| "started"
		| "succeeded"
		| "failed"
		| "threw"
		| "aborted"
		| "finished-hanging"
		| "permanently-failed";
	trigger: JobExecution["trigger"]["type"];
	transaction: boolean;
	/** When the CMS recorded it, from the CMS's own clock. */
	at: string;
};

/** The scheduler finding the `checked` schedule due and asking its check, which never stores a job. */
export type CheckEntry = {
	tag: typeof SCHEDULE_CHECK_TAG;
	event: "checked";
	scheduledFor: string;
	at: string;
};

/** What the ledger keeps. */
export type LedgerEntry = ProbeEntry | CheckEntry;

/** The tag the `checked` schedule's check posts under. */
export const SCHEDULE_CHECK_TAG = "scheduler-check";

/**
 * Probe jobs with fast retries; transactional jobs commit effects with completion. Slow retries
 * require clock advancement for deterministic simulations. Scheduled jobs retry after an hour to
 * keep failed attempts active.
 */
export const PROBE_JOBS = {
	probe: "harness:probe",
	transactional: "harness:probe-transactional",
	slow: "harness:probe-slow",
	slowTransactional: "harness:probe-slow-transactional",
	scheduled: "harness:scheduled-probe",
} as const;

/** How the quick-retry probes retry: three attempts, a quarter of a second apart, then half. */
export const PROBE_RETRY = {
	type: "exponential",
	maxAttempts: 3,
	baseDelayMs: 250,
	maxDelayMs: 1_000,
	jitter: "none",
} as const;

/** How the slow-retry probes retry: three attempts, a minute apart, then two. */
export const SLOW_PROBE_RETRY = {
	...PROBE_RETRY,
	baseDelayMs: 60_000,
	maxDelayMs: 120_000,
} as const;

/** When every probe schedule runs: half past twelve on the first of each month, in UTC. */
export const PROBE_CRON = "30 12 1 * *";

/**
 * The probe schedules, each for one behaviour. Keys are `<job key>/<schedule key>`, as the API
 * names them.
 */
export const PROBE_SCHEDULES = {
	/** Skips an occurrence while an earlier one is active. Its first attempt fails. */
	skip: `${PROBE_JOBS.scheduled}/skip`,
	/** Runs every occurrence, even while an earlier one is active. Its first attempt fails. */
	allow: `${PROBE_JOBS.scheduled}/allow`,
	/** Only runs on its exact minute, never for one it missed. */
	missedSkip: `${PROBE_JOBS.scheduled}/missed-skip`,
	/** Runs once for everything it missed. */
	runOnce: `${PROBE_JOBS.scheduled}/run-once`,
	/** For running early with the API. Its first attempt fails. */
	runNow: `${PROBE_JOBS.scheduled}/run-now`,
	/**
	 * Due every minute. Its check posts to the ledger each time the scheduler asks it and always says
	 * no, so it shows the runtime's timer ticking without storing a job.
	 */
	checked: `${PROBE_JOBS.scheduled}/checked`,
} as const;

/** The routes the plugin adds. Only harness setups have them. */
export const HARNESS_JOB_ROUTES = {
	enqueue: "/api/v1/harness/jobs",
	cancel: "/api/v1/harness/jobs/cancel",
	deliver: "/api/v1/harness/jobs/deliver",
	tick: "/api/v1/harness/scheduler/tick",
} as const;

/** Waits for `ms`, or until `signal` aborts. Returns whether it was aborted. */
const hang = (signal: AbortSignal, ms: number) =>
	new Promise<boolean>((resolve) => {
		if (signal.aborted) {
			resolve(true);
			return;
		}
		const timeout = setTimeout(() => {
			signal.removeEventListener("abort", abort);
			resolve(false);
		}, ms);
		const abort = () => {
			clearTimeout(timeout);
			resolve(true);
		};
		signal.addEventListener("abort", abort, { once: true });
	});

/**
 * Adds this attempt to the `effects` the job keeps in its display data. A transactional job's write
 * only stays if the attempt completes, so it shows which attempts committed.
 */
const recordEffect = async (
	context: ServiceContext,
	execution: JobExecution,
) => {
	const row = await context.db.kysely
		.selectFrom("lucid_jobs")
		.select("display_data")
		.where("job_id", "=", execution.jobId)
		.executeTakeFirst();
	const data = row?.display_data ?? {};
	const effects = Array.isArray(data.effects) ? data.effects : [];

	await context.db.kysely
		.updateTable("lucid_jobs")
		.set({
			display_data: { ...data, effects: [...effects, execution.attempt] },
		})
		.where("job_id", "=", execution.jobId)
		.execute();
};

/**
 * Probe jobs, schedules and routes for job tests, which every setup registers unless it goes
 * without `jobs`. Each attempt does what the job's `steps` say (succeed, fail, throw or hang) and
 * posts what happened to the harness's ledger at `ledger`, which `executions()` in
 * `shared/helpers/jobs.ts` reads, so tests see executions on every runtime. The `checked` schedule
 * posts each time the scheduler asks its `when` check.
 */
export const harnessJobs = (
	ledger: string | undefined,
): LucidPluginDefinition => {
	const post = async (
		entry: Omit<ProbeEntry, "at"> | Omit<CheckEntry, "at">,
	) => {
		if (!ledger) {
			return;
		}
		await fetch(ledger, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ ...entry, at: new Date().toISOString() }),
		});
	};

	const createProbe = <const Key extends string>(
		key: Key,
		options: {
			transaction: boolean;
			retry: Parameters<typeof defineJob>[0]["retry"];
			schedules?: Parameters<typeof defineJob<Key, ProbeInput>>[0]["schedules"];
		},
	) =>
		defineJob({
			key,
			version: 1,
			input: probeInput,
			transaction: options.transaction,
			retry: options.retry,
			schedules: options.schedules,
			describe: ({ input }) => ({ tag: input.tag }),
			handler: async ({ context, input, execution }) => {
				const step =
					input.steps[Math.min(execution.attempt, input.steps.length) - 1] ??
					"succeed";
				const entry = {
					tag: input.tag,
					jobId: execution.jobId,
					attempt: execution.attempt,
					step,
					trigger: execution.trigger.type,
					transaction: options.transaction,
				};
				await post({ ...entry, event: "started" });
				await recordEffect(context, execution);

				switch (step) {
					case "succeed": {
						await post({ ...entry, event: "succeeded" });
						return;
					}
					case "fail": {
						await post({ ...entry, event: "failed" });
						throw new LucidError({
							message: copy.literal(
								`Probe ${input.tag} failed on attempt ${execution.attempt}.`,
							),
						});
					}
					case "throw": {
						await post({ ...entry, event: "threw" });
						throw new Error(
							`Probe ${input.tag} threw on attempt ${execution.attempt}.`,
						);
					}
					case "hang": {
						const aborted = await hang(
							execution.signal,
							input.hangMs ?? DEFAULT_HANG_MS,
						);
						await post({
							...entry,
							event: aborted ? "aborted" : "finished-hanging",
						});
						return;
					}
				}
			},
			onPermanentFailure: async ({ failure }) => {
				await post({
					tag: failure.input.tag,
					jobId: failure.jobId,
					attempt: failure.attempts,
					step: "fail",
					event: "permanently-failed",
					trigger: "enqueue",
					transaction: options.transaction,
				});
			},
		});

	//* picked by the enqueue route's `transaction` and `slowRetry`
	const probes = {
		quick: {
			plain: createProbe(PROBE_JOBS.probe, {
				transaction: false,
				retry: PROBE_RETRY,
			}),
			transactional: createProbe(PROBE_JOBS.transactional, {
				transaction: true,
				retry: PROBE_RETRY,
			}),
		},
		slow: {
			plain: createProbe(PROBE_JOBS.slow, {
				transaction: false,
				retry: SLOW_PROBE_RETRY,
			}),
			transactional: createProbe(PROBE_JOBS.slowTransactional, {
				transaction: true,
				retry: SLOW_PROBE_RETRY,
			}),
		},
	};
	const failsFirst = {
		tag: "scheduled",
		steps: ["fail", "succeed"],
	} satisfies ProbeInput;
	const succeeds = {
		tag: "scheduled",
		steps: ["succeed"],
	} satisfies ProbeInput;
	const scheduled = createProbe(PROBE_JOBS.scheduled, {
		transaction: false,
		retry: {
			type: "exponential",
			maxAttempts: 2,
			baseDelayMs: 3_600_000,
			maxDelayMs: 3_600_000,
			jitter: "none",
		},
		schedules: [
			{ key: "skip", cron: PROBE_CRON, input: { ...failsFirst, tag: "skip" } },
			{
				key: "allow",
				cron: PROBE_CRON,
				overlap: "allow",
				input: { ...failsFirst, tag: "allow" },
			},
			{
				key: "missed-skip",
				cron: PROBE_CRON,
				missed: "skip",
				input: { ...succeeds, tag: "missed-skip" },
			},
			{
				key: "run-once",
				cron: PROBE_CRON,
				input: { ...succeeds, tag: "run-once" },
			},
			{
				key: "run-now",
				cron: PROBE_CRON,
				input: { ...failsFirst, tag: "run-now" },
			},
			{
				key: "checked",
				cron: "* * * * *",
				input: { ...succeeds, tag: "checked" },
				when: async ({ scheduledFor }) => {
					await post({
						tag: SCHEDULE_CHECK_TAG,
						event: "checked",
						scheduledFor,
					});
					return false;
				},
			},
		],
	});

	//* only super admins and people who can run jobs may use them, like the job schedule routes
	const guarded = [
		middleware.validateCSRF(),
		middleware.authenticate(),
		middleware.permissions(["jobs:run"]),
	];
	const openAPI = (summary: string) => ({
		description: `Harness only. ${summary}`,
		tags: ["harness"],
		summary,
	});

	const routes = [
		defineRoute({
			method: "post",
			path: HARNESS_JOB_ROUTES.enqueue,
			schema: {
				body: probeInput.extend({
					transaction: z.boolean().optional(),
					/** Uses a probe that retries a minute later instead of a quarter of a second. */
					slowRetry: z.boolean().optional(),
					runAt: z.iso.datetime().optional(),
					idempotencyKey: z.string().optional(),
					/** Enqueues inside a transaction that then rolls back. */
					rollback: z.boolean().optional(),
				}),
				query: undefined,
				params: undefined,
				response: undefined,
			},
			middleware: guarded,
			openAPI: openAPI("Enqueue a probe job"),
			handler: async ({ hono, context, input }) => {
				const {
					transaction,
					slowRetry,
					runAt,
					idempotencyKey,
					rollback,
					...payload
				} = input.body;
				const job =
					probes[slowRetry ? "slow" : "quick"][
						transaction ? "transactional" : "plain"
					];
				const jobIds: string[] = [];

				const enqueued = await serviceWrapper(
					async (context: ServiceContext) => {
						const receipt = await createToolkit(context).jobs.enqueueJob({
							job,
							payload,
							options: {
								runAt: runAt ? new Date(runAt) : undefined,
								idempotencyKey,
								createdByUserId: hono.get("auth").id,
							},
						});
						if (receipt.error) {
							return receipt;
						}
						jobIds.push(receipt.data.jobId);
						if (rollback) {
							return {
								error: { message: copy.literal("Rolled back on purpose.") },
								data: undefined,
							};
						}
						return receipt;
					},
					{ transaction: rollback === true },
				)(context);
				if (enqueued.error && !rollback) {
					throw new LucidError({ ...enqueued.error, status: 400 });
				}

				return hono.json(
					formatAPIResponse(hono, {
						data: { jobId: jobIds[0] ?? null, rolledBack: rollback === true },
					}),
				);
			},
		}),
		defineRoute({
			method: "post",
			path: HARNESS_JOB_ROUTES.cancel,
			schema: {
				body: z.object({ jobId: z.string() }),
				query: undefined,
				params: undefined,
				response: undefined,
			},
			middleware: guarded,
			openAPI: openAPI("Cancel a job"),
			handler: async ({ hono, toolkit, input }) => {
				const result = await toolkit.jobs.cancelJob({ id: input.body.jobId });
				if (result.error) {
					throw new LucidError(result.error);
				}
				return hono.json(formatAPIResponse(hono, { data: result.data }));
			},
		}),
		defineRoute({
			method: "post",
			path: HARNESS_JOB_ROUTES.deliver,
			schema: {
				body: z.object({
					jobId: z.string(),
					/** How many deliveries arrive at once, as a queue that delivers twice would. */
					times: z.number().int().min(1).max(20).optional(),
				}),
				query: undefined,
				params: undefined,
				response: undefined,
			},
			middleware: guarded,
			openAPI: openAPI(
				"Deliver a job's queue message, as a queue consumer would",
			),
			handler: async ({ hono, context, input }) => {
				const results = await Promise.all(
					Array.from({ length: input.body.times ?? 1 }, () =>
						consumeJob(context, { jobId: input.body.jobId }),
					),
				);
				return hono.json(formatAPIResponse(hono, { data: results }));
			},
		}),
		defineRoute({
			method: "post",
			path: HARNESS_JOB_ROUTES.tick,
			schema: {
				body: z.object({ scheduledAt: z.iso.datetime().optional() }),
				query: undefined,
				params: undefined,
				response: undefined,
			},
			middleware: guarded,
			openAPI: openAPI(
				"Run one job scheduler tick, as the runtime's timer does",
			),
			handler: async ({ hono, context, input }) => {
				const result = await setupJobScheduler().run(context, {
					scheduledAt: input.body.scheduledAt
						? new Date(input.body.scheduledAt)
						: undefined,
				});
				if (result.error) {
					throw new LucidError(result.error);
				}
				return hono.json(formatAPIResponse(hono, { data: null }));
			},
		}),
	];

	return definePlugin({
		key: HARNESS_JOBS_PLUGIN,
		configure: (draft) => {
			draft.jobs.push(
				...Object.values(probes).flatMap((pair) => Object.values(pair)),
				scheduled,
			);
			draft.http.routes.push(...routes);
		},
	});
};
