import type { MediaAdapter } from "@lucidcms/core/types";
import getAwsClient from "./clients/aws-client.js";
import deleteMultiple from "./services/delete-multiple.js";
import deletSingle from "./services/delete-single.js";
import getMetadata from "./services/get-metadata.js";
import getPresignedUrl from "./services/get-presigned-url.js";
import stream from "./services/steam.js";
import uploadSingle from "./services/upload-single.js";
import rename from "./services/rename.js";
import type { PluginOptions } from "./types/types.js";

const s3MediaAdapter: MediaAdapter<PluginOptions> = (options) => {
	const client = getAwsClient(options);

	return {
		type: "media-adapter",
		key: "s3",
		services: {
			getPresignedUrl: getPresignedUrl(client, options),
			getMeta: getMetadata(client, options),
			stream: stream(client, options),
			upload: uploadSingle(client, options),
			delete: deletSingle(client, options),
			deleteMultiple: deleteMultiple(client, options),
			rename: rename(client, options),
		},
		getOptions: () => options,
	};
};

export default s3MediaAdapter;
