import type {
	QueueAdapterInstance,
	ResolvedLucidConfig,
} from "@lucidcms/core/types";

/** What core runs jobs with when a config names no queue adapter. */
const INLINE_QUEUE = {
	key: "inline",
	support: { delayedDelivery: false },
} as const satisfies Pick<QueueAdapterInstance, "key" | "support">;

/**
 * The queue adapter a resolved config uses, without starting it. Plugins give an instance; a
 * factory or promise can't be read without running it, so it gives `undefined`.
 */
const getConfiguredQueue = (
	config: Pick<ResolvedLucidConfig, "queue">,
): Pick<QueueAdapterInstance, "key" | "support"> | undefined => {
	const adapter = config.queue.adapter;
	if (!adapter) {
		return INLINE_QUEUE;
	}
	return typeof adapter === "object" && "type" in adapter ? adapter : undefined;
};

export default getConfiguredQueue;
