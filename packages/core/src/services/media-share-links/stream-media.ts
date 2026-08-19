import type { MediaStorageAdapterStreamBody } from "../../libs/media-storage/types.js";
import type { ServiceFn } from "../../utils/services/types.js";
import checkHasMediaStorage from "../media/checks/check-has-media-storage.js";

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
		body: MediaStorageAdapterStreamBody;
		etag?: string | null;
		isPartialContent?: boolean;
		totalSize?: number;
		range?: {
			start: number;
			end: number;
		};
	}
> = async (context, data) => {
	const mediaStorageRes = await checkHasMediaStorage(context);
	if (mediaStorageRes.error) return mediaStorageRes;

	const res = await mediaStorageRes.data.stream(context, {
		key: data.mediaKey,
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
			etag: res.data.etag,
			isPartialContent: res.data.isPartialContent,
			totalSize: res.data.totalSize,
			range: res.data.range,
		},
	};
};

export default streamMedia;
