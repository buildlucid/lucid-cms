import type { ServiceFn } from "../../utils/services/types.js";
import type { AdapterLifecycleContext } from "../runtime/types.js";

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
	/** Delayed delivery capabilities enforced before a job is stored. */
	readonly support:
		| { readonly delayedDelivery: false }
		| {
				readonly delayedDelivery: true;
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
	readonly publish: ServiceFn<
		[messages: readonly QueueDeliveryMessage[]],
		undefined
	>;
};
