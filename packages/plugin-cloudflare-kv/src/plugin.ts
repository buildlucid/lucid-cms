import { LucidError } from "@lucidcms/core";
import type { LucidPluginResponse } from "@lucidcms/core/types";
import cloudflareKVAdapter from "./adapter.js";
import {
	LUCID_VERSION,
	PLUGIN_KEY,
	SUPPORTED_RUNTIME_ADAPTER_KEY,
} from "./constants.js";
import type { PluginOptions } from "./types.js";
import { createWranglerArtifact } from "./utils/wrangler-artifact.js";

const plugin = (pluginOptions?: PluginOptions): LucidPluginResponse => {
	const resolvedOptions = pluginOptions ?? {};

	return {
		key: PLUGIN_KEY,
		lucid: LUCID_VERSION,
		hooks: {
			runtime: async ({ phase }) => ({
				error: undefined,
				data: {
					artifacts:
						phase === "prepare"
							? [createWranglerArtifact(resolvedOptions)]
							: [],
				},
			}),
		},
		checkCompatibility: ({ runtimeContext }) => {
			if (runtimeContext.runtime !== SUPPORTED_RUNTIME_ADAPTER_KEY) {
				throw new LucidError({
					message:
						"Cloudflare KV plugin is only supported on the Cloudflare runtime adapter.",
				});
			}
		},
		recipe: (draft) => {
			if (!draft.kv) {
				draft.kv = {
					adapter: cloudflareKVAdapter(resolvedOptions),
				};
			} else {
				draft.kv.adapter = cloudflareKVAdapter(resolvedOptions);
			}
		},
	};
};

export default plugin;
