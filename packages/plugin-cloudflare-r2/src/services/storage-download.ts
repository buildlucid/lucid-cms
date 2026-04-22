import type { MediaAdapterStreamBody, ServiceFn } from "@lucidcms/core/types";
import { STORAGE_DOWNLOAD_PATH } from "../constants.js";
import T from "../translations/index.js";
import type { PluginOptions } from "../types.js";
import { validateSignedMediaUrl } from "../utils/signed-media-url.js";
import stream from "./stream.js";

const storageDownload =
	(
		pluginOptions: PluginOptions,
	): ServiceFn<
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
			isPartialContent?: boolean;
			totalSize?: number;
			range?: {
				start: number;
				end: number;
			};
		}
	> =>
	async (context, data) => {
		if (
			!validateSignedMediaUrl({
				path: STORAGE_DOWNLOAD_PATH,
				key: data.key,
				token: data.token,
				timestamp: data.timestamp,
				secretKey: context.config.secrets.cookie,
				query: {
					fileName: data.fileName,
					extension: data.extension,
				},
			})
		) {
			return {
				error: {
					type: "basic",
					status: 403,
					message: T("invalid_or_expired_signed_url"),
				},
				data: undefined,
			};
		}

		const streamMedia = stream(pluginOptions);
		const streamRes = await streamMedia(data.key);
		if (streamRes.error) {
			return streamRes;
		}

		return {
			error: undefined,
			data: {
				key: data.key,
				contentLength: streamRes.data.contentLength,
				contentType: streamRes.data.contentType,
				body: streamRes.data.body,
				isPartialContent: streamRes.data.isPartialContent,
				totalSize: streamRes.data.totalSize,
				range: streamRes.data.range,
			},
		};
	};

export default storageDownload;
