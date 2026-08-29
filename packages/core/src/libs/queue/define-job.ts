import { LucidError } from "../../utils/errors/index.js";
import { copy } from "../i18n/index.js";
import { isJobPayload } from "./schema.js";
import {
	createJobDefinition,
	type DefineJobOptions,
	type JobDefinition,
	type JobPayload,
} from "./types.js";

const DEFAULT_RETRY_POLICY = {
	type: "exponential",
	maxAttempts: 3,
	baseDelayMs: 1_000,
	maxDelayMs: 300_000,
	jitter: "full",
} as const;

const validateDefinition = (definition: {
	name: string;
	version: number;
	retry: DefineJobOptions<string, JobPayload>["retry"];
}) => {
	if (!/^[a-z0-9][a-z0-9._-]*:[a-z0-9][a-z0-9._-]*$/.test(definition.name)) {
		throw new LucidError({
			message: `Invalid job name "${definition.name}". Job names must be namespaced, lowercase identifiers such as "plugin:rebuild-index".`,
		});
	}
	if (!Number.isSafeInteger(definition.version) || definition.version < 1) {
		throw new LucidError({
			message: `Invalid version for job "${definition.name}". Job versions must be positive integers.`,
		});
	}
	if (definition.retry?.type !== "exponential") return;
	if (
		!Number.isSafeInteger(definition.retry.maxAttempts) ||
		definition.retry.maxAttempts < 1 ||
		!Number.isSafeInteger(definition.retry.baseDelayMs) ||
		definition.retry.baseDelayMs < 0 ||
		!Number.isSafeInteger(definition.retry.maxDelayMs) ||
		definition.retry.maxDelayMs < definition.retry.baseDelayMs
	) {
		throw new LucidError({
			message: `Invalid retry policy for job "${definition.name}".`,
		});
	}
};

/**
 * Defines a durable, versioned job and its handler. Register the returned
 * definition in `queue.jobs` before passing it to `enqueueJob` or `enqueueJobs`.
 *
 * Lucid validates the input before storing it and again before execution. Job
 * handlers may run more than once after a consumer failure, so external side
 * effects should use `execution.jobId` as an idempotency key. Increment the
 * version when the stored input or handler contract changes.
 *
 * @example
 * const rebuildIndexJob = defineJob({
 * 	name: "search:rebuild-index",
 * 	version: 1,
 * 	input: z.object({ documentId: z.number() }),
 * 	handler: async (context, input, execution) => {
 * 		await rebuildIndex(input.documentId, execution.jobId);
 * 		return { error: undefined, data: undefined };
 * 	},
 * });
 */
const defineJob = <const Name extends string, Input extends JobPayload>(
	options: DefineJobOptions<Name, Input>,
): JobDefinition<Name, Input> => {
	const retry = options.retry ?? DEFAULT_RETRY_POLICY;
	validateDefinition({
		name: options.name,
		version: options.version,
		retry,
	});

	const parse = async (input: unknown) => {
		const result = await options.input.safeParseAsync(input);
		if (!result.success) {
			return {
				success: false as const,
				error: {
					type: "validation" as const,
					message: copy("server:core.queue.jobs.payload.invalid", {
						data: { job: options.name },
					}),
					zod: result.error,
				},
			};
		}
		if (!isJobPayload(result.data)) {
			return {
				success: false as const,
				error: {
					type: "validation" as const,
					message: copy("server:core.queue.jobs.payload.not.json", {
						data: { job: options.name },
					}),
				},
			};
		}

		return { success: true as const, data: result.data };
	};

	return createJobDefinition({
		type: "job-definition",
		name: options.name,
		version: options.version,
		retry,
		runtime: {
			parse,
			execute: async (context, input, execution) => {
				const parsed = await parse(input);
				if (!parsed.success) {
					return { type: "invalid-payload", error: parsed.error };
				}

				const result = await options.handler(context, parsed.data, execution);
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
							message: copy("server:core.queue.jobs.payload.invalid", {
								data: { job: options.name },
							}),
							zod: parsed.error,
						},
					};
				}

				try {
					const description = options.describe(parsed.data);
					if (!isJobPayload(description)) {
						return {
							success: false,
							error: {
								type: "validation",
								message: copy("server:core.queue.jobs.description.not.json", {
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
							message: copy("server:core.queue.jobs.description.failed", {
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
							const parsed = await options.input.safeParseAsync(failure.input);
							if (!parsed.success) return;
							await options.onPermanentFailure?.(context, {
								jobId: failure.jobId,
								input: parsed.data,
								attempts: failure.attempts,
								errorMessage: failure.errorMessage,
							});
						},
					}
				: {}),
		},
	});
};

export default defineJob;
