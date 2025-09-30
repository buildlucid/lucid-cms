import type { KyselyDB } from "../../types.js";
import type {
	ServiceContext,
	ServiceFn,
	ServiceResponse,
} from "../../utils/services/types.js";
import type createQueueContext from "./create-context.js";

export type QueueEvent<T extends string = string> =
	| "email:send"
	| "media:delete"
	| T;

export type QueueJobStatus = "pending" | "processing" | "completed" | "failed";

export type QueueContext = ReturnType<typeof createQueueContext>;

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export type QueueJobHandlerFn<D = any, R = any> = ServiceFn<[D], R>;

export type QueueJobHandlers = Record<QueueEvent, QueueJobHandlerFn>;

export type QueueJobResponse = {
	jobId: string;
	event: QueueEvent;
	status: QueueJobStatus;
};

export type QueueBatchJobResponse = {
	jobIds: string[];
	event: QueueEvent;
	status: QueueJobStatus;
	count: number;
};

export type QueueJobOptions = {
	priority?: number;
	maxAttempts?: number;
	scheduledFor?: Date;
	createdByUserId?: number;
};

export type QueueAdapter<AdapterConfig = unknown> = (
	context: QueueContext,
	adapter?: AdapterConfig,
) => {
	key: string;
	/**
	 * Lifecycle methods
	 * */
	lifecycle: {
		/**
		 * Start the queue process
		 * */
		start: () => Promise<void>;
		/**
		 * Kill the queue process
		 * */
		kill: () => Promise<void>;
	};
	/**
	 * Push a job to the queue
	 * @todo add additonal options to configure specifics on the job entry, ie:
	 *       priority, maxAttempts, scheduledFor, createdByUserId, etc.
	 * */

	add: (
		event: QueueEvent,
		params: {
			payload: Record<string, unknown>;
			options?: QueueJobOptions;
			serviceContext: ServiceContext;
		},
	) => ServiceResponse<QueueJobResponse>;
	/**
	 * Push multiple jobs of the same type to the queue
	 * */
	addBatch: (
		event: QueueEvent,
		params: {
			payloads: Record<string, unknown>[];
			options?: QueueJobOptions;
			serviceContext: ServiceContext;
		},
	) => ServiceResponse<QueueBatchJobResponse>;
};
export type QueueAdapterInstance = ReturnType<QueueAdapter>;
