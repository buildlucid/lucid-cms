import type {
	AdapterRuntimeContext,
	Config,
	EnvironmentVariables,
} from "../../types.js";
import type {
	ServiceContext,
	ServiceFn,
	ServiceResponse,
} from "../../utils/services/types.js";

export type QueueEvent<T extends string = string> =
	| "email:send"
	| "media:delete"
	| "media:delete-unsynced"
	| "media:update-storage"
	| "collections:delete"
	| "locales:delete"
	| "user-tokens:delete"
	| "users:delete"
	| "documents:delete"
	| T;

export type QueueJobStatus = "pending" | "processing" | "completed" | "failed";

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

export type QueueAdapter<T = undefined> = T extends undefined
	? () => QueueAdapterInstance | Promise<QueueAdapterInstance>
	: (options: T) => QueueAdapterInstance | Promise<QueueAdapterInstance>;

export type QueueAdapterInstance = {
	/** The adapter type */
	type: "queue-adapter";
	/** A unique identifier key for the adapter of this type */
	key: "worker" | "passthrough" | string;
	/**  Lifecycle methods */
	lifecycle?: {
		/** Initialize the adapter */
		init?: (params: {
			config: Config;
			runtimeContext: AdapterRuntimeContext;
			env: EnvironmentVariables | undefined;
		}) => Promise<void>;
		/** Destroy the adapter */
		destroy?: () => Promise<void>;
	};
	/** The queue commands */
	command: {
		/** Push a job to the queue */
		add: (
			event: QueueEvent,
			params: {
				payload: Record<string, unknown>;
				options?: QueueJobOptions;
				serviceContext: ServiceContext;
			},
		) => ServiceResponse<QueueJobResponse>;
		/** Push multiple jobs of the same type to the queue */
		addBatch: (
			event: QueueEvent,
			params: {
				payloads: Record<string, unknown>[];
				options?: QueueJobOptions;
				serviceContext: ServiceContext;
			},
		) => ServiceResponse<QueueBatchJobResponse>;
	};
};
