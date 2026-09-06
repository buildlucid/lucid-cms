import type z from "zod";
import type { ZodType } from "zod";
import type { LucidErrorData } from "../../types/errors.js";
import type { ServiceContext, ServiceFn } from "../../utils/services/types.js";
import type {
	jobDispatchStatusSchema,
	jobScheduleMissedSchema,
	jobScheduleOverlapSchema,
	jobStatusSchema,
} from "./payload.js";
import { jobDefinitionInternal } from "./registry.js";

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
			/** Delay before the first retry, in milliseconds. */
			readonly baseDelayMs: number;
			/** Maximum delay between attempts, in milliseconds. */
			readonly maxDelayMs: number;
			/** Whether retry delays are randomized to spread concurrent work. */
			readonly jitter: "none" | "full";
	  };

/** Cron timing that can be shared by multiple scheduled job definitions. */
export type JobScheduleTiming = {
	/** Five-field cron expression with minute precision. */
	readonly cron: string;
	/** IANA timezone used to evaluate the expression. Defaults to UTC. */
	readonly timezone?: string;
};

/** Controls whether two occurrences of the same schedule may run together. */
export type JobScheduleOverlap = z.infer<typeof jobScheduleOverlapSchema>;

/** Controls what happens when the runtime misses one or more occurrences. */
export type JobScheduleMissed = z.infer<typeof jobScheduleMissedSchema>;

/** A resolved schedule attached to a job definition. */
export type JobSchedule = JobScheduleTiming & {
	/** Stable identifier, unique within the job definition. */
	readonly name: string;
	readonly timezone: string;
	/** Static input enqueued for each occurrence. */
	readonly input: JobPayload | null;
	/** The resolved overlap policy. */
	readonly overlap: JobScheduleOverlap;
	/** The resolved missed-occurrence policy. */
	readonly missed: JobScheduleMissed;
};

/** Options for attaching a recurring schedule to a job definition. */
export type DefineJobSchedule<Input extends JobPayload | null> =
	JobScheduleTiming & {
		/** Stable identifier, unique within the job definition. */
		readonly name: string;
		/** Static input enqueued for each occurrence. */
		readonly input: Input;
		/** Whether a new occurrence can run while an earlier one remains active. Defaults to skip. */
		readonly overlap?: JobScheduleOverlap;
		/** How to handle occurrences missed between scheduler ticks. Defaults to run-once. */
		readonly missed?: JobScheduleMissed;
	};

/** Identifies how a durable job was created. */
export type JobTrigger =
	| { readonly type: "enqueue" }
	| {
			readonly type: "schedule";
			readonly scheduleKey: string;
			readonly scheduledFor: string;
	  };

/** Metadata supplied to each job handler execution. */
export type JobExecution = {
	/** Stable identifier that handlers can use as an idempotency key. */
	readonly jobId: string;
	/** Current attempt, starting at one. */
	readonly attempt: number;
	/** Maximum attempts allowed for this job. */
	readonly maxAttempts: number;
	/** What created this durable job. */
	readonly trigger: JobTrigger;
	/** Aborted when cancellation is requested or ownership of the lease is lost. */
	readonly signal: AbortSignal;
};

/** Job handlers may run again after a crash and must make side effects idempotent. */
export type JobHandler<Input extends JobPayload | null = null> = ServiceFn<
	[input: Input, execution: JobExecution],
	undefined
>;

/** Details passed to a job's permanent failure hook. */
export type JobPermanentFailure<Input extends JobPayload | null> = {
	readonly jobId: string;
	readonly input: Input;
	readonly attempts: number;
	readonly errorMessage: string;
};

/** Handles permanent failure when the stored input can still be parsed by the job schema. */
export type JobPermanentFailureHandler<Input extends JobPayload | null> = (
	context: ServiceContext,
	failure: JobPermanentFailure<Input>,
) => Promise<void> | void;

type JobPayloadParseResult =
	| { success: true; data: JobPayload | null }
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
		failure: Omit<JobPermanentFailure<JobPayload | null>, "input"> & {
			input: unknown;
		},
	) => Promise<void>;
};

/** An opaque, versioned job definition created by `defineJob`. */
export type JobDefinition<
	Name extends string = string,
	Input extends JobPayload | null = JobPayload | null,
> = {
	readonly type: "job-definition";
	readonly name: Name;
	readonly version: number;
	readonly retry: JobRetryPolicy;
	readonly schedules: readonly JobSchedule[];
	readonly [jobDefinitionInternal]: {
		readonly input?: Input;
		readonly runtime: JobDefinitionRuntime;
	};
};

/** Any job definition accepted by Lucid config. */
export type AnyJobDefinition = JobDefinition<string, JobPayload | null>;

/** Resolves the input type accepted by a job definition. */
export type JobInput<Definition extends AnyJobDefinition> =
	Definition extends JobDefinition<string, infer Input> ? Input : never;

/** Options used to define a versioned job and its handler. */
export type DefineJobOptions<
	Name extends string,
	Input extends JobPayload | null,
> = {
	/** Stable, namespaced identifier such as `plugin:rebuild-index`. */
	name: Name;
	/** Increment when the stored payload or handler contract changes. */
	version: number;
	/** Validates payloads before they are stored or handled. */
	input: ZodType<Input>;
	/** Defaults to 3 attempts with exponential backoff, a 1-second base, a 5-minute cap and full jitter. */
	retry?: JobRetryPolicy;
	/** Start a transaction when supported. Omit to run without starting one. */
	transaction?: boolean;
	/** Recurring schedules that enqueue this job through the normal durable path. */
	schedules?: readonly DefineJobSchedule<Input>[];
	/** Handles one validated job execution. */
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
	/** Prevents the same logical job from being stored more than once. */
	idempotencyKey?: string;
};

/** Scheduling and audit values used by Lucid when it enqueues a job. */
export type InternalJobEnqueueOptions = JobEnqueueOptions & {
	/** Internal trigger metadata retained with the durable job. */
	trigger?: JobTrigger;
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
