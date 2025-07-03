import getAwsClient from "./clients/aws-client.js";
import stream from "./services/steam.js";
import deletSingle from "./services/delete-single.js";
import deleteMultiple from "./services/delete-multiple.js";
import uploadSingle from "./services/upload-single.js";
import getPresignedUrl from "./services/get-presigned-url.js";
import getMetadata from "./services/get-metadata.js";
import { PLUGIN_KEY, LUCID_VERSION } from "./constants.js";
import type { LucidPluginOptions } from "@lucidcms/core/types";
import type { PluginOptions } from "./types/types.js";

const plugin: LucidPluginOptions<PluginOptions> = async (
	config,
	pluginOptions,
) => {
	const client = getAwsClient(pluginOptions);

	config.media = {
		...config.media,
		strategy: {
			getPresignedUrl: getPresignedUrl(client, pluginOptions),
			getMeta: getMetadata(client, pluginOptions),
			stream: stream(client, pluginOptions),
			uploadSingle: uploadSingle(client, pluginOptions),
			deleteSingle: deletSingle(client, pluginOptions),
			deleteMultiple: deleteMultiple(client, pluginOptions),
		},
	};

	return {
		key: PLUGIN_KEY,
		lucid: LUCID_VERSION,
		config: config,
	};
};

export default plugin;
