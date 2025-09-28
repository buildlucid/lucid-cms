import type { Config } from "../../types.js";
import type createQueueContext from "./create-context.js";

export type QueueEvent<T extends string = string> =
	| "email:resend"
	| "media:delete"
	| T;

export type QueueEventStatus =
	| "pending"
	| "processing"
	| "completed"
	| "failed";

export type QueueEventID = string;

export type QueueContext = ReturnType<typeof createQueueContext>;

export type QueueEventHandlerFn = (data: unknown) => Promise<void>;
export type QueueEventHandlers = Record<QueueEvent, QueueEventHandlerFn>;

export type QueueAdapter = (context: QueueContext) => {
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
