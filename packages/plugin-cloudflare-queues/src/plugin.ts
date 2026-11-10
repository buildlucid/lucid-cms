import type { CloudflareWorkerHandlerArtifact } from "@lucidcms/cloudflare/types";
import { definePlugin, LucidError } from "@lucidcms/core";
import type { LucidPluginDefinition } from "@lucidcms/core/types";
import cloudflareQueuesAdapter from "./adapter.js";
import {
	PACKAGE_INFO,
	PLUGIN_KEY,
	SUPPORTED_RUNTIME_ADAPTER_KEY,
} from "./constants.js";
import type { PluginOptions } from "./types.js";
import { createBindingsArtifact } from "./utils/bindings-artifact.js";

const validateOptions = (options: PluginOptions) => {
	for (const [name, value] of [
		["binding", options.binding],
		["queueName", options.queueName],
	] as const) {
		if (value !== undefined && value.trim().length === 0) {
			throw new TypeError(`${name} cannot be empty.`);
		}
	}
};

/** Configures Lucid to publish and consume jobs with Cloudflare Queues. */
const plugin = (pluginOptions?: PluginOptions): LucidPluginDefinition => {
	const resolvedOptions = pluginOptions ?? {};
	validateOptions(resolvedOptions);

	return definePlugin({
		key: PLUGIN_KEY,
		package: PACKAGE_INFO,
		hooks: {
			runtime: async ({ phase }) => {
				if (phase === "prepare") {
					return {
						artifacts: [createBindingsArtifact(resolvedOptions)],
					};
				}

				return {
					artifacts: [
						{
							type: "cloudflare:worker-handler",
							custom: {
								event: "queue",
								module: "@lucidcms/cloudflare-queues/worker",
							},
						} satisfies CloudflareWorkerHandlerArtifact,
					],
				};
			},
		},
		checkCompatibility: ({ runtimeContext }) => {
			if (runtimeContext.runtime !== SUPPORTED_RUNTIME_ADAPTER_KEY) {
				throw new LucidError({
					message:
						"Cloudflare queues adapter is only supported on the Cloudflare Worker runtime adapter",
				});
			}
		},
		sources: {
			translations: ["@lucidcms/cloudflare-queues/translations"],
		},
		defaults: { queue: { adapter: cloudflareQueuesAdapter(resolvedOptions) } },
	});
};

export default plugin;
