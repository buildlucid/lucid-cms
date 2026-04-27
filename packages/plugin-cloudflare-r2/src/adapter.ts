import type { MediaAdapter } from "@lucidcms/core/types";
import { AwsClient } from "aws4fetch";
import { ADAPTER_KEY } from "./constants.js";
import deleteMultiple from "./services/delete-multiple.js";
import deleteSingle from "./services/delete-single.js";
import getDownloadUrl from "./services/get-download-url.js";
import getMetadata from "./services/get-metadata.js";
import rename from "./services/rename.js";
import stream from "./services/stream.js";
import { abortUploadSession } from "./services/upload-session/abort-upload-session.js";
import { completeUploadSession } from "./services/upload-session/complete-upload-session.js";
import { createUploadSession } from "./services/upload-session/create-upload-session.js";
import { getUploadPartUrls } from "./services/upload-session/get-upload-part-urls.js";
import { listUploadParts } from "./services/upload-session/list-upload-parts.js";

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
		createUploadSession: createUploadSession(httpClient, options),
		getUploadPartUrls: options.http
			? getUploadPartUrls(httpClient, options)
			: undefined,
		listUploadParts: options.http
			? listUploadParts(httpClient, options)
			: undefined,
		completeUploadSession: options.http
			? completeUploadSession(httpClient, options)
			: undefined,
		abortUploadSession: options.http
			? abortUploadSession(httpClient, options)
			: undefined,
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
