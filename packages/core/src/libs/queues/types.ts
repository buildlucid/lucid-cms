import type { ServiceFn } from "../../utils/services/types.js";
import type createQueueContext from "./create-context.js";

export type QueueEvent<T extends string = string> =
	| "email:resend"
	| "media:delete"
	| T;

export type QueueJobStatus = "pending" | "processing" | "completed" | "failed";

export type QueueEventID = string;

export type QueueContext = ReturnType<typeof createQueueContext>;

export type QueueEventHandlerFn<D = unknown, R = unknown> = ServiceFn<[D], R>;

export type QueueEventHandlers = Record<QueueEvent, QueueEventHandlerFn>;

export type QueueAdapter<AdapterConfig = unknown> = (
	context: QueueContext,
	adapterConfig?: AdapterConfig,
) => {
	key: string;
	/**
	 * Start the queue
	 * */
	start: () => Promise<void>;
	/**
	 * Push an event to the queue
	 * */
	add: (event: QueueEvent, data: unknown) => Promise<void>;
};
export type QueueAdapterInstance = ReturnType<QueueAdapter>;
