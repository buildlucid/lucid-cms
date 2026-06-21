import { LucidError } from "@lucidcms/core";
import type { LucidPluginResponse } from "@lucidcms/core/types";
import cloudflareKVAdapter from "./adapter.js";
import {
	LUCID_VERSION,
	PLUGIN_KEY,
	SUPPORTED_RUNTIME_ADAPTER_KEY,
} from "./constants.js";
import type { PluginOptions } from "./types.js";

const plugin = (pluginOptions?: PluginOptions): LucidPluginResponse => {
	return {
		key: PLUGIN_KEY,
		lucid: LUCID_VERSION,
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
					adapter: cloudflareKVAdapter(pluginOptions ?? {}),
				};
			} else {
				draft.kv.adapter = cloudflareKVAdapter(pluginOptions ?? {});
			}
		},
	};
};

export default plugin;
