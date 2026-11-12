import { copy } from "@lucidcms/core";
import type {
	QueueAdapterInstance,
	QueueDeliveryMessage,
} from "@lucidcms/core/types";

/**
 * A queue a simulation drives by hand. It holds every message the CMS publishes until an action
 * takes one, to deliver late, twice or not at all. It can hold jobs until later, as push queues
 * such as Cloudflare Queues can, and can refuse the next publishes, as a queue that is down would.
 *
 * @example
 * ```ts
 * simulation("jobs", {
 * 	model: () => ({ queue: createManualQueue() }),
 * 	adapters: (_random, _cms, model) => ({ queue: model.queue.adapter }),
 * 	// ...
 * });
 * ```
 */
const createManualQueue = () => {
	const pending: QueueDeliveryMessage[] = [];
	let refusals = 0;

	const adapter: QueueAdapterInstance = {
		type: "queue-adapter",
		key: "manual",
		support: { delayedDelivery: true, maxDelayMs: null },
		publish: async (_context, messages) => {
			if (refusals > 0) {
				refusals -= 1;
				return {
					error: { message: copy.literal("The manual queue refused it.") },
					data: undefined,
				};
			}
			pending.push(...messages);
			return { error: undefined, data: undefined };
		},
	};

	return {
		adapter,
		/** Messages published and not yet taken, oldest first. */
		pending: pending as readonly QueueDeliveryMessage[],
		/** Takes a message off the queue, to deliver or lose. `pick` wraps round the pending ones. */
		take: (pick: number): QueueDeliveryMessage | undefined =>
			pending.length === 0
				? undefined
				: pending.splice(pick % pending.length, 1)[0],
		/** Puts a message back at the end, as a queue does with one its consumer asked to retry. */
		putBack: (message: QueueDeliveryMessage) => {
			pending.push(message);
		},
		/** Refuses the next `count` publishes. Zero lets them through again. */
		refuse: (count: number) => {
			refusals = count;
		},
	};
};

export type ManualQueue = ReturnType<typeof createManualQueue>;

export default createManualQueue;
