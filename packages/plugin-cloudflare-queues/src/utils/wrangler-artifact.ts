import type { RuntimeArtifactCustom } from "@lucidcms/core/types";
import type { PluginOptions } from "../types.js";

const WRANGLER_CONFIG_ARTIFACT_TYPE = "cloudflare:wrangler";

type QueueWranglerBindingOptions = {
	binding?: string;
	queueName?: string;
	consumer?: {
		maxBatchSize?: number;
		maxRetries?: number;
		maxConcurrency?: number;
	};
};

type CloudflareWranglerConfigArtifact = {
	bindings: {
		queues: true | string | QueueWranglerBindingOptions;
	};
};

export const createQueueBinding = (
	options: PluginOptions,
): true | string | QueueWranglerBindingOptions => {
	const binding = {
		...(options.binding ? { binding: options.binding } : {}),
		...(options.queueName ? { queueName: options.queueName } : {}),
		...(options.consumer ? { consumer: options.consumer } : {}),
	};

	if (Object.keys(binding).length === 0) {
		return true;
	}
	if (Object.keys(binding).length === 1 && binding.binding) {
		return binding.binding;
	}
	return binding;
};

/** Creates the opaque Wrangler config artifact consumed by Cloudflare runtimes. */
export const createWranglerArtifact = (
	options: PluginOptions,
): RuntimeArtifactCustom<CloudflareWranglerConfigArtifact> => ({
	type: WRANGLER_CONFIG_ARTIFACT_TYPE,
	custom: {
		bindings: {
			queues: createQueueBinding(options),
		},
	},
});
