import { copy, resolveMediaKeyTenant } from "@lucidcms/core/plugin";
import type { MediaAdapterStreamBody, ServiceFn } from "@lucidcms/core/types";
import { FILE_SYSTEM_DOWNLOAD_PATH } from "../constants.js";
import {
	checkFileSystemMediaAdapter,
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
		body: MediaAdapterStreamBody;
	}
> = async (context, data) => {
	const mediaAdapterRes = await checkFileSystemMediaAdapter(context, {
		name: copy("server:plugin.filesystem.media.routes.download.error.name"),
		message: copy(
			"server:plugin.filesystem.media.routes.download.error.message",
		),
	});
	if (mediaAdapterRes.error) return mediaAdapterRes;

	const adapterOptions = mediaAdapterRes.data.getOptions?.();
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

	const streamRes = await mediaAdapterRes.data.stream(context, {
		key: data.key,
		tenant: resolveMediaKeyTenant(context.config, data.key),
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
