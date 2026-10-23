import { copy, logger } from "@lucidcms/core";
import { logScopes } from "@lucidcms/core/extension";
import type { QueueAdapterInstance } from "@lucidcms/core/types";
import {
	ADAPTER_KEY,
	DEFAULT_QUEUE_BINDING,
	MAX_BATCH_SIZE,
	MAX_DELAY_MS,
	PLUGIN_KEY,
} from "./constants.js";
import type { PluginOptions } from "./types.js";
import { getDelaySeconds } from "./utils/get-delay-seconds.js";
import { resolveBinding } from "./utils/resolve-binding.js";

/** Publishes jobs to a Cloudflare Queue consumed by the plugin's Worker handler, using the same workerd queue and consumer path locally and after deployment. */
const cloudflareQueuesAdapter = (
	options: PluginOptions,
): QueueAdapterInstance => {
	return {
		type: "queue-adapter",
		key: ADAPTER_KEY,
		support: { delayedDelivery: true, maxDelayMs: MAX_DELAY_MS },
		lifecycle: {
			init: async () => {
				logger.debug({
					message: "Cloudflare queue adapter initialised",
					owner: PLUGIN_KEY,
					scope: logScopes.queueAdapter,
				});
			},
			destroy: async () => {
				logger.debug({
					message: "Cloudflare queue adapter destroyed",
					owner: PLUGIN_KEY,
					scope: logScopes.queueAdapter,
				});
			},
		},
		publish: async (context, messages) => {
			const binding = resolveBinding(context, options);
			if (!binding) {
				return {
					error: {
						message: copy("server:plugin.cloudflare.queues.binding.invalid", {
							data: {
								binding: options.binding ?? DEFAULT_QUEUE_BINDING,
							},
						}),
					},
					data: undefined,
				};
			}

			try {
				for (let index = 0; index < messages.length; index += MAX_BATCH_SIZE) {
					await binding.sendBatch(
						messages.slice(index, index + MAX_BATCH_SIZE).map((message) => ({
							body: { version: message.version, jobId: message.jobId },
							delaySeconds: getDelaySeconds(new Date(message.availableAt)),
						})),
					);
				}
			} catch (cause) {
				return {
					error: {
						message: copy(
							"server:plugin.cloudflare.queues.jobs.publish.failed",
						),
						cause,
					},
					data: undefined,
				};
			}

			return { error: undefined, data: undefined };
		},
	};
};

export default cloudflareQueuesAdapter;
