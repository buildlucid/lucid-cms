import type { ServiceFn } from "../../utils/services/types.js";
import { mediaServices } from "../index.js";
import type { Readable } from "node:stream";

/**
 * Stream media
 *
 * @todo down the line add some basic tracking of views
 */
const streamMedia: ServiceFn<
	[
		{
			mediaKey: string;
			range?: {
				start: number;
				end?: number;
			};
		},
	],
	{
		key: string;
		contentLength: number | undefined;
		contentType: string | undefined;
		body: Readable;
		isPartialContent?: boolean;
		totalSize?: number;
		range?: {
			start: number;
			end: number;
		};
	}
> = async (context, data) => {
	const mediaStrategyRes =
		await mediaServices.checks.checkHasMediaStrategy(context);
	if (mediaStrategyRes.error) return mediaStrategyRes;

	const res = await mediaStrategyRes.data.services.stream(data.mediaKey, {
		range: data.range,
	});
	if (res.error) return res;

	return {
		error: undefined,
		data: {
			key: data.mediaKey,
			contentLength: res.data.contentLength,
			contentType: res.data.contentType,
			body: res.data.body,
			isPartialContent: res.data.isPartialContent,
			totalSize: res.data.totalSize,
			range: res.data.range,
		},
	};
};

export default streamMedia;
