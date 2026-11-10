import { copy, LucidError } from "@lucidcms/core";
import type {
	MediaStorageAdapterStreamBody,
	ServiceFn,
} from "@lucidcms/core/types";
import { STORAGE_DOWNLOAD_PATH } from "../constants.js";
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
			body: MediaStorageAdapterStreamBody;
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
					message: copy(
						"server:plugin.cloudflare.r2.signed.urls.invalid.or.expired",
					),
				},
				data: undefined,
			};
		}

		const streamMedia = stream(pluginOptions);
		let streamed: Awaited<ReturnType<typeof streamMedia>>;
		try {
			streamed = await streamMedia(context, { key: data.key });
		} catch (error) {
			//* the adapter reports failures by throwing, which this service passes on as a result
			if (error instanceof LucidError) {
				return { error: error.error, data: undefined };
			}
			throw error;
		}

		return {
			error: undefined,
			data: {
				key: data.key,
				contentLength: streamed.contentLength,
				contentType: streamed.contentType,
				body: streamed.body,
				isPartialContent: streamed.isPartialContent,
				totalSize: streamed.totalSize,
				range: streamed.range,
			},
		};
	};

export default storageDownload;
