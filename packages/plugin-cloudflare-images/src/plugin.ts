import { definePlugin, LucidError } from "@lucidcms/core";
import type { LucidPluginDefinition } from "@lucidcms/core/types";
import cloudflareImagesDeliveryAdapter from "./adapter/index.js";
import {
	LUCID_VERSION,
	PLUGIN_KEY,
	SUPPORTED_RUNTIME_ADAPTER_KEY,
} from "./constants.js";
import type { CloudflareImagesPluginOptions } from "./types.js";
import { createWranglerArtifact } from "./utils/wrangler-artifact.js";

/** Provides Cloudflare Images transformations and adds the Images binding to generated Wrangler config. Requires the Cloudflare runtime. */
const plugin = (
	pluginOptions: CloudflareImagesPluginOptions = {},
): LucidPluginDefinition =>
	definePlugin({
		key: PLUGIN_KEY,
		lucid: LUCID_VERSION,
		hooks: {
			runtime: async ({ phase }) => ({
				error: undefined,
				data: {
					artifacts:
						phase === "prepare" ? [createWranglerArtifact(pluginOptions)] : [],
				},
			}),
		},
		checkCompatibility: ({ runtimeContext }) => {
			if (runtimeContext.runtime !== SUPPORTED_RUNTIME_ADAPTER_KEY) {
				throw new LucidError({
					message:
						"Cloudflare Images plugin is only supported on the Cloudflare runtime adapter.",
				});
			}
		},
		sources: {
			translations: ["@lucidcms/plugin-cloudflare-images/translations"],
		},
		defaults: {
			media: { delivery: cloudflareImagesDeliveryAdapter(pluginOptions) },
		},
	});

export default plugin;
