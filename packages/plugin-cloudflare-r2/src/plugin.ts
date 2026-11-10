import { definePlugin, LucidError } from "@lucidcms/core";
import type { LucidPluginDefinition } from "@lucidcms/core/types";
import cloudflareR2StorageAdapter from "./adapter.js";
import {
	DEFAULT_MAX_UPLOAD_SIZE,
	PACKAGE_INFO,
	PLUGIN_KEY,
	SUPPORTED_RUNTIME_ADAPTER_KEY,
} from "./constants.js";
import routes from "./routes/index.js";
import type { PluginOptions } from "./types.js";
import { createBindingsArtifact } from "./utils/bindings-artifact.js";

/** Stores media in Cloudflare R2 and adds the bucket binding to the Worker. */
const plugin = (pluginOptions?: PluginOptions): LucidPluginDefinition => {
	const resolvedOptions = pluginOptions ?? {};

	return definePlugin({
		key: PLUGIN_KEY,
		package: PACKAGE_INFO,
		hooks: {
			runtime: async ({ phase }) => ({
				artifacts:
					phase === "prepare" ? [createBindingsArtifact(resolvedOptions)] : [],
			}),
		},
		checkCompatibility: ({ runtimeContext, config }) => {
			if (runtimeContext.runtime !== SUPPORTED_RUNTIME_ADAPTER_KEY) {
				throw new LucidError({
					message:
						"Cloudflare R2 plugin is only supported on the Cloudflare runtime adapter.",
				});
			}

			if (pluginOptions?.http) {
				return;
			}

			if (config.media.limits.uploadBytes > DEFAULT_MAX_UPLOAD_SIZE) {
				throw new LucidError({
					message: `Cloudflare R2 binding uploads proxy files through the Worker. Reduce config.media.limits.uploadBytes to ${DEFAULT_MAX_UPLOAD_SIZE} bytes or configure the plugin's optional http fallback.`,
				});
			}
		},
		sources: { translations: ["@lucidcms/cloudflare-r2/translations"] },
		defaults: {
			media: { storageAdapter: cloudflareR2StorageAdapter(resolvedOptions) },
		},
		configure: (draft) => {
			if (!resolvedOptions.http) {
				draft.http.routes.push(...routes(resolvedOptions));
			}
		},
	});
};

export default plugin;
