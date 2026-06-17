import { resolveMediaKeyTenant } from "@lucidcms/core/plugin";
import type {
	FileSystemMediaAdapterOptions,
	MediaAdapterInstance,
	MediaAdapterStreamBody,
	ServiceFn,
} from "@lucidcms/core/types";
import { FILE_SYSTEM_DOWNLOAD_PATH } from "../constants.js";
import { validatePresignedToken } from "./checks/index.js";

const downloadSingle: ServiceFn<
	[
		{
			adapter: MediaAdapterInstance<FileSystemMediaAdapterOptions>;
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
	const adapterOptions = data.adapter.getOptions?.();
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

	const streamRes = await data.adapter.stream({
		key: data.key,
		context: {
			tenant: resolveMediaKeyTenant(context.config, data.key),
		},
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
