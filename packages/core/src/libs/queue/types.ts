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
	| "alert:execute"
	| "email:send"
	| "media:delete"
	| "media:abort-upload-session"
	| "media:delete-unsynced"
	| "media:update-storage"
	| "collections:delete"
	| "locales:delete"
	| "users:delete"
	| "documents:delete"
	| "document-versions:delete-expired"
	| "document-publish-operation:execute"
	| T;

export type QueueJobStatus =
	| "pending"
	| "processing"
	| "completed"
	| "failed"
	| "cancelled";

// biome-ignore lint/suspicious/noExplicitAny: explanation
export type QueueJobHandlerFn<D = any, R = any> = ServiceFn<[D], R>;

// biome-ignore lint/suspicious/noExplicitAny: explanation
export type QueueJobPermanentFailureHandlerFn<D = any> = (
	context: ServiceContext,
	data: {
		jobId: string;
		event: QueueEvent;
		payload: D;
		errorMessage: string;
	},
) => Promise<void> | void;

// biome-ignore lint/suspicious/noExplicitAny: explanation
export type QueueJobHandler<D = any, R = any> =
	| QueueJobHandlerFn<D, R>
	| {
			handler: QueueJobHandlerFn<D, R>;
			onPermanentFailure?: QueueJobPermanentFailureHandlerFn<D>;
	  };

export type QueueJobHandlers = Record<QueueEvent, QueueJobHandler>;

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
	/** Adapter capability flags */
	support: {
		/** Whether this adapter honours QueueJobOptions.scheduledFor */
		scheduling: boolean;
	};
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
	/** Push a job to the queue */
	add: (
		event: QueueEvent,
		params: {
			payload: Record<string, unknown>;
			options?: QueueJobOptions;
			context: ServiceContext;
		},
	) => ServiceResponse<QueueJobResponse>;
	/** Push multiple jobs of the same type to the queue */
	addBatch: (
		event: QueueEvent,
		params: {
			payloads: Record<string, unknown>[];
			options?: QueueJobOptions;
			context: ServiceContext;
		},
	) => ServiceResponse<QueueBatchJobResponse>;
};
