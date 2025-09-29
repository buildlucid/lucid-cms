import type { ServiceFn, ServiceResponse } from "../../utils/services/types.js";
import type createQueueContext from "./create-context.js";

export type QueueEvent<T extends string = string> =
	| "email:resend"
	| "media:delete"
	| T;

export type QueueJobStatus = "pending" | "processing" | "completed" | "failed";

export type QueueContext = ReturnType<typeof createQueueContext>;

export type QueueEventHandlerFn<D = unknown, R = unknown> = ServiceFn<[D], R>;

export type QueueEventHandlers = Record<QueueEvent, QueueEventHandlerFn>;

export type QueueJobResponse = {
	jobId: string;
	event: QueueEvent;
	status: QueueJobStatus;
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
		data: Record<string, unknown>,
		options?: QueueJobOptions,
	) => ServiceResponse<QueueJobResponse>;
};
export type QueueAdapterInstance = ReturnType<QueueAdapter>;
