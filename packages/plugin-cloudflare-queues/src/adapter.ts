import { logger } from "@lucidcms/core";
import { consumeJob, logScopes } from "@lucidcms/core/extension";
import type { QueueAdapterInstance } from "@lucidcms/core/types";
import { ADAPTER_KEY, MAX_BATCH_SIZE, MAX_DELAY_MS } from "./constants.js";
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
		support: {
			get scheduling() {
				return consumerSupported;
			},
			maxDelayMs: MAX_DELAY_MS,
		},
		lifecycle: {
			init: async (params) => {
				consumerSupported = params.runtimeContext?.compiled ?? false;

				logger.debug({
					message: `Cloudflare queue adapter initialised in ${consumerSupported ? "production" : "development"} mode`,
					scope: logScopes.queueAdapter,
				});
			},
			destroy: async () => {
				logger.debug({
					message: "Cloudflare queue adapter destroyed",
					scope: logScopes.queueAdapter,
				});
			},
		},
		publish: async (context, messages) => {
			if (!consumerSupported) {
				for (const message of messages) {
					await consumeJob(context, {
						jobId: message.jobId,
						retry: "immediate",
					});
				}
				return;
			}

			const binding = resolveBinding(context, options);

			for (let index = 0; index < messages.length; index += MAX_BATCH_SIZE) {
				await binding.sendBatch(
					messages.slice(index, index + MAX_BATCH_SIZE).map((message) => ({
						body: { version: message.version, jobId: message.jobId },
						delaySeconds: getDelaySeconds(new Date(message.availableAt)),
					})),
				);
			}
		},
	};
};

export default cloudflareQueuesAdapter;
