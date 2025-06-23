import type { LucidPluginOptions } from "@lucidcms/core/types";
import type { PluginOptions } from "./types/types.js";
import stream from "./services/steam.js";
import deletSingle from "./services/delete-single.js";
import deleteMultiple from "./services/delete-multiple.js";
import uploadSingle from "./services/upload-single.js";
import getPresignedUrl from "./services/get-presigned-url.js";
import getMetadata from "./services/get-metadata.js";
import routes from "./routes/index.js";
import { PLUGIN_KEY, LUCID_VERSION } from "./constants.js";

const plugin: LucidPluginOptions<PluginOptions> = async (
	config,
	pluginOptions,
) => {
	config.hono.extensions?.push(routes(pluginOptions));

	config.media = {
		...config.media,
		strategy: {
			getPresignedUrl: getPresignedUrl(pluginOptions),
			getMeta: getMetadata(pluginOptions),
			stream: stream(pluginOptions),
			uploadSingle: uploadSingle(pluginOptions),
			deleteSingle: deletSingle(pluginOptions),
			deleteMultiple: deleteMultiple(pluginOptions),
		},
	};

	return {
		key: PLUGIN_KEY,
		lucid: LUCID_VERSION,
		config: config,
	};
};

export default plugin;
