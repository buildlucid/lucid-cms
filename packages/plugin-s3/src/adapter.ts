import type { MediaAdapter } from "@lucidcms/core/types";
import getAwsClient from "./clients/aws-client.js";
import deleteMultiple from "./services/delete-multiple.js";
import deletSingle from "./services/delete-single.js";
import getDownloadUrl from "./services/get-download-url.js";
import getMetadata from "./services/get-metadata.js";
import rename from "./services/rename.js";
import stream from "./services/steam.js";
import { abortUploadSession } from "./services/upload-session/abort-upload-session.js";
import { completeUploadSession } from "./services/upload-session/complete-upload-session.js";
import { createUploadSession } from "./services/upload-session/create-upload-session.js";
import { getUploadPartUrls } from "./services/upload-session/get-upload-part-urls.js";
import { listUploadParts } from "./services/upload-session/list-upload-parts.js";
import uploadSingle from "./services/upload-single.js";
import type { PluginOptions } from "./types/types.js";

const s3MediaAdapter: MediaAdapter<PluginOptions> = (options) => {
	const client = getAwsClient(options);

	return {
		type: "media-adapter",
		key: "s3",
		createUploadSession: createUploadSession(client, options),
		getUploadPartUrls: getUploadPartUrls(client, options),
		listUploadParts: listUploadParts(client, options),
		completeUploadSession: completeUploadSession(client, options),
		abortUploadSession: abortUploadSession(client, options),
		getDownloadUrl: getDownloadUrl(client, options),
		getMeta: getMetadata(client, options),
		stream: stream(client, options),
		upload: uploadSingle(client, options),
		delete: deletSingle(client, options),
		deleteMultiple: deleteMultiple(client, options),
		rename: rename(client, options),
		getOptions: () => options,
	};
};

export default s3MediaAdapter;
