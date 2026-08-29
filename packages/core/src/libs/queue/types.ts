import type z from "zod";
import type { ZodType } from "zod";
import type { LucidErrorData } from "../../types/errors.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../utils/services/types.js";
import type { AdapterLifecycleContext } from "../runtime/types.js";
import type { jobDispatchStatusSchema, jobStatusSchema } from "./schema.js";

/** A value that can be stored in a durable job payload. */
export type JobValue =
	| string
	| number
	| boolean
	| null
	| readonly JobValue[]
	| { readonly [key: string]: JobValue };

/** A JSON object stored as a durable job's input or display data. */
export type JobPayload = { readonly [key: string]: JobValue };

/** The persisted lifecycle state of a job. */
export type JobStatus = z.infer<typeof jobStatusSchema>;

/** Whether a queued job still needs to be sent to its adapter. */
export type JobDispatchStatus = z.infer<typeof jobDispatchStatusSchema>;

/** Controls how Lucid retries a job after its handler fails. */
export type JobRetryPolicy =
	| { readonly type: "none" }
	| {
			readonly type: "exponential";
			/** Total attempts, including the first execution. */
			readonly maxAttempts: number;
			/** Delay before the first retry. */
			readonly baseDelayMs: number;
			/** Maximum delay between attempts. */
			readonly maxDelayMs: number;
			/** Whether retry delays are randomised to spread concurrent work. */
			readonly jitter: "none" | "full";
	  };

/** Metadata supplied to each job handler execution. */
export type JobExecution = {
	/** Stable identifier that handlers can use as an idempotency key. */
	readonly jobId: string;
	/** Current attempt, starting at one. */
	readonly attempt: number;
	/** Maximum attempts allowed for this job. */
	readonly maxAttempts: number;
	/** Aborted when cancellation is requested or ownership of the lease is lost. */
	readonly signal: AbortSignal;
};

/** Job handlers may run again after a crash and must make side effects idempotent. */
export type JobHandler<Input extends JobPayload> = (
	context: ServiceContext,
	input: Input,
	execution: JobExecution,
) => ServiceResponse<undefined>;

/** Details passed to a job's permanent failure hook. */
export type JobPermanentFailure<Input extends JobPayload> = {
	readonly jobId: string;
	readonly input: Input;
	readonly attempts: number;
	readonly errorMessage: string;
};

/** Handles cleanup when a job exhausts its attempts or cannot be decoded. */
export type JobPermanentFailureHandler<Input extends JobPayload> = (
	context: ServiceContext,
	failure: JobPermanentFailure<Input>,
) => Promise<void> | void;

const jobDefinitionInput = Symbol("@lucidcms/core/job-definition-input");
const jobDefinitionRuntime = Symbol("@lucidcms/core/job-definition-runtime");

type JobPayloadParseResult =
	| { success: true; data: JobPayload }
	| { success: false; error: LucidErrorData };

type JobHandlerResult =
	| { type: "success" }
	| { type: "invalid-payload"; error: LucidErrorData }
	| { type: "failed"; error: LucidErrorData };

type JobDescriptionResult =
	| { success: true; data: JobPayload | null }
	| { success: false; error: LucidErrorData };

type JobDefinitionRuntime = {
	parse: (input: unknown) => Promise<JobPayloadParseResult>;
	execute: (
		context: ServiceContext,
		input: unknown,
		execution: JobExecution,
	) => Promise<JobHandlerResult>;
	describe: (input: unknown) => Promise<JobDescriptionResult>;
	onPermanentFailure?: (
		context: ServiceContext,
		failure: Omit<JobPermanentFailure<JobPayload>, "input"> & {
			input: unknown;
		},
	) => Promise<void>;
};

/** An opaque, versioned job definition created by `defineJob`. */
export type JobDefinition<
	Name extends string = string,
	Input extends JobPayload = JobPayload,
> = {
	readonly type: "job-definition";
	readonly name: Name;
	readonly version: number;
	readonly retry: JobRetryPolicy;
	readonly [jobDefinitionInput]: (input: Input) => void;
	readonly [jobDefinitionRuntime]: JobDefinitionRuntime;
};

/** Any job definition accepted by Lucid config. */
export type AnyJobDefinition = JobDefinition<string, never>;

/** Resolves the input type accepted by a job definition. */
export type JobInput<Definition extends AnyJobDefinition> =
	Definition extends JobDefinition<string, infer Input> ? Input : never;

/** Options used to define a versioned job and its handler. */
export type DefineJobOptions<Name extends string, Input extends JobPayload> = {
	/** Stable, namespaced identifier such as `plugin:rebuild-index`. */
	name: Name;
	/** Increment when the stored payload or handler contract changes. */
	version: number;
	/** Validates payloads before they are stored or handled. */
	input: ZodType<Input>;
	retry?: JobRetryPolicy;
	handler: JobHandler<Input>;
	/** Returns JSON-safe metadata shown in the admin UI. */
	describe?: (input: Input) => JobPayload;
	/** Runs after permanent failure; hook errors are logged without changing the job. */
	onPermanentFailure?: JobPermanentFailureHandler<Input>;
};

/** Optional scheduling and audit values used when a job is enqueued. */
export type JobEnqueueOptions = {
	/** Earliest time the job can be handled. */
	runAt?: Date;
	/** User recorded as the creator of the job. */
	createdByUserId?: number;
};

/** Identifies a durable job accepted by the queue. */
export type JobReceipt = {
	readonly jobId: string;
	readonly name: string;
	readonly version: number;
};

/** The outcome of a job cancellation request. */
export type JobCancelResult =
	| { type: "cancelled" }
	| { type: "cancellation-requested" }
	| {
			type: "already-finished";
			status: Exclude<JobStatus, "queued" | "running">;
	  }
	| { type: "conflict"; status: Extract<JobStatus, "queued" | "running"> }
	| { type: "not-found" };

/** Minimal message sent through a queue adapter; job data stays in the database. */
export type QueueDeliveryMessage = {
	readonly version: 1;
	readonly jobId: string;
	readonly availableAt: string;
};

/** Factory used to configure a queue adapter. */
export type QueueAdapter<T = undefined> = T extends undefined
	? () => QueueAdapterInstance | Promise<QueueAdapterInstance>
	: (options: T) => QueueAdapterInstance | Promise<QueueAdapterInstance>;

/** A configured queue adapter used to notify consumers about durable jobs. */
export type QueueAdapterInstance = {
	readonly type: "queue-adapter";
	/** Stable identifier persisted with each queued job. */
	readonly key: string;
	/** Scheduling capabilities enforced before a job is stored. */
	readonly support: {
		/** Whether the adapter can delay a job until its available time. */
		readonly scheduling: boolean;
		/** Longest supported delay, or `null` when there is no limit. */
		readonly maxDelayMs: number | null;
	};
	/** Optional hooks run with the other Lucid adapters. */
	readonly lifecycle?: {
		init?: (context: AdapterLifecycleContext) => Promise<void>;
		destroy?: (context: AdapterLifecycleContext) => Promise<void>;
	};
	/**
	 * Notifies the adapter that durable jobs are ready. The same job may be
	 * published more than once, so transports must support at-least-once delivery.
	 */
	readonly publish: (
		context: ServiceContext,
		messages: readonly QueueDeliveryMessage[],
	) => Promise<void>;
};

const isQueueAdapterLifecycle = (
	value: unknown,
): value is NonNullable<QueueAdapterInstance["lifecycle"]> =>
	typeof value === "object" &&
	value !== null &&
	(!("init" in value) ||
		value.init === undefined ||
		typeof value.init === "function") &&
	(!("destroy" in value) ||
		value.destroy === undefined ||
		typeof value.destroy === "function");

export const isQueueAdapterInstance = (
	value: unknown,
): value is QueueAdapterInstance =>
	typeof value === "object" &&
	value !== null &&
	"type" in value &&
	value.type === "queue-adapter" &&
	"key" in value &&
	typeof value.key === "string" &&
	value.key.trim().length > 0 &&
	"publish" in value &&
	typeof value.publish === "function" &&
	"support" in value &&
	typeof value.support === "object" &&
	value.support !== null &&
	"scheduling" in value.support &&
	typeof value.support.scheduling === "boolean" &&
	"maxDelayMs" in value.support &&
	(value.support.maxDelayMs === null ||
		(typeof value.support.maxDelayMs === "number" &&
			Number.isFinite(value.support.maxDelayMs) &&
			value.support.maxDelayMs >= 0)) &&
	(!("lifecycle" in value) ||
		value.lifecycle === undefined ||
		isQueueAdapterLifecycle(value.lifecycle));

/**
 * Tells a queue transport how to handle a delivery. Only `retry-transport`
 * should be retried; every other result can be acknowledged.
 */
export type JobConsumptionResult =
	| { type: "completed" }
	| { type: "failed" }
	| { type: "retry-scheduled"; availableAt: string }
	| { type: "ignored" }
	| { type: "retry-transport"; delayMs?: number };

export const getJobDefinitionRuntime = (
	definition: AnyJobDefinition,
): JobDefinitionRuntime => definition[jobDefinitionRuntime];

export const isJobDefinition = (value: unknown): value is AnyJobDefinition =>
	typeof value === "object" &&
	value !== null &&
	"type" in value &&
	value.type === "job-definition" &&
	jobDefinitionRuntime in value;

export const createJobDefinition = <
	const Name extends string,
	Input extends JobPayload,
>(
	definition: Omit<
		JobDefinition<Name, Input>,
		typeof jobDefinitionInput | typeof jobDefinitionRuntime
	> & {
		runtime: JobDefinitionRuntime;
	},
): JobDefinition<Name, Input> => ({
	type: "job-definition",
	name: definition.name,
	version: definition.version,
	retry: definition.retry,
	[jobDefinitionInput]: (_input: Input) => undefined,
	[jobDefinitionRuntime]: definition.runtime,
});
