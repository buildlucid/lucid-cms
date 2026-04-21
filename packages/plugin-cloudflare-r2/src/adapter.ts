import type { MediaAdapter } from "@lucidcms/core/types";
import { AwsClient } from "aws4fetch";
import { ADAPTER_KEY } from "./constants.js";
import deleteMultiple from "./services/delete-multiple.js";
import deleteSingle from "./services/delete-single.js";
import getDownloadUrl from "./services/get-download-url.js";
import getMetadata from "./services/get-metadata.js";
import getPresignedUrl from "./services/get-presigned-url.js";
import rename from "./services/rename.js";
import stream from "./services/stream.js";
import uploadSingle from "./services/upload-single.js";
import type { PluginOptions } from "./types.js";

/**
 * Adapts the R2 binding to Lucid's media adapter contract and wires in the
 * optional HTTP fallback for URL generation when direct browser transfers are needed.
 */
const cloudflareR2Adapter: MediaAdapter<PluginOptions> = (options) => {
	const httpClient = options.http
		? new AwsClient(options.http.clientOptions)
		: null;

	return {
		type: "media-adapter",
		key: ADAPTER_KEY,
		getPresignedUrl: getPresignedUrl(httpClient, options),
		getDownloadUrl: getDownloadUrl(httpClient, options),
		getMeta: getMetadata(options),
		stream: stream(options),
		upload: uploadSingle(options),
		delete: deleteSingle(options),
		deleteMultiple: deleteMultiple(options),
		rename: rename(options),
		getOptions: () => options,
	};
};

export default cloudflareR2Adapter;
