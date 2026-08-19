import { copy } from "@lucidcms/core/plugin";
import type {
	MediaStorageAdapterStreamBody,
	ServiceFn,
} from "@lucidcms/core/types";
import { FILE_SYSTEM_DOWNLOAD_PATH } from "../constants.js";
import {
	checkFileSystemStorageAdapter,
	validatePresignedToken,
} from "./checks/index.js";

const downloadSingle: ServiceFn<
	[
		{
			key: string;
			token: string;
			timestamp: string;
			fileName?: string;
			extension?: string;
		},
	],
	{
		key: string;
		contentLength: number | undefined;
		contentType: string | undefined;
		body: MediaStorageAdapterStreamBody;
	}
> = async (context, data) => {
	const mediaStorageAdapterRes = await checkFileSystemStorageAdapter(context, {
		name: copy("server:plugin.filesystem.media.routes.download.error.name"),
		message: copy(
			"server:plugin.filesystem.media.routes.download.error.message",
		),
	});
	if (mediaStorageAdapterRes.error) return mediaStorageAdapterRes;

	const adapterOptions = mediaStorageAdapterRes.data.getOptions?.();
	const checkPresignedTokenRes = await validatePresignedToken(context, {
		key: data.key,
		token: data.token,
		timestamp: data.timestamp,
		path: FILE_SYSTEM_DOWNLOAD_PATH,
		secretKey: adapterOptions?.secretKey ?? context.config.secrets.cookie,
		query: {
			fileName: data.fileName,
			extension: data.extension,
		},
	});
	if (checkPresignedTokenRes.error) return checkPresignedTokenRes;

	const streamRes = await mediaStorageAdapterRes.data.stream(context, {
		key: data.key,
	});
	if (streamRes.error) return streamRes;

	return {
		error: undefined,
		data: {
			key: data.key,
			contentLength: streamRes.data.contentLength,
			contentType: streamRes.data.contentType,
			body: streamRes.data.body,
		},
	};
};

export default downloadSingle;
