import { LucidError } from "@lucidcms/core";
import type { LucidPluginResponse } from "@lucidcms/core/types";
import cloudflareR2Adapter from "./adapter.js";
import {
	DEFAULT_MAX_UPLOAD_SIZE,
	LUCID_VERSION,
	PLUGIN_KEY,
	SUPPORTED_RUNTIME_ADAPTER_KEY,
} from "./constants.js";
import routes from "./routes/index.js";
import type { PluginOptions } from "./types.js";

const plugin = (pluginOptions?: PluginOptions): LucidPluginResponse => {
	return {
		key: PLUGIN_KEY,
		lucid: LUCID_VERSION,
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

			if (config.media.limits.fileSize > DEFAULT_MAX_UPLOAD_SIZE) {
				throw new LucidError({
					message: `Cloudflare R2 binding uploads proxy files through the Worker. Reduce config.media.limits.fileSize to ${DEFAULT_MAX_UPLOAD_SIZE} bytes or configure the plugin's optional http fallback.`,
				});
			}
		},
		recipe: (draft) => {
			draft.i18n.sources.push("@lucidcms/plugin-cloudflare-r2/translations");

			if (!pluginOptions?.http) {
				draft.hono?.routes?.push(routes(pluginOptions ?? {}));
			}

			draft.media.adapter = cloudflareR2Adapter(pluginOptions ?? {});
		},
	};
};

export default plugin;
