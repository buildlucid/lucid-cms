import { isJsonObject } from "../../utils/helpers/is-json-object.js";
import serviceWrapper from "../../utils/services/service-wrapper.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { copy } from "../i18n/index.js";
import createToolkit from "../toolkit/create-toolkit.js";
import { jobDefinitionInternal } from "./registry.js";
import type {
	DefineJobOptions,
	JobDefinition,
	JobExecution,
	JobPayload,
	JobSchedule,
} from "./types.js";

const DEFAULT_RETRY_POLICY = {
	type: "exponential",
	maxAttempts: 3,
	baseDelayMs: 1_000,
	maxDelayMs: 300_000,
	jitter: "full",
} as const;

/** Applies schedule defaults without performing config validation. */
const normalizeSchedules = <Input extends JobPayload | null>(
	schedules: DefineJobOptions<string, Input>["schedules"],
): readonly JobSchedule[] =>
	(schedules ?? []).map((schedule) => ({
		name: schedule.name,
		cron: schedule.cron.trim().split(/\s+/).join(" "),
		timezone: (schedule.timezone ?? "UTC").trim(),
		input: schedule.input,
		overlap: schedule.overlap ?? "skip",
		missed: schedule.missed ?? "run-once",
	}));

/**
 * Defines a job that can be enqueued directly or run on a schedule.
 *
 * @example
 * const rebuildIndexJob = defineJob({
 * 	name: "search:rebuild-index",
 * 	version: 1,
 * 	input: z.object({ documentId: z.number() }),
 * 	schedules: [{
 * 		name: "nightly",
 * 		cron: "0 0 * * *",
 * 		timezone: "UTC",
 * 		input: { documentId: 1 },
 * 	}],
 * 	handler: async ({ context, input, execution, toolkit }) => {
 * 		await rebuildIndex(input.documentId, execution.jobId);
 * 		return { error: undefined, data: undefined };
 * 	},
 * });
 */
const defineJob = <const Name extends string, Input extends JobPayload | null>(
	options: DefineJobOptions<Name, Input>,
): JobDefinition<Name, Input> => {
	const retry = options.retry ?? DEFAULT_RETRY_POLICY;
	const schedules = normalizeSchedules(options.schedules);

	const execute: ServiceFn<
		[input: Input, execution: JobExecution],
		undefined
	> = (context, input, execution) =>
		options.handler({
			context,
			input,
			execution,
			toolkit: createToolkit(context),
		});

	const handler = options.transaction
		? serviceWrapper(execute, {
				transaction: options.transaction,
				logError: true,
				defaultError: {
					type: "basic",
					name: copy("server:core.jobs.execution.error.name"),
					message: copy("server:core.jobs.execution.failed"),
				},
			})
		: execute;

	const parse = async (input: unknown) => {
		const result = await options.input.safeParseAsync(input);
		if (!result.success) {
			return {
				success: false as const,
				error: {
					type: "validation" as const,
					message: copy("server:core.jobs.payload.invalid", {
						data: { job: options.name },
					}),
					zod: result.error,
				},
			};
		}
		if (result.data !== null && !isJsonObject(result.data)) {
			return {
				success: false as const,
				error: {
					type: "validation" as const,
					message: copy("server:core.jobs.payload.not.json", {
						data: { job: options.name },
					}),
				},
			};
		}

		return { success: true as const, data: result.data };
	};

	return {
		type: "job-definition",
		name: options.name,
		version: options.version,
		retry,
		schedules,
		[jobDefinitionInternal]: {
			runtime: {
				parse,
				execute: async (context, input, execution) => {
					const parsed = await parse(input);
					if (!parsed.success) {
						return { type: "invalid-payload", error: parsed.error };
					}

					const result = await handler(context, parsed.data, execution);
					if (result.error) return { type: "failed", error: result.error };
					return { type: "success" };
				},
				describe: async (input) => {
					if (!options.describe) return { success: true, data: null };
					const parsed = await options.input.safeParseAsync(input);
					if (!parsed.success) {
						return {
							success: false,
							error: {
								type: "validation",
								message: copy("server:core.jobs.payload.invalid", {
									data: { job: options.name },
								}),
								zod: parsed.error,
							},
						};
					}

					try {
						const description = options.describe({ input: parsed.data });
						if (!isJsonObject(description)) {
							return {
								success: false,
								error: {
									type: "validation",
									message: copy("server:core.jobs.description.not.json", {
										data: { job: options.name },
									}),
								},
							};
						}
						return { success: true, data: description };
					} catch (cause) {
						return {
							success: false,
							error: {
								message: copy("server:core.jobs.description.failed", {
									data: { job: options.name },
								}),
								cause,
							},
						};
					}
				},
				...(options.onPermanentFailure
					? {
							onPermanentFailure: async (context, failure) => {
								const parsed = await options.input.safeParseAsync(
									failure.input,
								);
								if (!parsed.success) return;

								await options.onPermanentFailure?.({
									context,
									failure: {
										jobId: failure.jobId,
										input: parsed.data,
										attempts: failure.attempts,
										errorMessage: failure.errorMessage,
									},
									toolkit: createToolkit(context),
								});
							},
						}
					: {}),
			},
		},
	};
};

export default defineJob;
