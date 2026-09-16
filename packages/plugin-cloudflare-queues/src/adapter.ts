import { copy, logger } from "@lucidcms/core";
import { consumeJob, logScopes } from "@lucidcms/core/extension";
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

const cloudflareQueuesAdapter = (
	options: PluginOptions,
): QueueAdapterInstance => {
	let consumerSupported = false;

	return {
		type: "queue-adapter",
		key: ADAPTER_KEY,
		get support(): QueueAdapterInstance["support"] {
			return consumerSupported
				? { delayedDelivery: true, maxDelayMs: MAX_DELAY_MS }
				: { delayedDelivery: false };
		},
		lifecycle: {
			init: async (params) => {
				consumerSupported = params.runtimeContext?.compiled ?? false;

				logger.debug({
					message: `Cloudflare queue adapter initialised in ${consumerSupported ? "production" : "development"} mode`,
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
			if (!consumerSupported) {
				for (const message of messages) {
					const result = await consumeJob(context, {
						jobId: message.jobId,
						retry: "immediate",
					});
					if (result.type === "retry-transport") {
						return {
							error: {
								message: copy(
									"server:plugin.cloudflare.queues.jobs.consume.development.failed",
								),
							},
							data: undefined,
						};
					}
				}
				return { error: undefined, data: undefined };
			}

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
