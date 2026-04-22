import { FILE_SYSTEM_DOWNLOAD_PATH } from "../../libs/media-adapter/adapters/file-system/helpers.js";
import type {
	FileSystemMediaAdapterOptions,
	MediaAdapterStreamBody,
} from "../../libs/media-adapter/types.js";
import type { ServiceFn } from "../../utils/services/types.js";
import { mediaServices } from "../index.js";
import { validatePresignedToken } from "./checks/index.js";

const downloadSingle: ServiceFn<
	[
		{
			key: string;
			token: string;
			timestamp: string;
			fileName?: string;
			extension?: string;
			mediaAdapterOptions?: FileSystemMediaAdapterOptions;
		},
	],
	{
		key: string;
		contentLength: number | undefined;
		contentType: string | undefined;
		body: MediaAdapterStreamBody;
	}
> = async (context, data) => {
	const checkPresignedTokenRes = await validatePresignedToken(context, {
		key: data.key,
		token: data.token,
		timestamp: data.timestamp,
		path: FILE_SYSTEM_DOWNLOAD_PATH,
		secretKey:
			data.mediaAdapterOptions?.secretKey ?? context.config.secrets.cookie,
		query: {
			fileName: data.fileName,
			extension: data.extension,
		},
	});
	if (checkPresignedTokenRes.error) return checkPresignedTokenRes;

	const mediaStrategyRes =
		await mediaServices.checks.checkHasMediaStrategy(context);
	if (mediaStrategyRes.error) return mediaStrategyRes;

	const streamRes = await mediaStrategyRes.data.stream(data.key);
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
